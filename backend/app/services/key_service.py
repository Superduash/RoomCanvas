import logging
from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import UserApiKeys
from app.config import settings
from app.ai.models_registry import is_model_supported

logger = logging.getLogger(__name__)

class KeyService:
    def __init__(self, db: AsyncSession, user_id: int | None = None):
        self.db = db
        self.user_id = user_id
        self._fernet = None
        if settings.FERNET_SECRET_KEY:
            try:
                self._fernet = Fernet(settings.FERNET_SECRET_KEY.encode())
            except Exception as e:
                logger.error(f"Failed to initialize Fernet with provided key: {e}")

    def _encrypt(self, plain_text: str) -> str:
        if not self._fernet:
            raise ValueError("Encryption is not configured (FERNET_SECRET_KEY missing)")
        return self._fernet.encrypt(plain_text.encode()).decode()

    def _decrypt(self, encrypted_text: str) -> str:
        if not self._fernet:
            raise ValueError("Encryption is not configured")
        try:
            return self._fernet.decrypt(encrypted_text.encode()).decode()
        except InvalidToken:
            raise ValueError("Failed to decrypt the key (invalid token)")

    async def get_user_key(self, provider: str) -> tuple[str | None, str | None, str | None]:
        """Returns (api_key, preferred_text_model, preferred_image_model) for the given provider for the current user."""
        if not self.user_id:
            return None, None, None
            
        query = select(UserApiKeys).where(
            UserApiKeys.user_id == self.user_id,
            UserApiKeys.provider == provider
        )
        result = await self.db.execute(query)
        record = result.scalar_one_or_none()
        
        if record:
            try:
                decrypted_key = self._decrypt(record.encrypted_key)
                # Graceful fallback for legacy models with DB auto-correction
                needs_commit = False
                
                pref_text = record.preferred_text_model
                if pref_text and not is_model_supported(provider, pref_text, "text"):
                    # Map to correct default
                    if provider == "gemini":
                        pref_text = settings.GEMINI_TEXT_MODEL_DEFAULT
                    elif provider == "groq":
                        pref_text = settings.GROQ_TEXT_MODEL_DEFAULT
                    record.preferred_text_model = pref_text
                    needs_commit = True
                    
                pref_img = record.preferred_image_model
                if pref_img and not is_model_supported(provider, pref_img, "image"):
                    if provider == "gemini":
                        pref_img = settings.GEMINI_IMAGE_MODEL_DEFAULT
                    elif provider == "replicate":
                        pref_img = settings.REPLICATE_IMAGE_MODEL_DEFAULT
                    record.preferred_image_model = pref_img
                    needs_commit = True
                    
                if needs_commit:
                    await self.db.commit()
                    
                return decrypted_key, pref_text, pref_img
            except Exception as e:
                logger.error(f"Could not decrypt key for user {self.user_id} provider {provider}: {e}")
                return None, None, None
        return None, None, None
        
    async def get_all_configured_providers(self) -> list[dict]:
        """Returns list of configured providers and their preferred models (no raw keys)."""
        if not self.user_id:
            return []
            
        query = select(UserApiKeys).where(UserApiKeys.user_id == self.user_id)
        result = await self.db.execute(query)
        records = result.scalars().all()
        
        async def _apply_fallback(r):
            needs_commit = False
            
            text_model = r.preferred_text_model
            if text_model and not is_model_supported(r.provider, text_model, "text"):
                if r.provider == "gemini":
                    text_model = settings.GEMINI_TEXT_MODEL_DEFAULT
                elif r.provider == "groq":
                    text_model = settings.GROQ_TEXT_MODEL_DEFAULT
                r.preferred_text_model = text_model
                needs_commit = True
            
            image_model = r.preferred_image_model
            if image_model and not is_model_supported(r.provider, image_model, "image"):
                if r.provider == "gemini":
                    image_model = settings.GEMINI_IMAGE_MODEL_DEFAULT
                elif r.provider == "replicate":
                    image_model = settings.REPLICATE_IMAGE_MODEL_DEFAULT
                r.preferred_image_model = image_model
                needs_commit = True
                
            if needs_commit:
                await self.db.commit()
                
            return {
                "provider": r.provider, 
                "preferred_text_model": text_model, 
                "preferred_image_model": image_model
            }

        return [await _apply_fallback(r) for r in records]

    async def save_key(self, provider: str, api_key: str | None = None, preferred_text_model: str | None = None, preferred_image_model: str | None = None) -> None:
        if not self.user_id:
            raise ValueError("User ID required to save key")
            
        query = select(UserApiKeys).where(
            UserApiKeys.user_id == self.user_id,
            UserApiKeys.provider == provider
        )
        result = await self.db.execute(query)
        record = result.scalar_one_or_none()
        
        if record:
            if api_key:
                record.encrypted_key = self._encrypt(api_key)
            if preferred_text_model is not None:
                record.preferred_text_model = preferred_text_model
            if preferred_image_model is not None:
                record.preferred_image_model = preferred_image_model
        else:
            if not api_key:
                raise ValueError("API key is required for first-time setup")
            record = UserApiKeys(
                user_id=self.user_id,
                provider=provider,
                encrypted_key=self._encrypt(api_key),
                preferred_text_model=preferred_text_model,
                preferred_image_model=preferred_image_model
            )
            self.db.add(record)
            
        await self.db.commit()

    async def delete_key(self, provider: str) -> bool:
        if not self.user_id:
            return False
            
        query = select(UserApiKeys).where(
            UserApiKeys.user_id == self.user_id,
            UserApiKeys.provider == provider
        )
        result = await self.db.execute(query)
        record = result.scalar_one_or_none()
        
        if record:
            await self.db.delete(record)
            await self.db.commit()
            return True
        return False

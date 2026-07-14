import logging
from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import UserApiKeys
from app.config import settings

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

    async def get_user_key(self, provider: str) -> tuple[str | None, str | None]:
        """Returns (api_key, preferred_model) for the given provider for the current user."""
        if not self.user_id:
            return None, None
            
        query = select(UserApiKeys).where(
            UserApiKeys.user_id == self.user_id,
            UserApiKeys.provider == provider
        )
        result = await self.db.execute(query)
        record = result.scalar_one_or_none()
        
        if record:
            try:
                decrypted_key = self._decrypt(record.encrypted_key)
                return decrypted_key, record.preferred_model
            except Exception as e:
                logger.error(f"Could not decrypt key for user {self.user_id} provider {provider}: {e}")
                return None, None
        return None, None
        
    async def get_all_configured_providers(self) -> list[dict]:
        """Returns list of configured providers and their preferred models (no raw keys)."""
        if not self.user_id:
            return []
            
        query = select(UserApiKeys).where(UserApiKeys.user_id == self.user_id)
        result = await self.db.execute(query)
        records = result.scalars().all()
        
        return [
            {"provider": r.provider, "preferred_model": r.preferred_model} 
            for r in records
        ]

    async def save_key(self, provider: str, api_key: str, preferred_model: str | None = None) -> None:
        if not self.user_id:
            raise ValueError("User ID required to save key")
            
        query = select(UserApiKeys).where(
            UserApiKeys.user_id == self.user_id,
            UserApiKeys.provider == provider
        )
        result = await self.db.execute(query)
        record = result.scalar_one_or_none()
        
        encrypted_key = self._encrypt(api_key)
        
        if record:
            record.encrypted_key = encrypted_key
            record.preferred_model = preferred_model
        else:
            record = UserApiKeys(
                user_id=self.user_id,
                provider=provider,
                encrypted_key=encrypted_key,
                preferred_model=preferred_model
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

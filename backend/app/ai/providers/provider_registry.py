import logging
from app.config import settings
from app.ai.providers.base_provider import AnalysisProvider, GenerationProvider
from app.utils.exceptions import ProviderUnavailableError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.services.key_service import KeyService
from app.database.models import User

logger = logging.getLogger(__name__)

async def _get_user(db: AsyncSession, user_id: int) -> User | None:
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()

async def get_text_provider(db: AsyncSession, user_id: int | None = None) -> AnalysisProvider:
    if not user_id:
        raise ProviderUnavailableError("Must be authenticated to use BYOK providers.")
        
    user = await _get_user(db, user_id)
    if not user or not user.active_text_provider:
        raise ProviderUnavailableError("No active text provider selected. Please configure one in Settings.")
        
    key_service = KeyService(db, user_id)
    active_prov = user.active_text_provider
    api_key, preferred_text_model, _ = await key_service.get_user_key(active_prov)
    
    if not api_key:
        raise ProviderUnavailableError(f"API key missing for your active text provider ({active_prov}).")
        
    if active_prov == "groq":
        from app.ai.providers.groq_provider import GroqProvider
        return GroqProvider(api_key=api_key, model=preferred_text_model or settings.GROQ_TEXT_MODEL_DEFAULT)
    elif active_prov == "gemini":
        from app.ai.providers.gemini_provider import GeminiProvider
        return GeminiProvider(api_key=api_key, model=preferred_text_model or "gemini-3-flash")
    else:
        raise ProviderUnavailableError(f"Unsupported text provider: {active_prov}")

async def get_image_provider(db: AsyncSession, user_id: int | None = None) -> GenerationProvider:
    if not user_id:
        raise ProviderUnavailableError("Must be authenticated to use BYOK providers.")
        
    user = await _get_user(db, user_id)
    if not user or not user.active_image_provider:
        raise ProviderUnavailableError("No active image provider selected. Please configure one in Settings.")
        
    key_service = KeyService(db, user_id)
    active_prov = user.active_image_provider
    api_key, _, preferred_image_model = await key_service.get_user_key(active_prov)
    
    if not api_key:
        raise ProviderUnavailableError(f"API key missing for your active image provider ({active_prov}).")
        
    if active_prov == "replicate":
        from app.ai.providers.replicate_provider import ReplicateProvider
        return ReplicateProvider(api_token=api_key)
    elif active_prov == "gemini":
        from app.ai.providers.gemini_provider import GeminiProvider
        return GeminiProvider(api_key=api_key, model=preferred_image_model or settings.GEMINI_IMAGE_MODEL_DEFAULT)
    else:
        raise ProviderUnavailableError(f"Unsupported image provider: {active_prov}")

async def get_active_image_provider_info(db: AsyncSession, user_id: int | None = None) -> dict:
    if not user_id:
        return {"is_available": False, "provider_name": None, "is_platform": False}
        
    user = await _get_user(db, user_id)
    if not user or not user.active_image_provider:
        return {"is_available": False, "provider_name": None, "is_platform": False}
        
    key_service = KeyService(db, user_id)
    api_key, _, _ = await key_service.get_user_key(user.active_image_provider)
    
    if api_key:
        return {"is_available": True, "provider_name": f"Your {user.active_image_provider.capitalize()} Key", "is_platform": False}
        
    return {"is_available": False, "provider_name": None, "is_platform": False}

async def get_active_text_provider_info(db: AsyncSession, user_id: int | None = None) -> dict:
    if not user_id:
        return {"is_available": False, "provider_name": None, "is_platform": False}
        
    user = await _get_user(db, user_id)
    if not user or not user.active_text_provider:
        return {"is_available": False, "provider_name": None, "is_platform": False}
        
    key_service = KeyService(db, user_id)
    api_key, _, _ = await key_service.get_user_key(user.active_text_provider)
    
    if api_key:
        return {"is_available": True, "provider_name": f"Your {user.active_text_provider.capitalize()} Key", "is_platform": False}
        
    return {"is_available": False, "provider_name": None, "is_platform": False}

def init_providers() -> None:
    pass

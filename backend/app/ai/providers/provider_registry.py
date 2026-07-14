import logging
from app.config import settings
from app.ai.providers.base_provider import AnalysisProvider, GenerationProvider
from app.utils.exceptions import ProviderUnavailableError
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.key_service import KeyService

logger = logging.getLogger(__name__)

# Factory methods, instantiating per-request or per-call based on user keys

async def get_text_provider(db: AsyncSession, user_id: int | None = None) -> AnalysisProvider:
    key_service = KeyService(db, user_id)
    
    # Try User Groq
    user_groq_key, user_groq_model = await key_service.get_user_key("groq")
    if user_groq_key:
        from app.ai.providers.groq_provider import GroqProvider
        return GroqProvider(api_key=user_groq_key, model=user_groq_model or settings.GROQ_TEXT_MODEL_DEFAULT)
        
    # Try Platform Groq
    if settings.GROQ_API_KEY:
        from app.ai.providers.groq_provider import GroqProvider
        return GroqProvider(api_key=settings.GROQ_API_KEY, model=settings.GROQ_TEXT_MODEL_DEFAULT)
        
    # Try User Gemini
    user_gemini_key, user_gemini_model = await key_service.get_user_key("gemini")
    if user_gemini_key:
        from app.ai.providers.gemini_provider import GeminiProvider
        return GeminiProvider(api_key=user_gemini_key, model="gemini-2.5-flash") # Fallback to standard
        
    # Try Platform Gemini
    if settings.GEMINI_API_KEY:
        from app.ai.providers.gemini_provider import GeminiProvider
        return GeminiProvider(api_key=settings.GEMINI_API_KEY, model="gemini-2.5-flash")
        
    raise ProviderUnavailableError("No text provider configured (tried user/platform Groq and Gemini)")

async def get_image_provider(db: AsyncSession, user_id: int | None = None) -> GenerationProvider:
    key_service = KeyService(db, user_id)
    
    # Try User Replicate
    user_repl_key, _ = await key_service.get_user_key("replicate")
    if user_repl_key:
        from app.ai.providers.replicate_provider import ReplicateProvider
        return ReplicateProvider(api_token=user_repl_key)
        
    # Try Platform Replicate
    if settings.REPLICATE_API_TOKEN:
        from app.ai.providers.replicate_provider import ReplicateProvider
        return ReplicateProvider(api_token=settings.REPLICATE_API_TOKEN)
        
    # Try User Gemini
    user_gemini_key, user_gemini_model = await key_service.get_user_key("gemini")
    if user_gemini_key:
        from app.ai.providers.gemini_provider import GeminiProvider
        return GeminiProvider(api_key=user_gemini_key, model=user_gemini_model or settings.GEMINI_IMAGE_MODEL_DEFAULT)
        
    # Try Platform Gemini
    if settings.GEMINI_API_KEY:
        from app.ai.providers.gemini_provider import GeminiProvider
        return GeminiProvider(api_key=settings.GEMINI_API_KEY, model=settings.GEMINI_IMAGE_MODEL_DEFAULT)
        
    raise ProviderUnavailableError("No image provider configured (tried user/platform Replicate and Gemini)")

async def get_active_image_provider_info(db: AsyncSession, user_id: int | None = None) -> dict:
    key_service = KeyService(db, user_id)
    
    # Try User Replicate
    user_repl_key, _ = await key_service.get_user_key("replicate")
    if user_repl_key:
        return {"is_available": True, "provider_name": "Your Replicate Key", "is_platform": False}
        
    # Try Platform Replicate
    if settings.REPLICATE_API_TOKEN:
        return {"is_available": True, "provider_name": "Platform Replicate", "is_platform": True}
        
    # Try User Gemini
    user_gemini_key, _ = await key_service.get_user_key("gemini")
    if user_gemini_key:
        return {"is_available": True, "provider_name": "Your Gemini Key", "is_platform": False}
        
    # Try Platform Gemini
    if settings.GEMINI_API_KEY:
        return {"is_available": True, "provider_name": "Platform Gemini (Fallback)", "is_platform": True}
        
    return {"is_available": False, "provider_name": None, "is_platform": False}

def init_providers() -> None:
    # No longer needed as we resolve on-the-fly, but we can keep it for backwards compatibility if main.py calls it.
    pass

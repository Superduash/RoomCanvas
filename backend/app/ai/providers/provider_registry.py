"""
provider_registry.py — Factory functions for AI providers.

Providers are registered as module-level singletons by the app lifespan
(via `init_providers()` called in main.py) so Replicate and Gemini clients
are constructed exactly once — not once per HTTP request.
"""
from app.config import settings
from app.ai.providers.base_provider import AnalysisProvider, GenerationProvider
from app.utils.exceptions import ProviderUnavailableError

import logging
logger = logging.getLogger(__name__)

# ── Singleton slots ────────────────────────────────────────────────────────────
_analysis_provider: AnalysisProvider | None = None
_generation_provider: GenerationProvider | None = None


def init_providers() -> None:
    """
    Call once during app startup (main.py lifespan).
    Initialises both providers so their HTTP clients are reused for the
    entire lifetime of the process — not recreated per request.
    """
    global _analysis_provider, _generation_provider

    from app.ai.providers.gemini_provider import GeminiProvider
    from app.ai.providers.replicate_provider import ReplicateProvider

    if settings.ACTIVE_ANALYSIS_PROVIDER == "gemini":
        _analysis_provider = GeminiProvider()
        logger.info(f"Analysis provider: GeminiProvider (model={_analysis_provider.model_name})")
    else:
        raise ProviderUnavailableError(
            f"Unknown analysis provider: {settings.ACTIVE_ANALYSIS_PROVIDER}"
        )

    if settings.ACTIVE_GENERATION_PROVIDER == "replicate":
        logger.info(f"Replicate API Token loaded: {bool(settings.REPLICATE_API_TOKEN)}")
        _generation_provider = ReplicateProvider()
        logger.info(f"Generation provider: ReplicateProvider (model={_generation_provider.model})")
    else:
        raise ProviderUnavailableError(
            f"Unknown generation provider: {settings.ACTIVE_GENERATION_PROVIDER}"
        )


def get_analysis_provider() -> AnalysisProvider:
    if _analysis_provider is None:
        raise ProviderUnavailableError("Analysis provider not initialised — was init_providers() called?")
    return _analysis_provider


def get_generation_provider() -> GenerationProvider:
    if _generation_provider is None:
        raise ProviderUnavailableError("Generation provider not initialised — was init_providers() called?")
    return _generation_provider

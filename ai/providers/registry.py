from ai.config import ai_settings
from ai.providers.base_provider import BaseAIProvider
from ai.providers.replicate_provider import ReplicateProvider

def get_provider() -> BaseAIProvider:
    """
    Factory function to get the active AI provider based on configuration.
    """
    provider_name = ai_settings.ACTIVE_PROVIDER.lower()
    
    if provider_name == "replicate":
        return ReplicateProvider()
    
    # Fallback to a mock or raise an error
    raise ValueError(f"Unknown AI provider: {provider_name}")

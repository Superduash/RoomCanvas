"""
AI configuration module.
Holds model parameters, provider selection, and other AI-specific settings.
"""
import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class AISettings(BaseSettings):
    # Provider selection
    ACTIVE_PROVIDER: str = os.getenv("AI_PROVIDER", "replicate")
    ACTIVE_MODEL: str = os.getenv("AI_MODEL", "quality")

    # Available models
    MODELS: dict = {
        "fast": "lucataco/sandbox:fast",
        "quality": "adirik/interior-design",
        "edit": "lucataco/sandbox:edit"
    }

    # Replicate specific settings
    REPLICATE_API_TOKEN: str = os.getenv("REPLICATE_API_TOKEN", "")
    
    # Model parameters
    DEFAULT_PARAMETERS: dict = {
        "guidance_scale": 15.0,
        "prompt_strength": 0.8,
        "num_inference_steps": 50,
    }

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

ai_settings = AISettings()

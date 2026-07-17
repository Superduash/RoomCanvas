"""
Application configuration — loaded from environment variables or .env file.
All settings have sensible defaults for local development.
"""
import os
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Application ───────────────────────────────────────────────────────────
    APP_NAME: str = "RoomCanvas AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    PUBLIC_BASE_URL: str = "https://roomcanvas.onrender.com"

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./storage/interior_ai.db"



    # ── Supabase Storage ──────────────────────────────────────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_BUCKET: str = "roomcanvas"

    # ── API / Security ────────────────────────────────────────────────────────
    # Comma-separated list of allowed CORS origins, e.g. "http://localhost:3000,https://myapp.com"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,https://roomcanvasai.vercel.app,https://roomcanvas.onrender.com"
    MAX_UPLOAD_SIZE_MB: int = 10

    # API Keys
    FERNET_SECRET_KEY: str = ""
    UPSTASH_REDIS_URL: str = ""
    UPSTASH_REDIS_TOKEN: str = ""
    FIREBASE_SERVICE_ACCOUNT_JSON: str | None = None
    FIREBASE_CREDENTIALS_PATH: str | None = None

    # Fallback AI Provider Keys (for users without BYOK)
    GEMINI_API_KEY: str | None = None
    REPLICATE_API_TOKEN: str | None = None
    GROQ_API_KEY: str | None = None

    # Model Defaults
    GROQ_VISION_MODEL_DEFAULT: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    GROQ_TEXT_MODEL_DEFAULT: str = "llama-3.1-8b-instant"
    GEMINI_TEXT_MODEL_DEFAULT: str = "gemini-3.1-flash-lite"
    GEMINI_IMAGE_MODEL_DEFAULT: str = "imagen-3.0-generate-001"
    REPLICATE_IMAGE_MODEL_DEFAULT: str = "black-forest-labs/flux-kontext-pro"

    # Timeouts
    GEMINI_TIMEOUT_SECONDS: int = 60
    REPLICATE_TIMEOUT_SECONDS: int = 120

    @field_validator("MAX_UPLOAD_SIZE_MB")
    @classmethod
    def must_be_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("MAX_UPLOAD_SIZE_MB must be a positive integer")
        return v



    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


settings = Settings()

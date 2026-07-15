"""
config.py — GET /api/config
Non-secret runtime config for the frontend. Cached in-memory + HTTP headers.
"""
import logging
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.config import settings
from app.cache import get_cached_config

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/config", tags=["Config"])

@router.get("", status_code=200)
def get_config():
    data = get_cached_config(settings.MAX_UPLOAD_SIZE_MB)
    response = JSONResponse(content=data)
    # Config only changes on restart — cache for 10 minutes in browser
    response.headers["Cache-Control"] = "public, max-age=600, stale-while-revalidate=3600"
    return response

@router.get("/models", status_code=200)
def get_supported_models():
    try:
        from app.ai.models_registry import SUPPORTED_MODELS
        response = JSONResponse(content=SUPPORTED_MODELS)
        response.headers["Cache-Control"] = "public, max-age=600, stale-while-revalidate=3600"
        return response
    except Exception as e:
        logger.error(f"Failed to load SUPPORTED_MODELS: {e}")
        empty = {
            "gemini": {"text": [], "image": []},
            "replicate": {"text": [], "image": []},
            "groq": {"text": [], "image": []},
        }
        return JSONResponse(content=empty, status_code=200)

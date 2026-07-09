"""
config.py — GET /api/config
Non-secret runtime config for the frontend. Cached in-memory + HTTP headers.
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.config import settings
from app.cache import get_cached_config

router = APIRouter(prefix="/config", tags=["Config"])

@router.get("", status_code=200)
def get_config():
    data = get_cached_config(settings.MAX_UPLOAD_SIZE_MB)
    response = JSONResponse(content=data)
    # Config only changes on restart — cache for 10 minutes in browser
    response.headers["Cache-Control"] = "public, max-age=600, stale-while-revalidate=3600"
    return response

"""
styles.py — GET /api/styles
Served from in-memory cache; computed once at startup.
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.cache import get_cached_styles

router = APIRouter(prefix="/styles", tags=["Styles"])

@router.get("", status_code=200)
def get_styles():
    data = get_cached_styles()
    response = JSONResponse(content=data)
    # Static data — cache aggressively in the browser (1 hour)
    response.headers["Cache-Control"] = "public, max-age=3600, stale-while-revalidate=86400"
    return response

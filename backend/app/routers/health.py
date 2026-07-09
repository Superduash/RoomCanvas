"""
health.py — GET /api/health
Liveness check with short-TTL browser cache to avoid repeated pings.
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.config import settings
from app.schemas.common import HealthResponse

router = APIRouter()

@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Liveness status and provider key presence.",
)
def check_health() -> JSONResponse:
    providers = {
        "gemini": bool(settings.GEMINI_API_KEY),
        "replicate": bool(settings.REPLICATE_API_TOKEN),
    }
    data = HealthResponse(status="ok", providers=providers)
    response = JSONResponse(content=data.model_dump())
    # Short cache — clients should refresh every 30s but not hammer the endpoint
    response.headers["Cache-Control"] = "no-store"
    return response

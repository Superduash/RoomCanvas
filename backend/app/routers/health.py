"""
health.py — /api/health endpoint.
Returns API operational status and the current AI pipeline mode.
"""
from fastapi import APIRouter
from app.config import settings
from app.schemas.common import HealthResponse

router = APIRouter()

# Read AI_MODE from settings — consistent with the rest of the config surface.
AI_MODE: str = settings.AI_MODE


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Returns API operational status and the active AI pipeline mode (mock or real).",
)
def check_health() -> HealthResponse:
    return HealthResponse(status="ok", ai_mode=AI_MODE)

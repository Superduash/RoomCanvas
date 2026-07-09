"""
health.py — GET /api/health
Liveness check with short-TTL browser cache to avoid repeated pings.
"""
import socket
import asyncio
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.config import settings
from app.schemas.common import HealthResponse

router = APIRouter()

async def _probe_gemini() -> bool:
    if not settings.GEMINI_API_KEY:
        return False
    try:
        await asyncio.wait_for(asyncio.to_thread(socket.getaddrinfo, "generativelanguage.googleapis.com", 443), timeout=3)
        return True
    except Exception:
        return False

async def _probe_replicate() -> bool:
    if not settings.REPLICATE_API_TOKEN:
        return False
    try:
        await asyncio.wait_for(asyncio.to_thread(socket.getaddrinfo, "api.replicate.com", 443), timeout=3)
        return True
    except Exception:
        return False

@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Liveness status and provider reachability.",
)
async def check_health() -> JSONResponse:
    gemini_ok, replicate_ok = await asyncio.gather(_probe_gemini(), _probe_replicate())
    data = HealthResponse(status="ok", providers={"gemini": gemini_ok, "replicate": replicate_ok})
    response = JSONResponse(content=data.model_dump())
    response.headers["Cache-Control"] = "no-store"
    return response

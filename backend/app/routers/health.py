"""
health.py — GET /api/health
Liveness check with short-TTL browser cache to avoid repeated pings.
"""
import socket
import asyncio
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from app.config import settings
from app.schemas.common import HealthResponse
from app.database.session import engine
from app.auth.firebase_admin_init import is_firebase_available

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
async def check_health(request: Request) -> JSONResponse:
    # 1. DB Connectivity
    db_status = "ok"
    try:
        # Use a quick connection check without heavy pooling block
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "unreachable"

    # 2. Migrations
    migrations_status = "pending" if getattr(request.app.state, "migrations_pending", False) else "up_to_date"

    # 3. AI Providers
    gemini_ok, replicate_ok = await asyncio.gather(_probe_gemini(), _probe_replicate())

    # 4. Firebase
    firebase_status = "ready" if is_firebase_available() else "unconfigured"

    # 5. App Status
    app_status = "ready"
    if db_status == "unreachable" or migrations_status == "pending":
        app_status = "degraded"

    data = HealthResponse(
        application=app_status,
        database=db_status,
        migrations=migrations_status,
        firebase=firebase_status,
        providers={"gemini": gemini_ok, "replicate": replicate_ok}
    )
    
    # Return 503 if degraded to signal to load balancers, 200 otherwise
    status_code = 503 if app_status == "degraded" else 200
    response = JSONResponse(content=data.model_dump(), status_code=status_code)
    response.headers["Cache-Control"] = "no-store"
    return response

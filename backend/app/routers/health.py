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

import httpx
from google import genai

async def verify_provider_keys():
    results = {}
    if settings.GEMINI_API_KEY:
        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            await asyncio.to_thread(client.models.list)  # cheap, no-cost validation call
            results["gemini"] = "valid"
        except Exception as e:
            results["gemini"] = f"invalid: {e}"
    else:
        results["gemini"] = "not configured"

    if settings.REPLICATE_API_TOKEN:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get("https://api.replicate.com/v1/account", headers={"Authorization": f"Bearer {settings.REPLICATE_API_TOKEN}"}, timeout=10)
                results["replicate"] = "valid" if resp.status_code == 200 else f"invalid: HTTP {resp.status_code}"
        except Exception as e:
            results["replicate"] = f"invalid: {e}"
    else:
        results["replicate"] = "not configured"

    return results

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
        # Use async engine for connection check
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "unreachable"

    # 2. AI Providers
    provider_status = await verify_provider_keys()
    gemini_ok = provider_status.get("gemini") == "valid"
    replicate_ok = provider_status.get("replicate") == "valid"

    # 3. Firebase
    firebase_status = "ready" if is_firebase_available() else "unconfigured"

    # 4. App Status
    app_status = "ready"
    if db_status == "unreachable":
        app_status = "degraded"

    data = HealthResponse(
        application=app_status,
        database=db_status,
        firebase=firebase_status,
        providers={"gemini": gemini_ok, "replicate": replicate_ok}
    )
    
    # Return 503 if degraded to signal to load balancers, 200 otherwise
    status_code = 503 if app_status == "degraded" else 200
    response = JSONResponse(content=data.model_dump(), status_code=status_code)
    response.headers["Cache-Control"] = "no-store"
    return response

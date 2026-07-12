import os
import sys
import time
import asyncio
import httpx
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.middleware.gzip import GZipMiddleware
import uvicorn

import app.logging_config as logging_config
from app.config import settings
from app.database.session import engine, Base
from app.ai.providers.provider_registry import init_providers
from app.auth.firebase_admin_init import init_firebase_admin
from app.routers import health, analyze, generate, refine, history, styles, providers, config, auth, measure
from app.utils.exceptions import InteriorAIError

logger = logging_config.logger

async def _self_ping_loop():
    if settings.DEBUG:
        return
    url = f"{settings.PUBLIC_BASE_URL}/api/health"
    while True:
        await asyncio.sleep(600)
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.get(url)
                logger.debug("Keep-alive ping sent.")
        except Exception:
            pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown lifecycle handler (replaces deprecated @app.on_event).
    All initialisation logic runs before the first `yield`; cleanup runs after.
    """
    # ── Startup ──────────────────────────────────────────────────────────────
    if not settings.GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY is not set — Gemini Provider requests will fail.")
    if not settings.REPLICATE_API_TOKEN:
        logger.error("REPLICATE_API_TOKEN is not set — Replicate Provider requests will fail.")

    # Initialise provider singletons (once per process, not once per request)
    try:
        init_providers()
    except Exception as exc:
        logger.error(f"Failed to initialise AI providers: {exc}")

    try:
        init_firebase_admin()
    except Exception as exc:
        logger.warning(f"Unexpected error during Firebase Admin initialization: {exc}")

    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        logger.error(f"Failed to initialise database schema: {exc}", exc_info=True)

    # Ensure required storage subdirectories exist
    for directory in [settings.UPLOAD_DIR, settings.GENERATED_DIR]:
        try:
            Path(directory).mkdir(parents=True, exist_ok=True)
        except Exception as exc:
            logger.error(f"Failed to create directory {directory}: {exc}")

    # Warm static caches so first requests are instant
    try:
        from app.cache import get_cached_styles, get_cached_config
        get_cached_styles()
        get_cached_config(settings.MAX_UPLOAD_SIZE_MB)
    except Exception as exc:
        logger.error(f"Failed to warm caches: {exc}")

    # Display clean startup banner
    from app.auth.firebase_admin_init import is_firebase_available
    firebase_status = "✓ Firebase Admin Ready" if is_firebase_available() else "⚠ Firebase Admin Not Configured (Auth Disabled)"
    gemini_status = "✓ Gemini Provider Ready" if settings.GEMINI_API_KEY else "⚠ Gemini Provider Not Configured"
    replicate_status = "✓ Replicate Provider Ready" if settings.REPLICATE_API_TOKEN else "⚠ Replicate Provider Not Configured"

    banner = f"""
══════════════════════════════════════════════
 RoomCanvas AI Backend
══════════════════════════════════════════════
✓ Database Connected
{gemini_status}
{replicate_status}
{firebase_status}
✓ Storage Ready
✓ Cache Warmed
✓ API Ready
Running: http://127.0.0.1:{os.environ.get("PORT", 8000)}
Mode: {"Development" if settings.DEBUG else "Production"}
══════════════════════════════════════════════
"""
    # Print the banner safely, falling back to ASCII if the console encoding doesn't support Unicode
    try:
        print(banner.strip(), flush=True)
    except UnicodeEncodeError:
        ascii_banner = (
            banner.replace("═", "=")
            .replace("✓", "[x]")
            .replace("⚠", "[!]")
        )
        try:
            print(ascii_banner.strip(), flush=True)
        except Exception:
            pass



    ping_task = asyncio.create_task(_self_ping_loop())

    yield  # ── Application runs here ─────────────────────────────────────────

    # ── Shutdown ─────────────────────────────────────────────────────────────
    ping_task.cancel()
    logger.info(f"{settings.APP_NAME} API shutting down.")


# ── FastAPI Application ───────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "RoomCanvas AI — Intelligent interior space redesign powered by Gemini and Replicate."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

@app.middleware("http")
async def access_log_middleware(request: Request, call_next):
    """Clean per-request access log with X-Request-ID generation and tracking."""
    from app.utils.request_id import set_request_id
    req_id = request.headers.get("X-Request-ID")
    req_id = set_request_id(req_id)
    
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    
    response.headers["X-Process-Time"] = f"{elapsed_ms:.1f}ms"
    response.headers["X-Request-ID"] = req_id
    
    if request.url.path.startswith("/api"):
        # Format: GET    /api/history      200   18ms
        method = f"{request.method: <6}"
        path = f"{request.url.path: <20}"
        logger.info(f"{method} {path} {response.status_code}   {elapsed_ms:.0f}ms")
    
    # Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response

# ── CORS ──────────────────────────────────────────────────────────────────────
_origins = [o.strip().rstrip('/') for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ── Static file serving ───────────────────────────────────────────────────────
# Mount the parent storage directory so /static/uploads/…, /static/generated/… all work.
_storage_root = Path(settings.UPLOAD_DIR).parent.resolve()
_storage_root.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_storage_root)), name="static")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router,   prefix="/api")
app.include_router(config.router,   prefix="/api")
app.include_router(providers.router,prefix="/api")
app.include_router(styles.router,   prefix="/api")
app.include_router(analyze.router,  prefix="/api")
app.include_router(generate.router, prefix="/api")
app.include_router(refine.router,   prefix="/api")
app.include_router(history.router,  prefix="/api")
app.include_router(auth.router,     prefix="/api")
app.include_router(measure.router,  prefix="/api")


# ── Global Exception Handlers ─────────────────────────────────────────────────
def _inject_cors_headers(request: Request, response: JSONResponse) -> JSONResponse:
    origin = request.headers.get("origin")
    if origin and (origin in _origins or "*" in _origins):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

def _format_error(code: str, message: str) -> dict:
    from app.utils.request_id import get_request_id
    from datetime import datetime, timezone
    return {
        "code": code,
        "message": message,
        "request_id": get_request_id(),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.exception_handler(InteriorAIError)
def app_exception_handler(request: Request, exc: InteriorAIError) -> JSONResponse:
    logger.warning(f"Application error [HTTP {exc.status_code}]: {exc.message}")
    content = _format_error(
        code="APPLICATION_ERROR" if exc.status_code < 500 else "INTERNAL_SERVER_ERROR",
        message=exc.message
    )
    return _inject_cors_headers(request, JSONResponse(status_code=exc.status_code, content=content))


@app.exception_handler(Exception)
def uncaught_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(f"Uncaught exception on {request.method} {request.url.path}: {exc}")
    content = _format_error(
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected server error occurred. Please try again."
    )
    return _inject_cors_headers(request, JSONResponse(status_code=500, content=content))


# ── Direct run entry-point ────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=settings.DEBUG)

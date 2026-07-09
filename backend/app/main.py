import os
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import uvicorn

import app.logging_config as logging_config
from app.config import settings
from app.database.session import engine, Base
from app.ai.providers.provider_registry import init_providers
from app.routers import health, analyze, generate, refine, history, styles, providers, config
from app.utils.exceptions import InteriorAIError

logger = logging_config.logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown lifecycle handler (replaces deprecated @app.on_event).
    All initialisation logic runs before the first `yield`; cleanup runs after.
    """
    # ── Startup ──────────────────────────────────────────────────────────────
    if not settings.GEMINI_API_KEY:
        logger.critical("GEMINI_API_KEY is not set — set it in .env and restart.")
        sys.exit(1)
    if not settings.REPLICATE_API_TOKEN:
        logger.critical("REPLICATE_API_TOKEN is not set — set it in .env and restart.")
        sys.exit(1)

    # Initialise provider singletons (once per process, not once per request)
    try:
        init_providers()
    except Exception as exc:
        logger.critical(f"Failed to initialise AI providers: {exc}")
        sys.exit(1)

    logger.info("Initializing database schema…")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema initialised successfully.")
    except Exception as exc:
        logger.critical(f"Failed to initialise database schema: {exc}", exc_info=True)
        sys.exit(1)

    # Ensure required storage subdirectories exist
    for directory in [settings.UPLOAD_DIR, settings.GENERATED_DIR]:
        Path(directory).mkdir(parents=True, exist_ok=True)

    # Warm static caches so first requests are instant
    from app.cache import get_cached_styles, get_cached_config
    get_cached_styles()
    get_cached_config(settings.MAX_UPLOAD_SIZE_MB)
    logger.info("Static caches warmed.")

    logger.info(
        f"{settings.APP_NAME} ready — "
        f"analysis={settings.ACTIVE_ANALYSIS_PROVIDER} "
        f"generation={settings.ACTIVE_GENERATION_PROVIDER} "
        f"debug={settings.DEBUG}"
    )

    yield  # ── Application runs here ─────────────────────────────────────────

    # ── Shutdown ─────────────────────────────────────────────────────────────
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
        logger.info(
            f"{request.method} {request.url.path} → {response.status_code} "
            f"({elapsed_ms:.1f}ms)"
        )
    return response

# ── CORS ──────────────────────────────────────────────────────────────────────
_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

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


# ── Global Exception Handlers ─────────────────────────────────────────────────
@app.exception_handler(InteriorAIError)
def app_exception_handler(request: Request, exc: InteriorAIError) -> JSONResponse:
    logger.warning("Application error [HTTP %s]: %s", exc.status_code, exc.message)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.exception_handler(Exception)
def uncaught_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Uncaught exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred. Please try again."},
    )


# ── Direct run entry-point ────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=settings.DEBUG)

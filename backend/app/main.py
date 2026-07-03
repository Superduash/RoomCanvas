import os
import sys
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
from app.routers import health, generate, history
from app.utils.exceptions import InteriorAIError

logger = logging_config.logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown lifecycle handler (replaces deprecated @app.on_event).
    All initialisation logic runs before the first `yield`; cleanup runs after.
    """
    # ── Startup ──────────────────────────────────────────────────────────────
    logger.info("Initializing database schema…")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema initialised successfully.")
    except Exception as exc:
        logger.critical(f"Failed to initialise database schema: {exc}", exc_info=True)
        sys.exit(1)

    # Ensure required storage subdirectories exist
    for directory in [settings.UPLOAD_DIR, settings.CONTROL_IMAGE_DIR, settings.GENERATED_DIR]:
        Path(directory).mkdir(parents=True, exist_ok=True)

    logger.info("=" * 60)
    logger.info(f"   {settings.APP_NAME} API — Ready")
    logger.info(f"   AI Mode:    {health.AI_MODE}")
    logger.info(f"   Debug:      {settings.DEBUG}")
    logger.info(f"   Database:   {settings.DATABASE_URL}")
    logger.info("=" * 60)

    yield  # ── Application runs here ─────────────────────────────────────────

    # ── Shutdown ─────────────────────────────────────────────────────────────
    logger.info(f"{settings.APP_NAME} API shutting down.")


# ── FastAPI Application ───────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "RoomCanvas AI — Intelligent interior space redesign powered by ControlNet + Stable Diffusion. "
        "Upload a room photo, choose a style, and receive 3 AI-generated variations."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static file serving ───────────────────────────────────────────────────────
# Mount the parent storage directory so /static/uploads/…, /static/generated/… all work.
_storage_root = Path(settings.UPLOAD_DIR).parent.resolve()
_storage_root.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_storage_root)), name="static")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router,   prefix="/api", tags=["Health"])
app.include_router(generate.router, prefix="/api", tags=["Generate"])
app.include_router(history.router,  prefix="/api", tags=["History"])


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

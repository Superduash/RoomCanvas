"""
logging_config.py — Structured, clean logging setup using Loguru.
Silences noisy third-party loggers, formats logs for readability,
and implements rotation.
"""
import logging
import sys
from pathlib import Path
from loguru import logger
from app.config import settings

class InterceptHandler(logging.Handler):
    """
    Intercepts standard logging messages and routes them to Loguru.
    """
    def emit(self, record: logging.LogRecord) -> None:
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame, depth = logging.currentframe(), 2
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )

def setup_logging() -> None:
    # 1. Remove all existing loguru handlers
    logger.remove()

    log_level = "DEBUG" if settings.DEBUG else "INFO"

    # 2. Add the beautiful console handler
    logger.add(
        sys.stdout,
        level=log_level,
        format="<green>{time:HH:mm:ss}</green> <level>{level: <8}</level> {message}",
        colorize=True,
        enqueue=True,
    )

    # 3. Add the rotating file handler
    log_path = Path("logs/roomcanvas.log")
    log_path.parent.mkdir(exist_ok=True)
    logger.add(
        str(log_path),
        level=log_level,
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}",
        rotation="10 MB",
        retention="5 days",
        enqueue=True,
    )

    # 4. Intercept standard logging messages
    logging.root.handlers = [InterceptHandler()]
    logging.root.setLevel(logging.WARNING)

    # Allow FastAPI/Uvicorn to log through loguru
    for name in ["uvicorn", "uvicorn.error", "uvicorn.access", "fastapi"]:
        l = logging.getLogger(name)
        l.handlers = [InterceptHandler()]
        l.propagate = False
        l.setLevel(logging.INFO)

    # 5. Silence noisy third-party loggers
    noisy_loggers = [
        "uvicorn.access", # We have custom access logging
        "sqlalchemy.engine",
        "sqlalchemy.pool",
        "sqlalchemy.dialects",
        "sqlalchemy.orm",
        "httpx",
        "httpcore",
        "google",
        "google.genai",
        "replicate",
        "tenacity",
        "watchfiles",
        "watchfiles.main"
    ]
    
    for name in noisy_loggers:
        l = logging.getLogger(name)
        l.handlers = [InterceptHandler()]
        l.propagate = False
        # Suppress noise unless explicitly asked
        l.setLevel(logging.WARNING if not settings.DEBUG else logging.INFO)

setup_logging()

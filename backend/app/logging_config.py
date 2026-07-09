"""
logging_config.py — Structured, clean logging setup.
Silences noisy third-party loggers and formats logs for readability.
"""
import logging
import sys
from app.config import settings


class RequestIDFilter(logging.Filter):
    def filter(self, record):
        from app.utils.request_id import get_request_id
        req_id = get_request_id()
        record.request_id = f" [req:{req_id}]" if req_id else ""
        return True

def setup_logging() -> None:
    # Clear any existing handlers to avoid duplicate output on reload
    logging.root.handlers = []

    log_level = logging.DEBUG if settings.DEBUG else logging.INFO

    # Force UTF-8 so Unicode log characters don't crash on Windows cp1252 consoles
    import io
    utf8_stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

    handler = logging.StreamHandler(utf8_stdout)
    handler.setLevel(log_level)
    handler.addFilter(RequestIDFilter())
    handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s [%(levelname)s]%(request_id)s %(name)s - %(message)s",
            datefmt="%H:%M:%S",
        )
    )

    logging.root.setLevel(log_level)
    logging.root.addHandler(handler)

    # ── Silence noisy third-party loggers ─────────────────────────────────────
    # uvicorn.access spams one line per HTTP request — we replace this with our
    # own X-Process-Time middleware so the access log is redundant.
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("uvicorn").setLevel(logging.INFO)

    # SQLAlchemy emits verbose query logs at DEBUG; only surface real errors.
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.dialects").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.orm").setLevel(logging.WARNING)

    # httpx logs every header in DEBUG mode — not helpful.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    # google.genai / replicate clients can be chatty.
    logging.getLogger("google").setLevel(logging.WARNING)
    logging.getLogger("google.genai").setLevel(logging.WARNING)
    logging.getLogger("replicate").setLevel(logging.WARNING)

    # tenacity retry logs — keep WARNING so we see retries but not every attempt detail.
    logging.getLogger("tenacity").setLevel(logging.WARNING)


# ── Bootstrap immediately on import ───────────────────────────────────────────
setup_logging()
logger = logging.getLogger("app")
logger.info("RoomCanvas AI logging configured.")

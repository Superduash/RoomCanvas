"""
cache.py — In-memory application-level cache.

Three layers of caching:
1. Static data (styles, config) — computed once at import time, never changes.
2. GET /api/history — LRU cache with a short TTL so repeated list requests
   don't hit SQLite on every render, but mutations (generate/refine/delete)
   always invalidate the slot.
3. Individual Generation rows — LRU cache keyed by ID, invalidated on write.
"""
import time
import logging
from functools import lru_cache
from threading import Lock
from typing import Any

logger = logging.getLogger(__name__)

# ── Static data (build once, never expires) ────────────────────────────────────
@lru_cache(maxsize=1)
def get_cached_styles() -> list[dict]:
    """Cached /api/styles response — built from STYLE_TEMPLATES once."""
    from app.ai.prompts.style_hints import STYLE_TEMPLATES
    return [{"id": k, **v} for k, v in STYLE_TEMPLATES.items()]


@lru_cache(maxsize=1)
def get_cached_config(max_upload_mb: int) -> dict:
    """Cached /api/config — never changes during a process lifetime."""
    return {
        "max_upload_mb": max_upload_mb,
        "allowed_types": ["image/jpeg", "image/png", "image/webp"],
    }


# ── TTL cache for history list ─────────────────────────────────────────────────
_HISTORY_TTL_SECONDS = 5   # Short TTL — history mutates often
_history_cache: dict[str, Any] = {}
_history_lock = Lock()


def get_cached_history(limit: int) -> list | None:
    key = f"history:{limit}"
    with _history_lock:
        slot = _history_cache.get(key)
        if slot and (time.monotonic() - slot["ts"]) < _HISTORY_TTL_SECONDS:
            return slot["data"]
    return None


def set_cached_history(limit: int, data: list) -> None:
    key = f"history:{limit}"
    with _history_lock:
        _history_cache[key] = {"data": data, "ts": time.monotonic()}


def invalidate_history_cache() -> None:
    """Call after any mutation (generate, refine, delete, select-variation)."""
    with _history_lock:
        _history_cache.clear()
    logger.debug("History cache invalidated")


# ── Per-generation row cache ───────────────────────────────────────────────────
_GEN_TTL_SECONDS = 30  # Completed generations are stable — cache for 30s
_gen_cache: dict[int, Any] = {}
_gen_lock = Lock()


def get_cached_generation(generation_id: int) -> Any | None:
    with _gen_lock:
        slot = _gen_cache.get(generation_id)
        if slot and (time.monotonic() - slot["ts"]) < _GEN_TTL_SECONDS:
            return slot["data"]
    return None


def set_cached_generation(generation_id: int, data: Any) -> None:
    with _gen_lock:
        _gen_cache[generation_id] = {"data": data, "ts": time.monotonic()}


def invalidate_generation_cache(generation_id: int) -> None:
    with _gen_lock:
        _gen_cache.pop(generation_id, None)
    invalidate_history_cache()  # History list also stale

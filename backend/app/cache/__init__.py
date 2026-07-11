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
import json
from threading import Lock
from typing import Any

logger = logging.getLogger(__name__)

from app.cache.redis_cache import cached_json, redis

def get_cached_styles() -> list[dict]:
    """Cached /api/styles response — built from STYLE_TEMPLATES once."""
    def compute_fn():
        from app.ai.prompts.style_hints import STYLE_TEMPLATES, ADDITIONAL_STYLES
        styles = [{"id": k, **v} for k, v in STYLE_TEMPLATES.items()]
        styles.extend(ADDITIONAL_STYLES)
        return styles
    return cached_json("styles:v1", 3600, compute_fn)


def get_cached_config(max_upload_mb: int) -> dict:
    """Cached /api/config — never changes during a process lifetime."""
    def compute_fn():
        return {
            "max_upload_mb": max_upload_mb,
            "allowed_types": ["image/jpeg", "image/png", "image/webp"],
        }
    return cached_json("config:v1", 3600, compute_fn)


# ── TTL cache for history list ─────────────────────────────────────────────────
_HISTORY_TTL_SECONDS = 60   # TTL 60s
_history_cache: dict[str, Any] = {}
_history_lock = Lock()


def get_cached_history(user_id: int, limit: int) -> list | None:
    key = f"history:{user_id}:{limit}"
    if redis:
        cached = redis.get(key)
        if cached:
            return json.loads(cached) if isinstance(cached, str) else cached
        return None

    with _history_lock:
        slot = _history_cache.get(key)
        if slot and (time.monotonic() - slot["ts"]) < _HISTORY_TTL_SECONDS:
            return slot["data"]
    return None


def set_cached_history(user_id: int, limit: int, data: list) -> None:
    key = f"history:{user_id}:{limit}"
    if redis:
        redis.set(key, json.dumps(data), ex=_HISTORY_TTL_SECONDS)
        return

    with _history_lock:
        _history_cache[key] = {"data": data, "ts": time.monotonic()}


def invalidate_history_cache(user_id: int = None) -> None:
    """Call after any mutation (generate, refine, delete, select-variation)."""
    if redis:
        if user_id:
            # Need to delete all limits for this user (usually just 50, but let's be safe)
            # In Upstash Redis, keys pattern deletion requires script or multiple deletes.
            # We'll just delete the known limits we use (50) to keep it fast and sync.
            redis.delete(f"history:{user_id}:50")
            redis.delete(f"history:{user_id}:100")
        return

    with _history_lock:
        if user_id:
            keys_to_delete = [k for k in _history_cache.keys() if k.startswith(f"history:{user_id}:")]
            for k in keys_to_delete:
                del _history_cache[k]
        else:
            _history_cache.clear()
    logger.debug(f"History cache invalidated for user {user_id}")


# ── Per-generation row cache ───────────────────────────────────────────────────
_GEN_TTL_SECONDS = 60
_gen_cache: dict[int, Any] = {}
_gen_lock = Lock()


def get_cached_generation(generation_id: int) -> Any | None:
    key = f"generation:{generation_id}"
    if redis:
        cached = redis.get(key)
        if cached:
            return json.loads(cached) if isinstance(cached, str) else cached
        return None

    with _gen_lock:
        slot = _gen_cache.get(generation_id)
        if slot and (time.monotonic() - slot["ts"]) < _GEN_TTL_SECONDS:
            return slot["data"]
    return None


def set_cached_generation(generation_id: int, data: Any) -> None:
    key = f"generation:{generation_id}"
    if redis:
        redis.set(key, json.dumps(data), ex=_GEN_TTL_SECONDS)
        return

    with _gen_lock:
        _gen_cache[generation_id] = {"data": data, "ts": time.monotonic()}


def invalidate_generation_cache(generation_id: int, user_id: int = None) -> None:
    key = f"generation:{generation_id}"
    if redis:
        redis.delete(key)
    else:
        with _gen_lock:
            _gen_cache.pop(generation_id, None)
    
    if user_id:
        invalidate_history_cache(user_id)

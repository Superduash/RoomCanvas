from upstash_redis import Redis
from upstash_redis.asyncio import Redis as AsyncRedis
from app.config import settings
import json
# Fallback for dev if no URL/TOKEN is provided
if settings.UPSTASH_REDIS_URL and settings.UPSTASH_REDIS_TOKEN:
    redis = Redis(url=settings.UPSTASH_REDIS_URL, token=settings.UPSTASH_REDIS_TOKEN)
    async_redis = AsyncRedis(url=settings.UPSTASH_REDIS_URL, token=settings.UPSTASH_REDIS_TOKEN)
else:
    redis = None
    async_redis = None

import time
from threading import Lock

_in_memory_cache = {}
_in_memory_lock = Lock()

import asyncio
import logging

logger = logging.getLogger(__name__)

# Request coalescing locks for async cache
_async_locks: dict[str, asyncio.Lock] = {}
_async_locks_mutex = asyncio.Lock()

def cached_json(key: str, ttl_seconds: int, compute_fn):
    if redis:
        try:
            # Sync redis might block, but we catch exceptions
            cached = redis.get(key)
            if cached:
                if isinstance(cached, str):
                    return json.loads(cached)
                return cached
        except Exception as e:
            logger.warning(f"Redis get failed for {key}: {e}")
            
        value = compute_fn()
        try:
            redis.set(key, json.dumps(value), ex=ttl_seconds)
        except Exception as e:
            logger.warning(f"Redis set failed for {key}: {e}")
        return value

    # Fallback to in-memory
    with _in_memory_lock:
        slot = _in_memory_cache.get(key)
        if slot and (time.monotonic() - slot["ts"]) < ttl_seconds:
            return slot["data"]
            
    value = compute_fn()
    with _in_memory_lock:
        _in_memory_cache[key] = {"data": value, "ts": time.monotonic()}
    return value

async def cached_json_async(key: str, ttl_seconds: int, compute_fn):
    # 1. First, check cache without lock to be fast for hot keys
    if async_redis:
        try:
            cached = await asyncio.wait_for(async_redis.get(key), timeout=3.0)
            if cached:
                return json.loads(cached) if isinstance(cached, str) else cached
        except Exception as e:
            logger.warning(f"Redis get failed or timed out for {key}: {e}")
    else:
        with _in_memory_lock:
            slot = _in_memory_cache.get(key)
            if slot and (time.monotonic() - slot["ts"]) < ttl_seconds:
                return slot["data"]

    # 2. Not in cache. Get or create a lock for this key
    async with _async_locks_mutex:
        if key not in _async_locks:
            _async_locks[key] = asyncio.Lock()
        key_lock = _async_locks[key]
        
    async with key_lock:
        # 3. Double-check cache inside lock (in case another task just computed it)
        if async_redis:
            try:
                cached = await asyncio.wait_for(async_redis.get(key), timeout=3.0)
                if cached:
                    return json.loads(cached) if isinstance(cached, str) else cached
            except Exception:
                pass
        else:
            with _in_memory_lock:
                slot = _in_memory_cache.get(key)
                if slot and (time.monotonic() - slot["ts"]) < ttl_seconds:
                    return slot["data"]

        # 4. Compute the value
        value = await compute_fn()
        
        # 5. Store the value
        if async_redis:
            try:
                # fire and forget
                asyncio.create_task(async_redis.set(key, json.dumps(value), ex=ttl_seconds))
            except Exception as e:
                logger.warning(f"Redis set failed for {key}: {e}")
        else:
            with _in_memory_lock:
                _in_memory_cache[key] = {"data": value, "ts": time.monotonic()}
                
        return value

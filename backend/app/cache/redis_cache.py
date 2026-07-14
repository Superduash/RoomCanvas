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
    if async_redis:
        try:
            cached = await asyncio.wait_for(async_redis.get(key), timeout=3.0)
            if cached:
                if isinstance(cached, str):
                    return json.loads(cached)
                return cached
        except Exception as e:
            logger.warning(f"Redis get failed or timed out for {key}: {e}")
            
        value = await compute_fn()
        try:
            # fire and forget
            asyncio.create_task(async_redis.set(key, json.dumps(value), ex=ttl_seconds))
        except Exception as e:
            logger.warning(f"Redis set failed for {key}: {e}")
            
        return value

    # Fallback to in-memory
    with _in_memory_lock:
        slot = _in_memory_cache.get(key)
        if slot and (time.monotonic() - slot["ts"]) < ttl_seconds:
            return slot["data"]
            
    value = await compute_fn()
    with _in_memory_lock:
        _in_memory_cache[key] = {"data": value, "ts": time.monotonic()}
    return value

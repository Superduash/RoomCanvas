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

def cached_json(key: str, ttl_seconds: int, compute_fn):
    if redis:
        cached = redis.get(key)
        if cached:
            if isinstance(cached, str):
                return json.loads(cached)
            return cached
        value = compute_fn()
        redis.set(key, json.dumps(value), ex=ttl_seconds)
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
        cached = await async_redis.get(key)
        if cached:
            if isinstance(cached, str):
                return json.loads(cached)
            return cached
        value = await compute_fn()
        await async_redis.set(key, json.dumps(value), ex=ttl_seconds)
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

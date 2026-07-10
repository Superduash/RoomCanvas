from upstash_redis import Redis
from app.config import settings
import json

# Fallback for dev if no URL/TOKEN is provided
if settings.UPSTASH_REDIS_URL and settings.UPSTASH_REDIS_TOKEN:
    redis = Redis(url=settings.UPSTASH_REDIS_URL, token=settings.UPSTASH_REDIS_TOKEN)
else:
    redis = None

def cached_json(key: str, ttl_seconds: int, compute_fn):
    if not redis:
        return compute_fn()
    cached = redis.get(key)
    if cached:
        # Upstash Redis client can return strings or dicts depending on type, but JSON strings are safe to parse
        if isinstance(cached, str):
            return json.loads(cached)
        return cached
    value = compute_fn()
    redis.set(key, json.dumps(value), ex=ttl_seconds)
    return value

from fastapi import Request, HTTPException
from app.cache.redis_cache import redis

def RateLimiter(key_prefix: str, limit: int, window_seconds: int):
    async def _rate_limit_dependency(request: Request):
        if not redis:
            return
        client_ip = request.client.host if request.client else "127.0.0.1"
        key = f"ratelimit:{key_prefix}:{client_ip}"
        try:
            count = redis.incr(key)
            if count == 1:
                redis.expire(key, window_seconds)
            if count > limit:
                raise HTTPException(status_code=429, detail="Too many requests — please wait a moment before trying again.")
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            pass
    return _rate_limit_dependency


from fastapi import Request, HTTPException
from app.cache.redis_cache import redis

def RateLimiter(key_prefix: str, limit: int, window_seconds: int):
    async def _rate_limit_dependency(request: Request):
        if not redis:
            return
        
        # Use auth header as a proxy for user identity if present
        auth = request.headers.get("Authorization")
        if auth:
            client_id = str(hash(auth))
        else:
            client_id = request.client.host if request.client else "127.0.0.1"
            
        key = f"ratelimit:{key_prefix}:{client_id}"
        try:
            count = redis.incr(key)
            if count == 1:
                redis.expire(key, window_seconds)
            
            ttl = redis.ttl(key)
            if ttl < 0:
                ttl = window_seconds
                
            if count > limit:
                raise HTTPException(
                    status_code=429,
                    detail={"message": f"Rate limit exceeded. Try again in {ttl} seconds.", "retry_after": ttl},
                    headers={"Retry-After": str(ttl), "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": str(ttl)}
                )
                
            request.state.rate_limit_headers = {
                "X-RateLimit-Remaining": str(max(0, limit - count)),
                "X-RateLimit-Reset": str(ttl)
            }
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            pass
    return _rate_limit_dependency


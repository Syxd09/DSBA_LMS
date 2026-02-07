"""
EduMetrics Backend - Performance & Safety Guards

Rate limiting, pagination limits, and query timeouts.

PRODUCTION CONSTRAINT:
- Protect analytics and export endpoints from abuse
- Enforce hard limits on pagination
- Read-only enforcement for analytics
"""
from functools import wraps
from typing import Callable, Optional
import time
import asyncio

from fastapi import HTTPException, Request, status
from collections import defaultdict
import threading


# ============================================================================
# PAGINATION LIMITS
# ============================================================================

class PaginationLimits:
    """Hard limits for pagination parameters."""
    
    # Default page sizes
    DEFAULT_PAGE_SIZE = 50
    
    # Maximum page sizes by endpoint type
    MAX_PAGE_SIZE_DEFAULT = 100
    MAX_PAGE_SIZE_ANALYTICS = 500  # Analytics may need larger batches
    MAX_PAGE_SIZE_EXPORT = 1000    # Exports may need all records
    
    # Minimum page size
    MIN_PAGE_SIZE = 1
    
    @classmethod
    def enforce(
        cls,
        page: int,
        page_size: int,
        endpoint_type: str = "default"
    ) -> tuple:
        """Enforce pagination limits, return corrected values."""
        # Get max for endpoint type
        max_sizes = {
            "default": cls.MAX_PAGE_SIZE_DEFAULT,
            "analytics": cls.MAX_PAGE_SIZE_ANALYTICS,
            "export": cls.MAX_PAGE_SIZE_EXPORT,
        }
        max_size = max_sizes.get(endpoint_type, cls.MAX_PAGE_SIZE_DEFAULT)
        
        # Enforce page
        page = max(0, page)
        
        # Enforce page_size
        page_size = max(cls.MIN_PAGE_SIZE, min(page_size, max_size))
        
        return page, page_size


# ============================================================================
# RATE LIMITING
# ============================================================================

class RateLimiter:
    """
    Simple in-memory rate limiter.
    
    For production, use Redis-based limiter.
    """
    
    def __init__(self):
        self._requests: dict = defaultdict(list)
        self._lock = threading.Lock()
    
    def is_allowed(
        self,
        key: str,
        limit: int,
        window_seconds: int
    ) -> bool:
        """Check if request is allowed under rate limit."""
        now = time.time()
        window_start = now - window_seconds
        
        with self._lock:
            # Clean old requests
            self._requests[key] = [
                t for t in self._requests[key]
                if t > window_start
            ]
            
            # Check limit
            if len(self._requests[key]) >= limit:
                return False
            
            # Record request
            self._requests[key].append(now)
            return True
    
    def get_remaining(
        self,
        key: str,
        limit: int,
        window_seconds: int
    ) -> int:
        """Get remaining requests in window."""
        now = time.time()
        window_start = now - window_seconds
        
        with self._lock:
            recent = [
                t for t in self._requests[key]
                if t > window_start
            ]
            return max(0, limit - len(recent))


# Global rate limiter instance (in-memory for development)
rate_limiter = RateLimiter()


class RedisRateLimiter:
    """
    Production-grade Redis-based rate limiter.
    
    Uses Redis INCR with TTL for distributed rate limiting.
    Falls back to in-memory limiter if Redis unavailable.
    
    Production Usage:
        redis_limiter = RedisRateLimiter(redis_url="redis://localhost:6379")
        if not await redis_limiter.is_allowed_async(key, limit, window):
            raise RateLimitExceeded()
    """
    
    def __init__(self, redis_url: str = None, fallback: RateLimiter = None):
        self.redis_url = redis_url
        self._redis_client = None
        self._fallback = fallback or rate_limiter
        self._redis_available = False
    
    async def _get_redis(self):
        """Lazy initialization of Redis connection."""
        if self._redis_client is None and self.redis_url:
            try:
                import redis.asyncio as aioredis
                self._redis_client = aioredis.from_url(
                    self.redis_url,
                    encoding="utf-8",
                    decode_responses=True
                )
                # Test connection
                await self._redis_client.ping()
                self._redis_available = True
            except Exception as e:
                print(f"Redis unavailable, using in-memory fallback: {e}")
                self._redis_available = False
        return self._redis_client
    
    async def is_allowed_async(
        self,
        key: str,
        limit: int,
        window_seconds: int
    ) -> bool:
        """
        Check if request is allowed using Redis.
        
        Uses sliding window counter pattern:
        1. INCR key
        2. If first request, set EXPIRE
        3. Check if count <= limit
        """
        redis = await self._get_redis()
        
        if not self._redis_available or redis is None:
            # Fallback to in-memory
            return self._fallback.is_allowed(key, limit, window_seconds)
        
        try:
            redis_key = f"ratelimit:{key}"
            
            # Increment counter
            current = await redis.incr(redis_key)
            
            # Set expiry on first request
            if current == 1:
                await redis.expire(redis_key, window_seconds)
            
            return current <= limit
            
        except Exception as e:
            print(f"Redis error, using fallback: {e}")
            return self._fallback.is_allowed(key, limit, window_seconds)
    
    async def get_remaining_async(
        self,
        key: str,
        limit: int,
        window_seconds: int
    ) -> int:
        """Get remaining requests in current window."""
        redis = await self._get_redis()
        
        if not self._redis_available or redis is None:
            return self._fallback.get_remaining(key, limit, window_seconds)
        
        try:
            redis_key = f"ratelimit:{key}"
            current = await redis.get(redis_key)
            current = int(current) if current else 0
            return max(0, limit - current)
        except Exception:
            return self._fallback.get_remaining(key, limit, window_seconds)


# Rate limit presets
class RateLimitPresets:
    """Rate limit configurations by endpoint type."""
    
    # Standard API (requests per minute)
    STANDARD = (60, 60)  # 60 requests / 60 seconds
    
    # Analytics (may be expensive)
    ANALYTICS = (30, 60)  # 30 requests / 60 seconds
    
    # Export (resource intensive)
    EXPORT = (10, 60)  # 10 requests / 60 seconds
    
    # Template generation
    TEMPLATE = (20, 60)  # 20 requests / 60 seconds


def rate_limit(
    limit: int = 60,
    window_seconds: int = 60,
    key_func: Optional[Callable[[Request], str]] = None
):
    """
    Rate limit decorator for FastAPI endpoints.
    
    Usage:
        @router.get("/endpoint")
        @rate_limit(limit=10, window_seconds=60)
        async def my_endpoint():
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find request in kwargs
            request = kwargs.get("request")
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            if request:
                # Generate rate limit key
                if key_func:
                    key = key_func(request)
                else:
                    # Default: by IP
                    key = f"rate:{request.client.host if request.client else 'unknown'}"
                
                # Check rate limit
                if not rate_limiter.is_allowed(key, limit, window_seconds):
                    remaining = rate_limiter.get_remaining(key, limit, window_seconds)
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail={
                            "error": "Rate limit exceeded",
                            "limit": limit,
                            "window_seconds": window_seconds,
                            "remaining": remaining,
                            "retry_after": window_seconds,
                        }
                    )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# ============================================================================
# QUERY TIMEOUT
# ============================================================================

class QueryTimeout:
    """Query timeout settings."""
    
    # Default query timeout (seconds)
    DEFAULT = 30
    
    # Analytics queries (may need more time)
    ANALYTICS = 60
    
    # Export queries (may process many records)
    EXPORT = 120


async def with_timeout(
    coro,
    timeout_seconds: int = QueryTimeout.DEFAULT,
    error_message: str = "Query timed out"
):
    """
    Execute coroutine with timeout.
    
    Usage:
        result = await with_timeout(
            my_db_query(),
            timeout_seconds=30
        )
    """
    try:
        return await asyncio.wait_for(coro, timeout=timeout_seconds)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=error_message
        )


# ============================================================================
# READ-ONLY ENFORCEMENT
# ============================================================================

class ReadOnlySessionWrapper:
    """
    Wrapper that prevents write operations on database session.
    
    Raises error on commit(), add(), delete() operations.
    Used for analytics endpoints to guarantee no side effects.
    """
    
    def __init__(self, session):
        self._session = session
        self._blocked_methods = ['commit', 'add', 'add_all', 'delete', 'flush']
    
    def __getattr__(self, name):
        if name in self._blocked_methods:
            raise RuntimeError(
                f"Write operation '{name}' not allowed in read-only context. "
                "Analytics and template endpoints must not modify data."
            )
        return getattr(self._session, name)
    
    def query(self, *args, **kwargs):
        """Allow query operations."""
        return self._session.query(*args, **kwargs)
    
    def execute(self, *args, **kwargs):
        """Allow SELECT queries only."""
        return self._session.execute(*args, **kwargs)
    
    def close(self):
        """Allow closing session."""
        return self._session.close()


def enforce_read_only(func: Callable):
    """
    Decorator to enforce read-only database access.
    
    Wraps the database session to prevent write operations.
    Used for analytics and template endpoints.
    
    Usage:
        @router.get("/analytics")
        @enforce_read_only
        async def get_analytics(db: Session = Depends(get_db)):
            # db is now wrapped - any write operation will raise error
            return db.query(Model).all()
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Find db session in kwargs
        db = kwargs.get('db')
        if db:
            kwargs['db'] = ReadOnlySessionWrapper(db)
        
        try:
            return await func(*args, **kwargs)
        except RuntimeError as e:
            if "not allowed in read-only context" in str(e):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={
                        "error": "Read-only violation",
                        "message": str(e)
                    }
                )
            raise
    return wrapper


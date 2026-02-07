"""
EduMetrics Backend - Cache Module

Redis-based caching for analytics with automatic invalidation.
"""
import json
import hashlib
import logging
from functools import wraps
from typing import Optional, Callable, Any
from datetime import timedelta

import redis.asyncio as redis

from app.config import settings

logger = logging.getLogger(__name__)

# Redis connection pool (lazy initialization)
_redis_pool: Optional[redis.Redis] = None


async def get_redis() -> Optional[redis.Redis]:
    """Get Redis connection with lazy initialization."""
    global _redis_pool
    if _redis_pool is None:
        try:
            _redis_pool = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            # Test connection
            await _redis_pool.ping()
            logger.info("✅ Redis cache connected")
        except Exception as e:
            logger.warning(f"⚠️ Redis unavailable, caching disabled: {e}")
            _redis_pool = None
    return _redis_pool


async def close_redis():
    """Close Redis connection pool."""
    global _redis_pool
    if _redis_pool:
        await _redis_pool.close()
        _redis_pool = None


def cache_key(*args, **kwargs) -> str:
    """Generate cache key from arguments."""
    key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
    return hashlib.md5(key_data.encode()).hexdigest()


def cache_analytics(
    ttl_seconds: int = None,
    key_prefix: str = "",
    invalidate_on: Optional[list] = None
):
    """
    Decorator for caching analytics results in Redis.
    
    Args:
        ttl_seconds: Cache TTL in seconds (default from settings)
        key_prefix: Prefix for cache key
        invalidate_on: List of event names that trigger invalidation
        
    Usage:
        @cache_analytics(key_prefix="co_attainment", ttl_seconds=300)
        async def calculate_co_attainment(db, offering_id):
            ...
    """
    if ttl_seconds is None:
        ttl_seconds = settings.CACHE_TTL_ANALYTICS
        
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            redis_client = await get_redis()
            
            # Generate cache key
            key = f"{key_prefix}:{cache_key(*args[1:], **kwargs)}"  # Skip 'db' arg
            
            # Try cache first
            if redis_client:
                try:
                    cached = await redis_client.get(key)
                    if cached:
                        logger.debug(f"Cache HIT: {key}")
                        return json.loads(cached)
                except Exception as e:
                    logger.warning(f"Cache read error: {e}")
            
            # Compute result
            result = await func(*args, **kwargs)
            
            # Store in cache
            if redis_client and result is not None:
                try:
                    await redis_client.setex(
                        key,
                        ttl_seconds,
                        json.dumps(result, default=str)
                    )
                    logger.debug(f"Cache SET: {key} (TTL: {ttl_seconds}s)")
                except Exception as e:
                    logger.warning(f"Cache write error: {e}")
            
            return result
        return wrapper
    return decorator


async def invalidate_cache(pattern: str):
    """
    Invalidate cache entries matching pattern.
    
    Args:
        pattern: Redis key pattern (e.g., "co_attainment:*")
    """
    redis_client = await get_redis()
    if redis_client:
        try:
            keys = await redis_client.keys(pattern)
            if keys:
                await redis_client.delete(*keys)
                logger.info(f"Invalidated {len(keys)} cache keys matching: {pattern}")
        except Exception as e:
            logger.warning(f"Cache invalidation error: {e}")


async def invalidate_offering_cache(offering_id: str):
    """Invalidate all cache entries for a subject offering."""
    await invalidate_cache(f"co_attainment:*{offering_id}*")
    await invalidate_cache(f"po_attainment:*{offering_id}*")
    await invalidate_cache(f"marks_analytics:*{offering_id}*")


async def invalidate_cohort_cache(cohort_id: str):
    """Invalidate all cache entries for a cohort."""
    await invalidate_cache(f"*:*{cohort_id}*")


class CacheManager:
    """
    Centralized cache management for analytics.
    
    Usage:
        cache = CacheManager()
        await cache.get_or_compute("co:offering123", compute_fn, ttl=300)
    """
    
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
    
    async def connect(self):
        """Initialize Redis connection."""
        self.redis = await get_redis()
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if self.redis:
            try:
                value = await self.redis.get(key)
                return json.loads(value) if value else None
            except Exception:
                return None
        return None
    
    async def set(self, key: str, value: Any, ttl: int = 300):
        """Set value in cache with TTL."""
        if self.redis:
            try:
                await self.redis.setex(key, ttl, json.dumps(value, default=str))
            except Exception as e:
                logger.warning(f"Cache set error: {e}")
    
    async def delete(self, key: str):
        """Delete specific key from cache."""
        if self.redis:
            try:
                await self.redis.delete(key)
            except Exception:
                pass
    
    async def get_or_compute(
        self,
        key: str,
        compute_fn: Callable,
        ttl: int = 300
    ) -> Any:
        """Get from cache or compute and store."""
        cached = await self.get(key)
        if cached is not None:
            return cached
        
        result = await compute_fn()
        await self.set(key, result, ttl)
        return result


# Global cache manager instance
cache_manager = CacheManager()

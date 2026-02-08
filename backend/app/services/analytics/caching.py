"""
EduMetrics Analytics - Caching Layer
P-01: Redis caching for heavy CO/PO computations

Provides:
- Automatic cache key generation based on parameters
- TTL-based expiration
- Cache invalidation on marks update
- Decorator-based caching for service methods
- Fallback to no-cache if Redis unavailable
"""
import json
import hashlib
import functools
from typing import Optional, Any, Callable, TypeVar, Union
from datetime import timedelta
import logging
from uuid import UUID

# Redis client (optional - graceful degradation)
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None

logger = logging.getLogger(__name__)

# =============================================================================
# CONFIGURATION
# =============================================================================

class CacheConfig:
    """Cache configuration settings."""
    # Redis connection
    REDIS_HOST = "localhost"
    REDIS_PORT = 6379
    REDIS_DB = 0
    REDIS_PASSWORD = None
    
    # TTL settings (in seconds)
    TTL_SHORT = 300  # 5 minutes
    TTL_MEDIUM = 1800  # 30 minutes
    TTL_LONG = 3600  # 1 hour
    TTL_DAILY = 86400  # 24 hours
    
    # Cache key prefixes
    PREFIX_CO_ATTAINMENT = "co_attainment"
    PREFIX_PO_ATTAINMENT = "po_attainment"
    PREFIX_PSO_ATTAINMENT = "pso_attainment"
    PREFIX_MARKS_SUMMARY = "marks_summary"
    PREFIX_DASHBOARD = "dashboard"
    PREFIX_TOPIC_ANALYSIS = "topic_analysis"
    PREFIX_QUESTION_ANALYSIS = "question_analysis"


# =============================================================================
# REDIS CLIENT SINGLETON
# =============================================================================

_redis_client: Optional['redis.Redis'] = None

def get_redis_client() -> Optional['redis.Redis']:
    """Get Redis client singleton with graceful fallback."""
    global _redis_client
    
    if not REDIS_AVAILABLE:
        return None
    
    if _redis_client is None:
        try:
            _redis_client = redis.Redis(
                host=CacheConfig.REDIS_HOST,
                port=CacheConfig.REDIS_PORT,
                db=CacheConfig.REDIS_DB,
                password=CacheConfig.REDIS_PASSWORD,
                decode_responses=True,
                socket_connect_timeout=2  # Fast fail
            )
            # Test connection
            _redis_client.ping()
            logger.info("Redis cache connected successfully")
        except Exception as e:
            logger.warning(f"Redis not available, caching disabled: {e}")
            _redis_client = None
    
    return _redis_client


# =============================================================================
# CACHE KEY GENERATION
# =============================================================================

def generate_cache_key(prefix: str, *args, **kwargs) -> str:
    """
    Generate a deterministic cache key from prefix and arguments.
    
    Handles UUIDs, dicts, lists and primitives.
    """
    # Normalize arguments
    normalized = []
    
    for arg in args:
        if isinstance(arg, UUID):
            normalized.append(str(arg))
        elif isinstance(arg, (dict, list)):
            normalized.append(json.dumps(arg, sort_keys=True, default=str))
        else:
            normalized.append(str(arg))
    
    for key in sorted(kwargs.keys()):
        val = kwargs[key]
        if isinstance(val, UUID):
            normalized.append(f"{key}={val}")
        elif isinstance(val, (dict, list)):
            normalized.append(f"{key}={json.dumps(val, sort_keys=True, default=str)}")
        else:
            normalized.append(f"{key}={val}")
    
    # Create hash for long keys
    key_data = ":".join(normalized)
    if len(key_data) > 200:
        key_hash = hashlib.md5(key_data.encode()).hexdigest()
        return f"{prefix}:{key_hash}"
    
    return f"{prefix}:{key_data}"


# =============================================================================
# CACHE OPERATIONS
# =============================================================================

def cache_get(key: str) -> Optional[Any]:
    """Get value from cache."""
    client = get_redis_client()
    if client is None:
        return None
    
    try:
        value = client.get(key)
        if value:
            return json.loads(value)
        return None
    except Exception as e:
        logger.warning(f"Cache get error: {e}")
        return None


def cache_set(key: str, value: Any, ttl: int = CacheConfig.TTL_MEDIUM) -> bool:
    """Set value in cache with TTL."""
    client = get_redis_client()
    if client is None:
        return False
    
    try:
        serialized = json.dumps(value, default=str)
        client.setex(key, ttl, serialized)
        return True
    except Exception as e:
        logger.warning(f"Cache set error: {e}")
        return False


def cache_delete(key: str) -> bool:
    """Delete a specific key from cache."""
    client = get_redis_client()
    if client is None:
        return False
    
    try:
        client.delete(key)
        return True
    except Exception as e:
        logger.warning(f"Cache delete error: {e}")
        return False


def cache_invalidate_pattern(pattern: str) -> int:
    """
    Invalidate all keys matching pattern.
    
    Example: cache_invalidate_pattern("co_attainment:*")
    """
    client = get_redis_client()
    if client is None:
        return 0
    
    try:
        keys = list(client.scan_iter(match=pattern, count=100))
        if keys:
            return client.delete(*keys)
        return 0
    except Exception as e:
        logger.warning(f"Cache invalidate pattern error: {e}")
        return 0


# =============================================================================
# INVALIDATION TRIGGERS
# =============================================================================

def invalidate_offering_cache(offering_id: UUID):
    """Invalidate all caches related to an offering."""
    patterns = [
        f"{CacheConfig.PREFIX_CO_ATTAINMENT}:*{offering_id}*",
        f"{CacheConfig.PREFIX_MARKS_SUMMARY}:*{offering_id}*",
        f"{CacheConfig.PREFIX_TOPIC_ANALYSIS}:*{offering_id}*",
        f"{CacheConfig.PREFIX_QUESTION_ANALYSIS}:*{offering_id}*",
    ]
    
    total = 0
    for pattern in patterns:
        total += cache_invalidate_pattern(pattern)
    
    logger.info(f"Invalidated {total} cache keys for offering {offering_id}")
    return total


def invalidate_program_cache(program_id: UUID):
    """Invalidate all caches related to a program."""
    patterns = [
        f"{CacheConfig.PREFIX_PO_ATTAINMENT}:*{program_id}*",
        f"{CacheConfig.PREFIX_PSO_ATTAINMENT}:*{program_id}*",
        f"{CacheConfig.PREFIX_DASHBOARD}:*{program_id}*",
    ]
    
    total = 0
    for pattern in patterns:
        total += cache_invalidate_pattern(pattern)
    
    logger.info(f"Invalidated {total} cache keys for program {program_id}")
    return total


def invalidate_exam_cache(exam_id: UUID):
    """Invalidate caches related to an exam."""
    pattern = f"*{exam_id}*"
    total = cache_invalidate_pattern(pattern)
    logger.info(f"Invalidated {total} cache keys for exam {exam_id}")
    return total


# =============================================================================
# CACHING DECORATOR
# =============================================================================

T = TypeVar('T')

def cached(
    prefix: str,
    ttl: int = CacheConfig.TTL_MEDIUM,
    key_params: Optional[list] = None
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator to cache function/method results.
    
    Usage:
        @cached(prefix="co_attainment", ttl=1800)
        async def compute_co_attainment(db, offering_id):
            ...
    
    Args:
        prefix: Cache key prefix
        ttl: Time-to-live in seconds
        key_params: List of parameter names to use for cache key
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs) -> T:
            # Generate cache key
            if key_params:
                key_values = {k: kwargs.get(k) or args[key_params.index(k)+1] 
                              for k in key_params if k in kwargs or len(args) > key_params.index(k)+1}
                cache_key = generate_cache_key(prefix, **key_values)
            else:
                # Use all arguments except db (first arg)
                cache_key = generate_cache_key(prefix, *args[1:], **kwargs)
            
            # Try cache
            cached_value = cache_get(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache HIT: {cache_key}")
                return cached_value
            
            # Compute and cache
            logger.debug(f"Cache MISS: {cache_key}")
            result = await func(*args, **kwargs)
            cache_set(cache_key, result, ttl)
            return result
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs) -> T:
            if key_params:
                key_values = {k: kwargs.get(k) for k in key_params if k in kwargs}
                cache_key = generate_cache_key(prefix, **key_values)
            else:
                cache_key = generate_cache_key(prefix, *args[1:], **kwargs)
            
            cached_value = cache_get(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache HIT: {cache_key}")
                return cached_value
            
            logger.debug(f"Cache MISS: {cache_key}")
            result = func(*args, **kwargs)
            cache_set(cache_key, result, ttl)
            return result
        
        # Return appropriate wrapper
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


# =============================================================================
# CACHE STATS (for monitoring)
# =============================================================================

def get_cache_stats() -> dict:
    """Get cache statistics for monitoring."""
    client = get_redis_client()
    if client is None:
        return {"available": False}
    
    try:
        info = client.info('stats')
        memory = client.info('memory')
        keyspace = client.info('keyspace')
        
        return {
            "available": True,
            "connected_clients": client.info('clients').get('connected_clients', 0),
            "used_memory_human": memory.get('used_memory_human', 'N/A'),
            "total_commands": info.get('total_commands_processed', 0),
            "keyspace_hits": info.get('keyspace_hits', 0),
            "keyspace_misses": info.get('keyspace_misses', 0),
            "hit_rate": (
                info.get('keyspace_hits', 0) / 
                max(1, info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0))
            ) * 100,
            "db_keys": keyspace.get('db0', {}).get('keys', 0) if keyspace else 0
        }
    except Exception as e:
        return {"available": False, "error": str(e)}

"""
EduMetrics Backend - FastAPI Application Entry Point

Production-hardened application with:
- Global error handlers
- Request ID tracing
- Audit-safe logging
- Health checks
- CSRF Protection
- Redis Cache
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette_csrf import CSRFMiddleware

from app.config import settings
from app.api.v1 import router as api_v1_router
from app.api.health import router as health_router
from app.core.error_handlers import register_exception_handlers
from app.core.middleware import (
    RequestIdMiddleware,
    AuditLoggingMiddleware,
    configure_logging,
)
from app.core.cache import get_redis, close_redis, cache_manager


# Configure logging first
configure_logging()


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for EduMetrics Outcome-Based Education Platform",
    docs_url="/docs",
    redoc_url="/redoc",
)


# Register exception handlers
register_exception_handlers(app)


# Add middleware (order matters - first added = outermost)
app.add_middleware(AuditLoggingMiddleware)
app.add_middleware(RequestIdMiddleware)

# CSRF Protection - exempt GET, HEAD, OPTIONS and health/docs endpoints
app.add_middleware(
    CSRFMiddleware,
    secret=settings.CSRF_SECRET,
    sensitive_cookies={"access_token", "session"},
    cookie_secure=settings.CSRF_COOKIE_SECURE,
    cookie_name="csrftoken",
    header_name="X-CSRF-Token",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-CSRF-Token"],
    expose_headers=["X-Request-ID", "X-CSRF-Token"],
)


# Legacy health endpoint (for backwards compatibility)
@app.get("/health", tags=["Health"], deprecated=True)
async def health_check():
    """Legacy health check. Use /health/ready instead."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


# Include routers
app.include_router(health_router)  # Health at root level
app.include_router(api_v1_router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    """Application startup event handler."""
    import logging
    logger = logging.getLogger("edumetrics")
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} starting...")
    logger.info(f"📝 Environment: {settings.ENVIRONMENT}")
    logger.info(f"🔗 Database: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else 'configured'}")
    logger.info(f"🌐 CORS Origins: {settings.cors_origins_list}")
    logger.info(f"🔐 CSRF Protection: ENABLED")
    logger.info(f"🔑 RBAC: {'ENABLED' if settings.ENABLE_RBAC else 'DISABLED'}")
    
    # Initialize Redis cache
    await cache_manager.connect()
    logger.info(f"📦 Redis Cache: {'CONNECTED' if cache_manager.redis else 'DISABLED'}")
    
    # Initialize scheduler if enabled
    if settings.ENABLE_SCHEDULER:
        from app.services.scheduler import start_scheduler
        await start_scheduler()
        logger.info("⏰ Scheduler: ENABLED")
    
    logger.info("✅ Phases locked: 1, 2A, 2B, 2C")


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event handler."""
    import logging
    logger = logging.getLogger("edumetrics")
    
    # Close Redis connection
    await close_redis()
    
    # Stop scheduler
    if settings.ENABLE_SCHEDULER:
        from app.services.scheduler import stop_scheduler
        await stop_scheduler()
    
    logger.info(f"👋 {settings.APP_NAME} shutting down...")



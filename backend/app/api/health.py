"""
EduMetrics Backend - Health Check Endpoints

Production health and readiness checks.

Endpoints:
- /health/live  - Liveness probe (is the app running?)
- /health/ready - Readiness probe (is the app ready to serve?)
"""
from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings


router = APIRouter(prefix="/health", tags=["Health"])


@router.get(
    "/live",
    summary="Liveness Check",
    description="Returns 200 if the application is running.",
    response_model=Dict[str, Any],
)
async def liveness_check():
    """
    Liveness probe for Kubernetes/orchestrators.
    
    Returns 200 if the app process is running.
    Does not check dependencies.
    """
    return {
        "status": "alive",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get(
    "/ready",
    summary="Readiness Check",
    description="Returns 200 if the application is ready to serve requests.",
    response_model=Dict[str, Any],
)
async def readiness_check(db: Session = Depends(get_db)):
    """
    Readiness probe for Kubernetes/orchestrators.
    
    Checks:
    - Database connectivity
    
    Returns 503 if any check fails.
    """
    checks = {}
    all_healthy = True
    
    # Check database
    db_status = await _check_database(db)
    checks["database"] = db_status
    if db_status["status"] != "healthy":
        all_healthy = False
    
    response = {
        "status": "ready" if all_healthy else "not_ready",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
        "checks": checks,
    }
    
    if not all_healthy:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=response,
        )
    
    return response


async def _check_database(db: Session) -> Dict[str, Any]:
    """Check database connectivity."""
    try:
        # Execute simple query
        result = db.execute(text("SELECT 1"))
        result.close()
        
        return {
            "status": "healthy",
            "latency_ms": 0,  # Could time this
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
        }


@router.get(
    "/info",
    summary="Application Info",
    description="Returns application metadata.",
)
async def app_info():
    """Return application metadata."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
        "phases_locked": [
            "Phase-1 (Data Model)",
            "Phase-2A (Computation)",
            "Phase-2B (Analytics APIs)",
            "Phase-2C (Templates)",
        ],
    }

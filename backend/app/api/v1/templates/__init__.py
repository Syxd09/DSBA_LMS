"""
EduMetrics Templates API

Aggregates all template-related routers.
"""
from fastapi import APIRouter

from app.api.v1.templates.reports import router as reports_router


router = APIRouter()
router.include_router(reports_router)

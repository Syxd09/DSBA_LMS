"""
EduMetrics Analytics API - Router Registration

Combines all analytics routers into a single router.
Phase-2B data APIs + Phase-3 role-scoped analytics.
"""
from fastapi import APIRouter

from app.api.v1.analytics.marks import router as marks_router
from app.api.v1.analytics.co import router as co_router
from app.api.v1.analytics.po import router as po_router
from app.api.v1.analytics.pso import router as pso_router  # NEW: PSO analytics
from app.api.v1.analytics.sgpa_cgpa import router as sgpa_router
from app.api.v1.analytics.result import router as result_router
from app.api.v1.analytics.role_scoped import router as role_scoped_router
from app.api.v1.analytics.stats import router as stats_router


router = APIRouter()

# Phase-2B Analytics APIs
router.include_router(marks_router)
router.include_router(co_router)
router.include_router(po_router)
router.include_router(pso_router)  # NEW: PSO analytics
router.include_router(sgpa_router)
router.include_router(result_router)

# Phase-3 Role-Scoped Analytics
router.include_router(role_scoped_router)

# General Stats (Migrated from legacy analytics.py)
router.include_router(stats_router)



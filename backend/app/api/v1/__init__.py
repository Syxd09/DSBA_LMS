"""
EduMetrics Backend - API v1 Router
Combines all v1 routers
"""
from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.departments import router as departments_router
from app.api.v1.programs import router as programs_router
from app.api.v1.cohorts import router as cohorts_router
from app.api.v1.subjects import router as subjects_router
from app.api.v1.enrollments import router as enrollments_router
from app.api.v1.assignments import router as assignments_router
from app.api.v1.exams import router as exams_router
from app.api.v1.marks import router as marks_router
from app.api.v1.grading import router as grading_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.templates import router as templates_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.audit import router as audit_router
# Phase 6.2: Extended assessment components
from app.api.v1.assessment_components import router as assessment_components_router
from app.api.v1.external_exams import router as external_exams_router
# Phase 7: Backlog and Promotions
from app.api.v1.backlog import router as backlog_router
from app.api.v1.promotions import router as promotions_router

router = APIRouter()

# Include all routers
router.include_router(auth_router)
router.include_router(users_router)
router.include_router(departments_router)
router.include_router(programs_router)
router.include_router(cohorts_router)
router.include_router(subjects_router)
router.include_router(enrollments_router)
router.include_router(assignments_router)
router.include_router(exams_router)
router.include_router(marks_router)
router.include_router(grading_router)
router.include_router(analytics_router)
router.include_router(templates_router)
router.include_router(dashboard_router)
router.include_router(audit_router)
# Phase 6.2: Extended assessment components
router.include_router(assessment_components_router)
router.include_router(external_exams_router)
# Phase 7: Backlog and Promotions
router.include_router(backlog_router)
router.include_router(promotions_router)




"""
EduMetrics API - Role-Scoped Analytics Endpoints

PHASE 3: Analytics & Reporting Engine (Role-Scoped)
Exposes role-specific analytics views with RBAC protection.

Consumes Phase-2B APIs via role_scoped.py services.
"""
from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import (
    require_authenticated, PermissionChecker, Permission
)
from app.models import Profile, StudentEnrollment, Department
from app.services.analytics.schemas import AnalyticsResponse
from app.services.analytics.role_scoped import (
    StudentAnalyticsService,
    FacultyAnalyticsService,
    HODAnalyticsService,
    PrincipalAnalyticsService
)


router = APIRouter(prefix="/analytics/role", tags=["Analytics - Role-Scoped"])


# ============================================================================
# STUDENT ANALYTICS (Own data only)
# ============================================================================

@router.get(
    "/student/performance",
    response_model=AnalyticsResponse,
    summary="Student Academic Performance",
    description="Get own academic performance summary. RBAC: DASHBOARD_STUDENT.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_STUDENT))]
)
async def get_student_performance(
    regulation_year: int = Query(default=2021),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get current student's academic performance."""
    return await StudentAnalyticsService.get_academic_performance(
        db=db,
        student_id=current_user.user_id,
        regulation_year=regulation_year
    )


@router.get(
    "/student/co-profile/{offering_id}",
    response_model=AnalyticsResponse,
    summary="Student CO Profile",
    description="Get CO-wise attainment for a subject. RBAC: DASHBOARD_STUDENT.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_STUDENT))]
)
async def get_student_co_profile(
    offering_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get current student's CO attainment profile for a subject."""
    return await StudentAnalyticsService.get_co_attainment_profile(
        db=db,
        student_id=current_user.user_id,
        offering_id=offering_id
    )


# ============================================================================
# FACULTY ANALYTICS (Assigned subjects only)
# ============================================================================

@router.get(
    "/faculty/subject-health/{offering_id}",
    response_model=AnalyticsResponse,
    summary="Subject Health Report",
    description="Get subject health for assigned offering. RBAC: DASHBOARD_TEACHER.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_TEACHER))]
)
async def get_faculty_subject_health(
    offering_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get subject health report for teacher's assigned subject."""
    return await FacultyAnalyticsService.get_subject_health_report(
        db=db,
        offering_id=offering_id,
        teacher_id=current_user.user_id
    )


@router.get(
    "/faculty/question-analysis/{exam_id}",
    response_model=AnalyticsResponse,
    summary="Question Analysis",
    description="Get question-level analysis for exam. RBAC: DASHBOARD_TEACHER.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_TEACHER))]
)
async def get_faculty_question_analysis(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get question analysis for an exam."""
    # Note: Could add teacher ownership check here
    return await FacultyAnalyticsService.get_question_analysis(
        db=db,
        exam_id=exam_id
    )


# ============================================================================
# HOD ANALYTICS (Department-scoped)
# ============================================================================

@router.get(
    "/hod/department-health",
    response_model=AnalyticsResponse,
    summary="Department Health",
    description="Get department-wide health summary. RBAC: DASHBOARD_HOD.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_HOD))]
)
async def get_hod_department_health(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get HOD's department health summary."""
    # Get HOD's department
    dept = db.query(Department).filter(
        Department.hod_id == current_user.user_id
    ).first()
    
    if not dept:
        raise HTTPException(status_code=404, detail="No department assigned")
    
    return await HODAnalyticsService.get_department_health(
        db=db,
        department_id=dept.id
    )


@router.get(
    "/hod/batch-comparison",
    response_model=AnalyticsResponse,
    summary="Batch Comparison",
    description="Compare batches by CO attainment. RBAC: DASHBOARD_HOD.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_HOD))]
)
async def get_hod_batch_comparison(
    batch_years: List[int] = Query(..., description="Years to compare"),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Compare batches in HOD's department."""
    dept = db.query(Department).filter(
        Department.hod_id == current_user.user_id
    ).first()
    
    if not dept:
        raise HTTPException(status_code=404, detail="No department assigned")
    
    return await HODAnalyticsService.get_batch_comparison(
        db=db,
        department_id=dept.id,
        batch_years=batch_years
    )


# ============================================================================
# PRINCIPAL ANALYTICS (Institution-wide)
# ============================================================================

@router.get(
    "/principal/institution-overview",
    response_model=AnalyticsResponse,
    summary="Institution Overview",
    description="Get institution-wide metrics. RBAC: DASHBOARD_PRINCIPAL.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_PRINCIPAL))]
)
async def get_principal_institution_overview(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get institution-wide overview for principal."""
    return await PrincipalAnalyticsService.get_institution_overview(db=db)


@router.get(
    "/principal/department-comparison",
    response_model=AnalyticsResponse,
    summary="Department Comparison",
    description="Compare all departments. RBAC: DASHBOARD_PRINCIPAL.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_PRINCIPAL))]
)
async def get_principal_department_comparison(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Compare departments for principal view."""
    return await PrincipalAnalyticsService.get_department_comparison(db=db)

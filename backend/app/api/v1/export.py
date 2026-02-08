"""
EduMetrics API - Analytics Export Endpoints

Provides export endpoints for all analytics data with format selection.
All export endpoints accept format query param (json, csv, xlsx, pdf).
"""
from typing import List, Optional
from uuid import UUID
from enum import Enum

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import require_authenticated, PermissionChecker, Permission
from app.models import Profile, StudentEnrollment, Department
from app.services.export import export_analytics, ExportFormat


router = APIRouter(prefix="/export", tags=["Export"])


# ============================================================================
# STUDENT EXPORTS
# ============================================================================

@router.get(
    "/student/performance",
    summary="Export Student Performance",
    description="Export student's performance data. RBAC: DASHBOARD_STUDENT.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_STUDENT))]
)
async def export_student_performance(
    format: ExportFormat = Query(default=ExportFormat.JSON),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Export student performance in requested format."""
    from app.services.analytics.role_scoped import StudentAnalyticsService
    
    result = await StudentAnalyticsService.get_academic_performance(
        db=db,
        student_id=current_user.user_id
    )
    
    return export_analytics(
        data=result.data if hasattr(result, 'data') else result,
        format=format,
        filename="student_performance",
        title="Student Academic Performance",
        flatten_key="subjects"
    )


@router.get(
    "/student/topic-heatmap/{offering_id}",
    summary="Export Topic Heatmap",
    description="Export student topic performance. RBAC: DASHBOARD_STUDENT.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_STUDENT))]
)
async def export_student_topic_heatmap(
    offering_id: UUID,
    format: ExportFormat = Query(default=ExportFormat.JSON),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Export topic heatmap in requested format."""
    from app.services.analytics.topic_coverage import get_student_topic_heatmap
    
    enrollment = db.query(StudentEnrollment).filter(
        StudentEnrollment.user_id == current_user.user_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    heatmap = await get_student_topic_heatmap(db, enrollment.usn, offering_id)
    
    return export_analytics(
        data=heatmap,
        format=format,
        filename=f"topic_heatmap_{offering_id}",
        title="Topic Performance Heatmap",
        flatten_key="units"
    )


# ============================================================================
# TEACHER EXPORTS
# ============================================================================

@router.get(
    "/teacher/at-risk-students/{offering_id}",
    summary="Export At-Risk Students",
    description="Export at-risk students for offering. RBAC: DASHBOARD_TEACHER.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_TEACHER))]
)
async def export_at_risk_students(
    offering_id: UUID,
    threshold: float = Query(default=50.0),
    format: ExportFormat = Query(default=ExportFormat.JSON),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Export at-risk students in requested format."""
    from app.services.analytics.role_scoped import FacultyAnalyticsService
    
    result = await FacultyAnalyticsService.get_at_risk_students(
        db=db,
        offering_id=offering_id,
        teacher_id=current_user.user_id,
        threshold=threshold
    )
    
    return export_analytics(
        data=result.data if hasattr(result, 'data') else result,
        format=format,
        filename=f"at_risk_students_{offering_id}",
        title="At-Risk Students Report",
        flatten_key="at_risk_students"
    )


@router.get(
    "/teacher/question-analysis/{exam_id}",
    summary="Export Question Analysis",
    description="Export question-level analysis. RBAC: DASHBOARD_TEACHER.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_TEACHER))]
)
async def export_question_analysis(
    exam_id: UUID,
    format: ExportFormat = Query(default=ExportFormat.JSON),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Export question analysis in requested format."""
    from app.services.analytics.role_scoped import FacultyAnalyticsService
    
    result = await FacultyAnalyticsService.get_question_analysis(
        db=db,
        exam_id=exam_id
    )
    
    return export_analytics(
        data=result.data if hasattr(result, 'data') else result,
        format=format,
        filename=f"question_analysis_{exam_id}",
        title="Question Analysis Report",
        flatten_key="questions"
    )


# ============================================================================
# HOD EXPORTS
# ============================================================================

@router.get(
    "/hod/department-health",
    summary="Export Department Health",
    description="Export department health summary. RBAC: DASHBOARD_HOD.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_HOD))]
)
async def export_department_health(
    format: ExportFormat = Query(default=ExportFormat.JSON),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Export department health in requested format."""
    from app.services.analytics.role_scoped import HODAnalyticsService
    
    dept = db.query(Department).filter(
        Department.hod_id == current_user.user_id
    ).first()
    
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    result = await HODAnalyticsService.get_department_health(
        db=db,
        department_id=dept.id
    )
    
    return export_analytics(
        data=result.data if hasattr(result, 'data') else result,
        format=format,
        filename="department_health",
        title=f"Department Health - {dept.name}"
    )


@router.get(
    "/hod/batch-comparison",
    summary="Export Batch Comparison",
    description="Export batch comparison analytics. RBAC: DASHBOARD_HOD.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_HOD))]
)
async def export_batch_comparison(
    batch_years: List[int] = Query(...),
    format: ExportFormat = Query(default=ExportFormat.JSON),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Export batch comparison in requested format."""
    from app.services.analytics.role_scoped import HODAnalyticsService
    
    dept = db.query(Department).filter(
        Department.hod_id == current_user.user_id
    ).first()
    
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    result = await HODAnalyticsService.get_batch_comparison(
        db=db,
        department_id=dept.id,
        batch_years=batch_years
    )
    
    return export_analytics(
        data=result.data if hasattr(result, 'data') else result,
        format=format,
        filename="batch_comparison",
        title="Batch Comparison Report",
        flatten_key="batch_comparison"
    )


# ============================================================================
# PRINCIPAL EXPORTS
# ============================================================================

@router.get(
    "/principal/institution-overview",
    summary="Export Institution Overview",
    description="Export institution-wide overview. RBAC: DASHBOARD_PRINCIPAL.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_PRINCIPAL))]
)
async def export_institution_overview(
    format: ExportFormat = Query(default=ExportFormat.JSON),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Export institution overview in requested format."""
    from app.services.analytics.role_scoped import PrincipalAnalyticsService
    
    result = await PrincipalAnalyticsService.get_institution_overview(db=db)
    
    return export_analytics(
        data=result.data if hasattr(result, 'data') else result,
        format=format,
        filename="institution_overview",
        title="Institution Overview Report",
        flatten_key="department_breakdown"
    )


@router.get(
    "/principal/department-comparison",
    summary="Export Department Comparison",
    description="Export department comparison. RBAC: DASHBOARD_PRINCIPAL.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_PRINCIPAL))]
)
async def export_department_comparison(
    format: ExportFormat = Query(default=ExportFormat.JSON),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Export department comparison in requested format."""
    from app.services.analytics.role_scoped import PrincipalAnalyticsService
    
    result = await PrincipalAnalyticsService.get_department_comparison(db=db)
    
    return export_analytics(
        data=result.data if hasattr(result, 'data') else result,
        format=format,
        filename="department_comparison",
        title="Department Comparison Report",
        flatten_key="comparison"
    )

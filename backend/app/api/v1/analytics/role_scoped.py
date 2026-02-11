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
from app.models import Profile, Student, Department, UserRole
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


@router.get(
    "/student/insights",
    summary="Student Personalized Insights",
    description="Get rule-based personalized insights. RBAC: DASHBOARD_STUDENT.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_STUDENT))]
)
async def get_student_insights(
    offering_id: UUID = Query(None, description="Optional: scope to specific subject"),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """
    Generate personalized insights for the student.
    
    Insights include:
    - Bloom taxonomy patterns (recall vs application)
    - Exam consistency (internal vs external)
    - Unit-wise weaknesses
    - CO attainment patterns
    - Improvement trends
    """
    from app.services.insights import get_student_insights as get_insights
    
    # Get student USN from enrollment
    # Get student USN from student record
    student = db.query(Profile).filter(Profile.user_id == current_user.user_id).first()
    # Use Student model to get USN
    student_record = db.query(Student).filter(Student.user_id == current_user.user_id).first()
    
    if not student_record:
        raise HTTPException(status_code=404, detail="Student record not found")
    
    insights = await get_insights(db, student_record.usn, offering_id)
    
    return {
        "success": True,
        "data": insights,
        "count": len(insights)
    }


@router.get(
    "/student/topic-heatmap/{offering_id}",
    summary="Student Topic Weakness Heatmap",
    description="Get topic-wise performance for heatmap visualization. RBAC: DASHBOARD_STUDENT.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_STUDENT))]
)
async def get_student_topic_heatmap_endpoint(
    offering_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """
    Get student's topic-wise performance per unit.
    
    Returns:
    - Unit-wise breakdown with topics
    - Percentage scored per topic
    - Visual heatmap data for weak areas
    """
    from app.services.analytics.topic_coverage import get_student_topic_heatmap
    
    # Get student USN
    student = db.query(Student).filter(
        Student.user_id == current_user.user_id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")
    
    heatmap = await get_student_topic_heatmap(db, student.usn, offering_id)
    
    return {
        "success": True,
        "data": heatmap
    }


# ============================================================================
# NEW: STAFF VIEW OF STUDENT (Teacher/HOD/Principal)
# ============================================================================

@router.get(
    "/staff/student/{student_id}/performance",
    response_model=AnalyticsResponse,
    summary="Student Performance (Staff View)",
    description="View specific student's performance. RBAC: DASHBOARD_TEACHER/HOD/PRINCIPAL.",
    dependencies=[Depends(require_authenticated)]
)
async def get_student_performance_staff_view(
    student_id: UUID,
    regulation_year: int = Query(default=2021),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated),
    # Implicitly checked by ScopeResolver inside
):
    """
    Get academic performance for a specific student.
    Restricted by user scope (Teacher -> Assigned, HOD -> Dept, Principal -> All).
    """
    from app.core.scope import ScopeResolver, check_scope_access, AppRole
    from app.models import UserRole
    
    # Resolve user role
    user_role_entry = db.query(UserRole).filter(UserRole.user_id == current_user.user_id).first()
    role_enum = AppRole(user_role_entry.role) if user_role_entry else AppRole.STUDENT
    
    # Resolve scope
    scope = ScopeResolver.resolve(db, current_user, role_enum)
    
    # Get target student to check access (need USN and/or cohort)
    target_student = db.query(Student).filter(Student.user_id == student_id).first()
    if not target_student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Check access using USN (ScopeResolver logic needed)
    # ScopeResolver supports student_usns list or unrestricted
    # We check if this student's USN is in allowed list OR if user has broader access
    
    # Simplified Check:
    # 1. Principal -> Allow
    # 2. HOD -> Check if student's program dept matches HOD dept
    # 3. Teacher -> Check if student is in any cohort assigned to teacher?
    # ScopeResolver.check_scope_access can handle this if we pass cohort_id
    
    allowed, reason = check_scope_access(
        scope=scope,
        cohort_id=target_student.cohort_id,
        student_usn=target_student.usn
    )
    
    if not allowed:
        raise HTTPException(status_code=403, detail=f"Access denied: {reason}")

    return await StudentAnalyticsService.get_academic_performance(
        db=db,
        student_id=student_id,
        regulation_year=regulation_year
    )


@router.get(
    "/staff/student/{student_id}/co-profile/{offering_id}",
    response_model=AnalyticsResponse,
    summary="Student CO Profile (Staff View)",
    description="View specific student's CO profile. RBAC: DASHBOARD_TEACHER/HOD/PRINCIPAL.",
    dependencies=[Depends(require_authenticated)]
)
async def get_student_co_profile_staff_view(
    student_id: UUID,
    offering_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """
    Get CO attainment profile for a specific student in a subject.
    Restricted by user scope.
    """
    from app.core.scope import ScopeResolver, check_scope_access, AppRole
    from app.models import UserRole
    
    # Resolve user role
    user_role_entry = db.query(UserRole).filter(UserRole.user_id == current_user.user_id).first()
    role_enum = AppRole(user_role_entry.role) if user_role_entry else AppRole.STUDENT
    
    # Resolve scope
    scope = ScopeResolver.resolve(db, current_user, role_enum)
    
    # Get target student
    target_student = db.query(Student).filter(Student.user_id == student_id).first()
    if not target_student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Check access
    allowed, reason = check_scope_access(
        scope=scope,
        cohort_id=target_student.cohort_id,
        offering_id=offering_id, # Also check usage of this offering
        student_usn=target_student.usn
    )
    
    if not allowed:
        raise HTTPException(status_code=403, detail=f"Access denied: {reason}")
        
    return await StudentAnalyticsService.get_co_attainment_profile(
        db=db,
        student_id=student_id,
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
    """
    Get comprehensive question analysis for an exam.
    
    Shows:
    - Difficulty index per question/sub-question
    - Attempt percentages
    - Average marks
    - Bloom level correlation
    - Hardest/easiest questions
    """
    from app.services.analytics.question_analysis import get_exam_question_analysis
    
    analysis = await get_exam_question_analysis(db, exam_id)
    
    return {
        "success": True,
        "data": analysis
    }



@router.get(
    "/faculty/topic-coverage/{offering_id}",
    summary="Topic Coverage Analysis",
    description="Get topic coverage and performance for a subject. RBAC: DASHBOARD_TEACHER.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_TEACHER))]
)
async def get_faculty_topic_coverage(
    offering_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """
    Get topic coverage analysis for a subject offering.
    
    Shows:
    - Topics taught vs assessed
    - Student performance per topic
    - Gap analysis (unassessed topics)
    """
    from app.services.analytics.topic_coverage import get_topic_coverage
    
    try:
        coverage = await get_topic_coverage(db, offering_id)
        
        return {
            "success": True,
            "data": coverage
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Topic Coverage Error: {str(e)}")


@router.get(
    "/faculty/at-risk-students/{offering_id}",
    response_model=AnalyticsResponse,
    summary="At-Risk Students",
    description="Get at-risk students for a specific offering. RBAC: DASHBOARD_TEACHER.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_TEACHER))]
)
async def get_faculty_at_risk_students(
    offering_id: UUID,
    threshold: float = Query(default=50.0, ge=0, le=100, description="Percentage threshold (default 50%)"),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """
    Get at-risk students for teacher's assigned subject.
    
    Returns students below the threshold with:
    - USN and name
    - Current percentage
    - Risk reason (critical/needs attention)
    - Marks obtained vs max
    
    Scoped to teacher's assigned offerings only.
    """
    return await FacultyAnalyticsService.get_at_risk_students(
        db=db,
        offering_id=offering_id,
        teacher_id=current_user.user_id,
        threshold=threshold
    )




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


@router.get(
    "/hod/teacher-effectiveness",
    response_model=AnalyticsResponse,
    summary="Teacher Effectiveness",
    description="Get teacher effectiveness metrics. RBAC: DASHBOARD_HOD.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_HOD))]
)
async def get_hod_teacher_effectiveness(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """
    Get teacher effectiveness for HOD's department.
    
    Returns per teacher:
    - Assigned subjects count
    - Average CO attainment
    - Total students taught
    - Effectiveness rating (HIGH/MEDIUM/NEEDS_SUPPORT)
    """
    dept = db.query(Department).filter(
        Department.hod_id == current_user.user_id
    ).first()
    
    if not dept:
        raise HTTPException(status_code=404, detail="No department assigned")
    
    return await HODAnalyticsService.get_teacher_effectiveness(
        db=db,
        department_id=dept.id
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


@router.get(
    "/principal/comprehensive",
    response_model=AnalyticsResponse,
    summary="Comprehensive Analytics",
    description="Get all key metrics for institution management. RBAC: DASHBOARD_PRINCIPAL.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_PRINCIPAL))]
)
async def get_principal_comprehensive_analytics(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """
    Executive dashboard for principal.
    
    Returns:
    - Institution summary (depts, programs, students, teachers)
    - Department-wise breakdown with CO counts
    - Exam status (locked/pending)
    - Alerts (pending approvals, missing HODs)
    """
    return await PrincipalAnalyticsService.get_comprehensive_analytics(db=db)


@router.get(
    "/principal/accreditation-readiness",
    response_model=AnalyticsResponse,
    summary="Accreditation Readiness",
    description="NBA/NAAC compliance readiness score. RBAC: DASHBOARD_PRINCIPAL.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_PRINCIPAL))]
)
async def get_principal_accreditation_readiness(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """
    Check accreditation readiness for NBA/NAAC.
    
    Returns:
    - Overall readiness score
    - Component scores (CO, PO, marks)
    - Recommendations
    - Status (READY/NEEDS_ATTENTION/NOT_READY)
    """
    return await PrincipalAnalyticsService.get_accreditation_readiness(db=db)


@router.get(
    "/principal/year-on-year-trend",
    response_model=AnalyticsResponse,
    summary="Year-on-Year Trend",
    description="Get historical CO/PO attainment trends. RBAC: DASHBOARD_PRINCIPAL.",
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_PRINCIPAL))]
)
async def get_principal_year_on_year_trend(
    years: List[int] = Query(None, description="Years to analyze (defaults to last 5)"),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """
    Get year-on-year CO/PO attainment trends.
    
    Returns:
    - Yearly pass rates
    - Yearly CO attainment estimates
    - Overall trend direction (IMPROVING/STABLE/DECLINING)
    """
    from app.services.analytics.trends import get_year_on_year_trend
    return await get_year_on_year_trend(db=db, years=years)


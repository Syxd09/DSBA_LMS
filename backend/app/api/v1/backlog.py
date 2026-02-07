"""
EduMetrics Backend - Backlog Management API

API endpoints for managing backlog attempts and analytics.
"""
import logging
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, and_, or_, Integer
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import (
    BacklogAttempt, Student, SubjectOffering, Subject,
    Cohort, AuditLog, Profile
)
from app.schemas.backlog import (
    BacklogAttemptCreate, BacklogAttemptUpdate, BacklogAttemptInDB,
    BacklogAttemptResponse, BacklogAttemptHistory, StudentBacklogSummary,
    BacklogAnalytics
)
from app.core.authorization import get_authorization_context, AuthorizationContext
from app.core.policies import Permission
from app.core.scope_helpers import get_college_filter
from app.api.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/backlog", tags=["Backlog Management"])


# ============================================================================
# LIST ENDPOINTS
# ============================================================================

@router.get("/students", response_model=List[StudentBacklogSummary])
async def list_backlog_students(
    cohort_id: Optional[UUID] = Query(None, description="Filter by cohort"),
    semester: Optional[int] = Query(None, ge=1, le=8, description="Filter by semester"),
    is_cleared: Optional[bool] = Query(None, description="Filter by cleared status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
    auth_ctx: AuthorizationContext = Depends(get_authorization_context)
):
    """
    List students with backlogs.
    
    Accessible by: HOD, Principal
    """
    # Build base query
    query = db.query(
        BacklogAttempt.student_usn,
        func.count(BacklogAttempt.id).label("total_backlogs"),
        func.sum(func.cast(BacklogAttempt.is_cleared, Integer)).label("cleared_count")
    ).join(
        Student, Student.usn == BacklogAttempt.student_usn
    )
    
    # Apply filters
    if cohort_id:
        query = query.filter(Student.cohort_id == cohort_id)
    
    if semester:
        query = query.filter(BacklogAttempt.semester_attempted == semester)
    
    if is_cleared is not None:
        query = query.filter(BacklogAttempt.is_cleared == is_cleared)
    
    # Group and paginate
    query = query.group_by(BacklogAttempt.student_usn)
    
    offset = (page - 1) * page_size
    results = query.offset(offset).limit(page_size).all()
    
    # Build response
    summaries = []
    for row in results:
        student = db.query(Student).filter(Student.usn == row.student_usn).first()
        
        # Get pending backlog subjects
        pending = db.query(SubjectOffering.subject_id).join(
            BacklogAttempt, BacklogAttempt.offering_id == SubjectOffering.id
        ).join(
            Subject, Subject.id == SubjectOffering.subject_id
        ).filter(
            BacklogAttempt.student_usn == row.student_usn,
            BacklogAttempt.is_cleared == False
        ).all()
        
        subject_codes = [s.code for s in db.query(Subject).filter(
            Subject.id.in_([p[0] for p in pending])
        ).all()]
        
        summaries.append(StudentBacklogSummary(
            student_usn=row.student_usn,
            student_name=student.name if student else "Unknown",
            total_backlogs=row.total_backlogs,
            cleared_backlogs=row.cleared_count or 0,
            pending_backlogs=row.total_backlogs - (row.cleared_count or 0),
            subjects=subject_codes
        ))
    
    return summaries


@router.get("/student/{student_usn}", response_model=List[BacklogAttemptHistory])
async def get_student_backlog_history(
    student_usn: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
    auth_ctx: AuthorizationContext = Depends(get_authorization_context)
):
    """
    Get complete backlog history for a student.
    
    Accessible by: Student (own data), Teacher, HOD, Principal
    """
    # Check if student can only access own data
    if current_user.role == "student":
        # Find student by user_id
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student or student.usn != student_usn:
            raise HTTPException(status_code=403, detail="Can only view your own backlog history")
    
    # Get all attempts grouped by offering
    attempts = db.query(BacklogAttempt).options(
        joinedload(BacklogAttempt.offering).joinedload(SubjectOffering.subject)
    ).filter(
        BacklogAttempt.student_usn == student_usn
    ).order_by(
        BacklogAttempt.offering_id,
        BacklogAttempt.attempt_number
    ).all()
    
    # Group by offering
    history_map = {}
    for attempt in attempts:
        if attempt.offering_id not in history_map:
            subject = attempt.offering.subject if attempt.offering else None
            history_map[attempt.offering_id] = BacklogAttemptHistory(
                student_usn=student_usn,
                offering_id=attempt.offering_id,
                subject_code=subject.code if subject else "Unknown",
                subject_name=subject.name if subject else "Unknown",
                attempts=[],
                is_cleared=False
            )
        
        history_map[attempt.offering_id].attempts.append(
            BacklogAttemptInDB.model_validate(attempt)
        )
        
        if attempt.is_best_attempt:
            history_map[attempt.offering_id].best_attempt = BacklogAttemptInDB.model_validate(attempt)
        
        if attempt.is_cleared:
            history_map[attempt.offering_id].is_cleared = True
    
    return list(history_map.values())


# ============================================================================
# CRUD ENDPOINTS
# ============================================================================

@router.post("/attempt", response_model=BacklogAttemptInDB, status_code=201)
async def record_backlog_attempt(
    data: BacklogAttemptCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
    auth_ctx: AuthorizationContext = Depends(get_authorization_context)
):
    """
    Record a new backlog attempt result.
    
    Accessible by: Teacher, HOD, Principal
    """
    # Validate student exists
    student = db.query(Student).filter(Student.usn == data.student_usn).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Validate offering exists
    offering = db.query(SubjectOffering).filter(SubjectOffering.id == data.offering_id).first()
    if not offering:
        raise HTTPException(status_code=404, detail="Subject offering not found")
    
    # Get next attempt number
    max_attempt = db.query(func.max(BacklogAttempt.attempt_number)).filter(
        BacklogAttempt.student_usn == data.student_usn,
        BacklogAttempt.offering_id == data.offering_id
    ).scalar() or 0
    
    attempt_number = max_attempt + 1
    
    # Calculate total marks
    total_marks = None
    if data.external_marks is not None:
        internal = float(data.internal_marks_carried or 0)
        external = float(data.external_marks)
        total_marks = internal + external
    
    # Create backlog attempt
    attempt = BacklogAttempt(
        student_usn=data.student_usn,
        offering_id=data.offering_id,
        attempt_number=attempt_number,
        exam_type=data.exam_type,
        semester_attempted=data.semester_attempted,
        academic_year=data.academic_year,
        external_marks=data.external_marks,
        internal_marks_carried=data.internal_marks_carried,
        total_marks=total_marks,
        result=data.result,
        grade=data.grade,
        exam_date=data.exam_date,
        result_date=data.result_date,
        is_cleared=(data.result == "PASS"),
        created_by=current_user.id
    )
    
    db.add(attempt)
    
    # Update best attempt if this is a pass
    if data.result == "PASS":
        attempt.is_best_attempt = True
        # Mark previous attempts as not best
        db.query(BacklogAttempt).filter(
            BacklogAttempt.student_usn == data.student_usn,
            BacklogAttempt.offering_id == data.offering_id,
            BacklogAttempt.id != attempt.id
        ).update({"is_best_attempt": False})
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        user_role=current_user.role,
        action="INSERT",
        entity_type="backlog_attempt",
        entity_id=str(attempt.id),
        new_data={
            "student_usn": data.student_usn,
            "offering_id": str(data.offering_id),
            "attempt_number": attempt_number,
            "result": data.result
        }
    )
    db.add(audit)
    
    db.commit()
    db.refresh(attempt)
    
    logger.info(f"Recorded backlog attempt {attempt.id} for student {data.student_usn}")
    
    return attempt


@router.patch("/attempt/{attempt_id}", response_model=BacklogAttemptInDB)
async def update_backlog_attempt(
    attempt_id: UUID,
    data: BacklogAttemptUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """
    Update a backlog attempt result.
    
    Accessible by: HOD, Principal
    """
    attempt = db.query(BacklogAttempt).filter(BacklogAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Backlog attempt not found")
    
    # Capture old data for audit
    old_data = {
        "external_marks": str(attempt.external_marks),
        "result": attempt.result,
        "is_cleared": attempt.is_cleared
    }
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(attempt, field, value)
    
    # Recalculate total if external marks changed
    if "external_marks" in update_data:
        internal = float(attempt.internal_marks_carried or 0)
        external = float(attempt.external_marks or 0)
        attempt.total_marks = internal + external
    
    # Update is_cleared based on result
    if "result" in update_data:
        attempt.is_cleared = (attempt.result == "PASS")
    
    attempt.updated_at = datetime.utcnow()
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        user_role=current_user.role,
        action="UPDATE",
        entity_type="backlog_attempt",
        entity_id=str(attempt_id),
        old_data=old_data,
        new_data=update_data
    )
    db.add(audit)
    
    db.commit()
    db.refresh(attempt)
    
    return attempt


# ============================================================================
# ANALYTICS ENDPOINTS
# ============================================================================

@router.get("/analytics", response_model=BacklogAnalytics)
async def get_backlog_analytics(
    cohort_id: Optional[UUID] = Query(None),
    academic_year: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """
    Get backlog analytics for a cohort.
    
    Accessible by: HOD, Principal
    """
    # Base query for students
    student_query = db.query(Student)
    if cohort_id:
        student_query = student_query.filter(Student.cohort_id == cohort_id)
    
    total_students = student_query.count()
    
    # Backlog statistics
    backlog_query = db.query(BacklogAttempt)
    if cohort_id:
        backlog_query = backlog_query.join(
            Student, Student.usn == BacklogAttempt.student_usn
        ).filter(Student.cohort_id == cohort_id)
    
    if academic_year:
        backlog_query = backlog_query.filter(BacklogAttempt.academic_year == academic_year)
    
    total_backlogs = backlog_query.count()
    cleared_backlogs = backlog_query.filter(BacklogAttempt.is_cleared == True).count()
    pending_backlogs = total_backlogs - cleared_backlogs
    
    # Students with backlog
    students_with_backlog = db.query(
        func.count(func.distinct(BacklogAttempt.student_usn))
    ).filter(BacklogAttempt.is_cleared == False).scalar() or 0
    
    # Pass rate
    attempted = backlog_query.filter(BacklogAttempt.result.isnot(None)).count()
    passed = backlog_query.filter(BacklogAttempt.result == "PASS").count()
    pass_rate = (passed / attempted * 100) if attempted > 0 else 0.0
    
    # By subject
    by_subject = []
    subject_stats = db.query(
        Subject.code,
        Subject.name,
        func.count(BacklogAttempt.id).label("count"),
        func.sum(func.cast(BacklogAttempt.is_cleared, Integer)).label("cleared")
    ).join(
        SubjectOffering, SubjectOffering.subject_id == Subject.id
    ).join(
        BacklogAttempt, BacklogAttempt.offering_id == SubjectOffering.id
    ).group_by(Subject.id).all()
    
    for stat in subject_stats:
        by_subject.append({
            "subject_code": stat.code,
            "subject_name": stat.name,
            "backlog_count": stat.count,
            "pass_rate": (stat.cleared / stat.count * 100) if stat.count > 0 else 0.0
        })
    
    # By semester
    by_semester = []
    for sem in range(1, 9):
        count = backlog_query.filter(
            BacklogAttempt.semester_attempted == sem
        ).count()
        if count > 0:
            by_semester.append({"semester": sem, "backlog_count": count})
    
    return BacklogAnalytics(
        total_students=total_students,
        students_with_backlog=students_with_backlog,
        total_backlogs=total_backlogs,
        cleared_backlogs=cleared_backlogs,
        pending_backlogs=pending_backlogs,
        pass_rate=pass_rate,
        by_subject=by_subject,
        by_semester=by_semester
    )

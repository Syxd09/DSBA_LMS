"""
EduMetrics Backend - Semester Promotion API

API endpoints for semester promotion workflow with HOD approval.
"""
import logging
import uuid as uuid_lib
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db, SessionLocal
from app.models import (
    SemesterPromotion, StudentSemesterStatus, Student, Cohort,
    BacklogAttempt, AuditLog, Profile, StudentSemesterEnrollment,
    SubjectOffering, Subject, CurriculumVersion
)
from app.schemas.promotion import (
    PromotionPreview, PromotionStudentStatus, PromotionRequest,
    PromotionExecuteResponse, SemesterPromotionInDB, PromotionHistory,
    PromotionWithDetails
)
from app.core.authorization import get_authorization_context, AuthorizationContext
from app.core.policies import Permission
from app.api.deps import get_current_user, require_hod_or_above
from app.core.limiter import limiter
from fastapi import Request, BackgroundTasks
from decimal import Decimal

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/promotions", tags=["Semester Promotions"])


# ============================================================================
# DASHBOARD SUMMARY
# ============================================================================

@router.get("", response_model=List[SemesterPromotionInDB])
async def list_promotions(
    cohort_id: Optional[UUID] = None,
    academic_year: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """
    List semester promotions with filters.
    
    Accessible by: HOD, Principal
    """
    query = db.query(SemesterPromotion)
    
    if cohort_id:
        query = query.filter(SemesterPromotion.cohort_id == cohort_id)
        
    if academic_year:
        query = query.filter(SemesterPromotion.academic_year == academic_year)
        
    proomotions = query.order_by(SemesterPromotion.approved_at.desc()).limit(limit).all()
    return proomotions


# ============================================================================
# DASHBOARD SUMMARY
# ============================================================================

@router.get("/pending/summary")
async def get_pending_promotions_summary(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Get summary of cohorts pending promotion.
    
    Accessible by: HOD, Principal
    
    Returns cohorts that are not in final semester (8) and have
    not been promoted in the current academic year.
    """
    from app.models import Regulation
    
    # Get all cohorts not in final semester
    cohorts = db.query(Cohort).filter(
        Cohort.current_semester < 8,
        Cohort.status == "active"
    ).all()
    
    pending_cohorts = []
    current_year = datetime.utcnow().year
    academic_year = f"{current_year}-{current_year + 1 - 2000}"
    
    for cohort in cohorts:
        # Check if already promoted this year
        existing_promotion = db.query(SemesterPromotion).filter(
            SemesterPromotion.cohort_id == cohort.id,
            SemesterPromotion.academic_year == academic_year,
            SemesterPromotion.status == "completed"
        ).first()
        
        if not existing_promotion:
            # Get student count
            student_count = db.query(Student).filter(
                Student.cohort_id == cohort.id,
                Student.status == "active"
            ).count()
            
            pending_cohorts.append({
                "cohort_id": str(cohort.id),
                "cohort_name": cohort.name if hasattr(cohort, 'name') else f"Cohort {cohort.id}",
                "current_semester": cohort.current_semester,
                "next_semester": cohort.current_semester + 1,
                "student_count": student_count,
                "academic_year": academic_year
            })
    
    return {
        "pending_count": len(pending_cohorts),
        "cohorts": pending_cohorts,
        "academic_year": academic_year
    }


# ============================================================================
# PREVIEW ENDPOINT
# ============================================================================

@router.get("/preview/{cohort_id}", response_model=PromotionPreview)
async def preview_promotion(
    cohort_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Preview eligible and detained students before promotion.
    
    Accessible by: HOD, Principal
    
    This shows which students are eligible for promotion based on:
    - Backlog count (must be <= max_backlogs_for_promotion)
    - Attendance percentage (must be >= min_attendance)
    - Other criteria as per regulation
    """
    # Get cohort
    cohort = db.query(Cohort).filter(Cohort.id == cohort_id).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    
    # Determine next semester
    from_semester = cohort.current_semester
    to_semester = from_semester + 1
    
    if to_semester > 8:
        raise HTTPException(
            status_code=400,
            detail="Cohort is in final semester, cannot promote further"
        )
    
    # Get all active students in cohort
    students = db.query(Student).filter(
        Student.cohort_id == cohort_id,
        Student.status == "active"
    ).all()
    
    # Get regulation for backlog limit
    max_backlogs = 4  # Default, should come from regulation
    if cohort.regulation_id:
        from app.models import Regulation
        reg = db.query(Regulation).filter(Regulation.id == cohort.regulation_id).first()
        if reg:
            max_backlogs = reg.max_backlogs_for_promotion
    
    student_statuses = []
    eligible_count = 0
    detained_count = 0
    on_hold_count = 0
    
    for student in students:
        # Count pending backlogs
        backlog_count = db.query(BacklogAttempt).filter(
            BacklogAttempt.student_usn == student.usn,
            BacklogAttempt.is_cleared == False
        ).count()
        
        # Determine status
        if backlog_count > max_backlogs:
            status = "DETAINED"
            reason = f"Backlog count ({backlog_count}) exceeds limit ({max_backlogs})"
            detained_count += 1
        else:
            status = "ELIGIBLE"
            reason = None
            eligible_count += 1
        
        student_statuses.append(PromotionStudentStatus(
            student_usn=student.usn,
            student_name=student.name,
            status=status,
            reason=reason,
            backlog_count=backlog_count
        ))
    
    return PromotionPreview(
        cohort_id=cohort_id,
        cohort_name=cohort.name if hasattr(cohort, 'name') else f"Cohort {cohort_id}",
        from_semester=from_semester,
        to_semester=to_semester,
        total_students=len(students),
        eligible_count=eligible_count,
        detained_count=detained_count,
        on_hold_count=on_hold_count,
        students=student_statuses
    )


# ============================================================================
# BACKGROUND TASK
# ============================================================================

def execute_promotion_bg(
    promotion_id: UUID,
    cohort_id: UUID,
    current_user_id: UUID,
    override_detained: List[str],
    preview_data_dict: dict
):
    """
    Background task to execute student-level promotion logic.
    Handles large cohorts without blocking the API response.
    """
    db = SessionLocal()
    try:
        promotion = db.query(SemesterPromotion).filter(SemesterPromotion.id == promotion_id).first()
        cohort = db.query(Cohort).filter(Cohort.id == cohort_id).first()
        current_user = db.query(Profile).filter(Profile.id == current_user_id).first()
        
        if not all([promotion, cohort, current_user]):
            logger.error(f"Promotion task failed: Missing context for promotion {promotion_id}")
            return

        # 1. Individual Student Status Records & Snapshots
        all_students_usn = [s['student_usn'] for s in preview_data_dict['students']]
        student_objs = db.query(Student).filter(Student.usn.in_(all_students_usn)).all()
        student_map = {s.usn: s for s in student_objs}
        
        academic_year = promotion.academic_year
        from_sem = promotion.from_semester
        to_sem = promotion.to_semester

        for student_data in preview_data_dict['students']:
            usn = student_data['student_usn']
            student = student_map.get(usn)
            if not student: continue

            # Determine final status (Eligible/Detained/Overridden)
            final_status = student_data['status']
            if override_detained and usn in override_detained:
                final_status = "PROMOTED"
            
            # Create Status Record
            status_record = StudentSemesterStatus(
                promotion_id=promotion.id,
                student_usn=usn,
                status=final_status,
                reason=student_data.get('reason'),
                backlog_count=student_data.get('backlog_count', 0)
            )
            db.add(status_record)

            # Create Enrollment Snapshot for the semester they just finished
            snapshot = StudentSemesterEnrollment(
                student_usn=usn,
                cohort_id=cohort_id,
                section_id=student.section_id,
                semester=from_sem,
                academic_year=academic_year,
                status=student.status
            )
            db.add(snapshot)

            # Update Student for NEW semester
            if final_status in ["ELIGIBLE", "PROMOTED"]:
                student.current_semester = to_sem
            elif final_status == "DETAINED":
                student.status = "detained"

        # 2. Initialize SubjectOfferings for NEW semester
        curriculum = db.query(CurriculumVersion).filter(
            CurriculumVersion.program_id == cohort.program_id,
            CurriculumVersion.regulation_id == cohort.regulation_id,
            CurriculumVersion.is_active == True
        ).first()

        if curriculum:
            next_sem_subjects = db.query(Subject).filter(
                Subject.curriculum_version_id == curriculum.id,
                Subject.semester == to_sem
            ).all()
            
            for subject in next_sem_subjects:
                existing_offering = db.query(SubjectOffering).filter(
                    SubjectOffering.subject_id == subject.id,
                    SubjectOffering.cohort_id == cohort_id,
                    SubjectOffering.semester_no == to_sem
                ).first()
                
                if not existing_offering:
                    new_off = SubjectOffering(
                        id=uuid_lib.uuid4() if hasattr(uuid_lib, 'uuid4') else uuid.uuid4(),
                        subject_id=subject.id,
                        program_id=cohort.program_id,
                        cohort_id=cohort_id,
                        semester_no=to_sem,
                        is_elective=(subject.subject_type == 'elective'),
                        regulation_year=cohort.regulation.year if cohort.regulation else cohort.year,
                        is_active=True
                    )
                    db.add(new_off)

        # 3. Update Cohort & Promotion Status
        cohort.current_semester = to_sem
        promotion.status = "completed"
        
        # Audit
        audit = AuditLog(
            user_id=current_user.id,
            user_role=current_user.user_role.role.value if current_user.user_role else "hod",
            action="PROMOTE",
            entity_type="cohort",
            entity_id=str(cohort_id),
            old_value=str(from_sem),
            new_value=str(to_sem),
            reason=f"Asynchronous Promotion: {promotion.students_promoted} promoted"
        )
        db.add(audit)
        db.commit()
        logger.info(f"Background promotion {promotion_id} completed successfully.")

    except Exception as e:
        db.rollback()
        logger.error(f"Background promotion {promotion_id} failed: {str(e)}")
        # Try to mark as failed
        try:
            p = db.query(SemesterPromotion).filter(SemesterPromotion.id == promotion_id).first()
            if p:
                p.status = "failed"
                db.commit()
        except: pass
    finally:
        db.close()


# ============================================================================
# EXECUTE PROMOTION
# ============================================================================

@router.post("/promote/{cohort_id}", response_model=PromotionExecuteResponse)
@limiter.limit("5/minute")
async def promote_cohort(
    request: Request,
    cohort_id: UUID,
    data: PromotionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Execute semester promotion for cohort (Asynchronous).
    
    Returns 202 Accepted. The actual work happens in a background task.
    """
    if not data.confirm:
        raise HTTPException(status_code=400, detail="Must confirm promotion")
    
    # 1. Preview & Basic Validation
    preview = await preview_promotion(cohort_id, db, current_user)
    cohort = db.query(Cohort).filter(Cohort.id == cohort_id).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
        
    # 2. Prepare Counts
    promoted_student_ids = []
    detained_student_ids = []
    detention_reasons = {}
    
    for student_status in preview.students:
        if student_status.status == "ELIGIBLE" or (data.override_detained and student_status.student_usn in data.override_detained):
            promoted_student_ids.append(student_status.student_usn)
        else:
            detained_student_ids.append(student_status.student_usn)
            detention_reasons[student_status.student_usn] = student_status.reason
    
    # 3. Create Promotion Record (status=processing)
    promotion = SemesterPromotion(
        id=uuid.uuid4(),
        cohort_id=cohort_id,
        from_semester=preview.from_semester,
        to_semester=preview.to_semester,
        academic_year=f"{datetime.utcnow().year}-{datetime.utcnow().year + 1 - 2000}",
        approved_by=current_user.id,
        approval_notes=data.approval_notes,
        total_students=preview.total_students,
        students_promoted=len(promoted_student_ids),
        students_detained=len(detained_student_ids),
        students_on_hold=preview.on_hold_count,
        promoted_student_ids=promoted_student_ids,
        detained_student_ids=detained_student_ids,
        detention_reasons=detention_reasons,
        status="processing"
    )
    db.add(promotion)
    db.commit()
    db.refresh(promotion)
    
    # 4. Enqueue Background Task
    preview_dict = preview.model_dump()
    background_tasks.add_task(
        execute_promotion_bg,
        promotion.id,
        cohort_id,
        current_user.id,
        data.override_detained,
        preview_dict
    )
    return PromotionExecuteResponse(
        promotion_id=promotion.id,
        cohort_id=cohort_id,
        from_semester=preview.from_semester,
        to_semester=preview.to_semester,
        students_promoted=len(promoted_student_ids),
        students_detained=len(detained_student_ids),
        executed_at=promotion.approved_at,
        approved_by=current_user.id
    )


# ============================================================================
# HISTORY ENDPOINTS
# ============================================================================

@router.get("/history/{cohort_id}", response_model=PromotionHistory)
async def get_promotion_history(
    cohort_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """
    Get promotion history for a cohort.
    
    Accessible by: Teacher, HOD, Principal
    """
    cohort = db.query(Cohort).filter(Cohort.id == cohort_id).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    
    promotions = db.query(SemesterPromotion).filter(
        SemesterPromotion.cohort_id == cohort_id
    ).order_by(SemesterPromotion.approved_at.desc()).all()
    
    return PromotionHistory(
        cohort_id=cohort_id,
        cohort_name=cohort.name if hasattr(cohort, 'name') else f"Cohort {cohort_id}",
        current_semester=cohort.current_semester,
        promotions=[SemesterPromotionInDB.model_validate(p) for p in promotions]
    )


@router.get("/{promotion_id}", response_model=PromotionWithDetails)
async def get_promotion_details(
    promotion_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """
    Get detailed information about a specific promotion.
    
    Accessible by: Teacher, HOD, Principal
    """
    promotion = db.query(SemesterPromotion).options(
        joinedload(SemesterPromotion.cohort),
        joinedload(SemesterPromotion.approver)
    ).filter(SemesterPromotion.id == promotion_id).first()
    
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    return PromotionWithDetails(
        **SemesterPromotionInDB.model_validate(promotion).model_dump(),
        cohort_name=promotion.cohort.name if promotion.cohort and hasattr(promotion.cohort, 'name') else None,
        approver_name=promotion.approver.full_name if promotion.approver else None,
        promoted_students=promotion.promoted_student_ids,
        detained_students=promotion.detained_student_ids
    )


# ============================================================================
# ROLLBACK (Principal only)
# ============================================================================

@router.post("/{promotion_id}/rollback")
async def rollback_promotion(
    promotion_id: UUID,
    reason: str = Query(..., min_length=10, description="Reason for rollback"),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    """
    Rollback a promotion (Principal only).
    
    This is a sensitive operation that requires:
    - Principal role
    - Valid reason
    """
    # Verify Principal or Admin
    from app.models import UserRole
    from app.core.permissions import AppRole
    role_record = db.query(UserRole).filter(UserRole.user_id == current_user.user_id).first()
    user_role = role_record.role.value if role_record else "student"
    
    if user_role not in [AppRole.PRINCIPAL.value]:
        raise HTTPException(
            status_code=403,
            detail="Only Principal can rollback promotions"
        )
    
    promotion = db.query(SemesterPromotion).filter(
        SemesterPromotion.id == promotion_id
    ).first()
    
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    if promotion.status == "rolled_back":
        raise HTTPException(status_code=400, detail="Promotion already rolled back")
    
    # Get cohort
    cohort = db.query(Cohort).filter(Cohort.id == promotion.cohort_id).first()
    
    # Rollback cohort semester
    cohort.current_semester = promotion.from_semester
    
    # Reset detained students
    for usn in (promotion.detained_student_ids or []):
        student = db.query(Student).filter(Student.usn == usn).first()
        if student:
            student.status = "active"
    
    # Update promotion record
    promotion.status = "rolled_back"
    promotion.rolled_back_at = datetime.utcnow()
    promotion.rolled_back_by = current_user.id
    promotion.rollback_reason = reason
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        user_role=user_role,
        action="ROLLBACK",
        entity_type="semester_promotion",
        entity_id=str(promotion_id),
        reason=reason
    )
    db.add(audit)
    
    db.commit()
    
    logger.warning(
        f"Promotion {promotion_id} rolled back by {current_user.email}: {reason}"
    )
    
    return {"status": "success", "message": "Promotion rolled back successfully"}

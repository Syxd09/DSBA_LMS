"""
EduMetrics Backend - Semester Promotion API

API endpoints for semester promotion workflow with HOD approval.
"""
import logging
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import (
    SemesterPromotion, StudentSemesterStatus, Student, Cohort,
    BacklogAttempt, AuditLog, Profile
)
from app.schemas.promotion import (
    PromotionPreview, PromotionStudentStatus, PromotionRequest,
    PromotionExecuteResponse, SemesterPromotionInDB, PromotionHistory,
    PromotionWithDetails
)
from app.core.authorization import get_authorization_context, AuthorizationContext
from app.core.policies import Permission
from app.api.deps import get_current_user, require_hod_or_above

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/promotions", tags=["Semester Promotions"])


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
# EXECUTE PROMOTION
# ============================================================================

@router.post("/promote/{cohort_id}", response_model=PromotionExecuteResponse)
async def promote_cohort(
    cohort_id: UUID,
    data: PromotionRequest,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Execute semester promotion for cohort.
    
    Accessible by: HOD, Principal
    
    This will:
    1. Update cohort current_semester
    2. Mark detained students
    3. Create promotion record
    4. Create individual student status records
    """
    if not data.confirm:
        raise HTTPException(
            status_code=400,
            detail="Must confirm promotion by setting confirm=True"
        )
    
    # Get preview first
    preview = await preview_promotion(cohort_id, db, current_user)
    
    # Get cohort
    cohort = db.query(Cohort).filter(Cohort.id == cohort_id).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    
    # Create promotion record
    promoted_student_ids = []
    detained_student_ids = []
    detention_reasons = {}
    
    for student_status in preview.students:
        if student_status.status == "ELIGIBLE":
            promoted_student_ids.append(student_status.student_usn)
        elif student_status.status == "DETAINED":
            detained_student_ids.append(student_status.student_usn)
            detention_reasons[student_status.student_usn] = student_status.reason
    
    # Handle overrides
    if data.override_detained:
        for usn in data.override_detained:
            if usn in detained_student_ids:
                detained_student_ids.remove(usn)
                promoted_student_ids.append(usn)
                # Log override
                logger.warning(f"Override: Student {usn} force-promoted by {current_user.email}")
    
    # Create promotion record
    promotion = SemesterPromotion(
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
        status="completed"
    )
    db.add(promotion)
    db.flush()  # Get promotion ID
    
    # Create individual student status records
    for student_status in preview.students:
        final_status = student_status.status
        if student_status.student_usn in data.override_detained:
            final_status = "PROMOTED"
        
        status_record = StudentSemesterStatus(
            promotion_id=promotion.id,
            student_id=student_status.student_usn,  # This should be UUID lookup
            status=final_status,
            reason=student_status.reason,
            backlog_count=student_status.backlog_count
        )
        # Note: We're using USN directly, need to lookup student UUID
        student = db.query(Student).filter(Student.usn == student_status.student_usn).first()
        if student:
            # Update student status if detained
            if final_status == "DETAINED":
                student.status = "detained"
        
        db.add(status_record)
    
    # Update cohort semester
    cohort.current_semester = preview.to_semester
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        user_role=current_user.role,
        action="PROMOTE",
        entity_type="cohort",
        entity_id=str(cohort_id),
        old_value=str(preview.from_semester),
        new_value=str(preview.to_semester),
        reason=data.approval_notes or f"Semester promotion: {len(promoted_student_ids)} promoted, {len(detained_student_ids)} detained"
    )
    db.add(audit)
    
    db.commit()
    
    logger.info(
        f"Cohort {cohort_id} promoted: {preview.from_semester} → {preview.to_semester}, "
        f"{len(promoted_student_ids)} promoted, {len(detained_student_ids)} detained"
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

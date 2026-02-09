"""
EduMetrics Backend - Cohorts Router
Cohort management endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
import uuid as uuid_lib

from app.database import get_db
from app.api.deps import require_authenticated, require_hod_or_above
from app.models import Profile, Cohort, Program, StudentEnrollment, Exam
from app.schemas import CohortCreate, CohortUpdate, CohortResponse

router = APIRouter(prefix="/cohorts", tags=["Cohorts"])


@router.get("", response_model=List[CohortResponse])
async def list_cohorts(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated),
    program_id: UUID = None
):
    """List all cohorts."""
    query = db.query(Cohort).options(
        joinedload(Cohort.program),
        joinedload(Cohort.sections)
    )
    if program_id:
        query = query.filter(Cohort.program_id == program_id)
    cohorts = query.order_by(Cohort.year.desc()).all()
    
    for cohort in cohorts:
        cohort.student_count = db.query(StudentEnrollment).filter(StudentEnrollment.cohort_id == cohort.id).count()
        cohort.exam_count = db.query(Exam).filter(Exam.cohort_id == cohort.id).count()
        
    return cohorts


@router.post("", response_model=CohortResponse, status_code=status.HTTP_201_CREATED)
async def create_cohort(
    cohort: CohortCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Create a new cohort."""
    # Verify program exists
    program = db.query(Program).filter(Program.id == cohort.program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    new_cohort = Cohort(
        id=uuid_lib.uuid4(),
        program_id=cohort.program_id,
        year=cohort.year,
        name=cohort.name,
        current_semester=cohort.current_semester
    )
    db.add(new_cohort)
    db.commit()
    db.refresh(new_cohort)
    return new_cohort


@router.get("/{cohort_id}", response_model=CohortResponse)
async def get_cohort(
    cohort_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get cohort by ID."""
    cohort = db.query(Cohort).filter(Cohort.id == cohort_id).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    return cohort


@router.put("/{cohort_id}", response_model=CohortResponse)
async def update_cohort(
    cohort_id: UUID,
    cohort: CohortUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Update cohort."""
    db_cohort = db.query(Cohort).filter(Cohort.id == cohort_id).first()
    if not db_cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    
    if cohort.name:
        db_cohort.name = cohort.name
    if cohort.current_semester:
        db_cohort.current_semester = cohort.current_semester
    
    db.commit()
    db.refresh(db_cohort)
    return db_cohort


@router.delete("/{cohort_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cohort(
    cohort_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Delete cohort and all associated students with their login accounts.
    
    This performs a full cascade:
    1. Delete all student Profile/UserRole accounts in the cohort
    2. Delete Student records (ORM cascade handles marks)
    3. Delete Cohort
    """
    from app.models import UserRole
    
    cohort = db.query(Cohort).filter(Cohort.id == cohort_id).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    
    # FIX: Delete linked login accounts (Profile + UserRole) for all students
    students_in_cohort = db.query(Student).filter(Student.cohort_id == cohort_id).all()
    for student in students_in_cohort:
        if student.user_id:
            db.query(UserRole).filter(UserRole.user_id == student.user_id).delete()
            db.query(Profile).filter(Profile.user_id == student.user_id).delete()
    
    # Delete Cohort (Student cascade handles marks, exams via ORM)
    db.delete(cohort)
    db.commit()


# ============================================================================
# SEMESTER PROMOTION (PHASE 3 CRITICAL)
# ============================================================================

from datetime import datetime
from app.models import AuditLog, Student


@router.post("/{cohort_id}/promote", response_model=dict)
async def promote_cohort_semester(
    cohort_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Promote cohort to next semester (HOD only).
    
    RULES:
    - Odd-Even semester system strictly followed
    - Semester promotion only via HOD approval
    - All students in cohort are promoted together
    - Audit log created for compliance
    
    STATUS TRANSITIONS:
    - For active cohorts: increment current_semester
    - If current_semester >= program.duration_semesters: mark as 'completed'
    """
    import uuid as uuid_lib
    
    cohort = db.query(Cohort).filter(Cohort.id == cohort_id).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    
    if cohort.status != "active":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot promote cohort with status '{cohort.status}'. Must be 'active'."
        )
    
    # Get program to check max semesters
    program = db.query(Program).filter(Program.id == cohort.program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    old_semester = cohort.current_semester
    new_semester = old_semester + 1
    
    # Check if cohort has completed program
    if new_semester > program.duration_semesters:
        cohort.status = "completed"
        status_message = f"Cohort completed program after semester {old_semester}"
    else:
        cohort.current_semester = new_semester
        status_message = f"Promoted from semester {old_semester} to {new_semester}"
    
    # Update all students in cohort (if using Student model)
    students_updated = db.query(Student).filter(
        Student.cohort_id == cohort_id
    ).update({"current_semester": new_semester})
    
    # Audit log
    audit_log = AuditLog(
        id=uuid_lib.uuid4(),
        user_id=current_user.user_id,
        action="COHORT_PROMOTE",
        entity_type="cohort",
        entity_id=str(cohort_id),
        old_value=str(old_semester),
        new_value=str(new_semester),
        reason=f"HOD approved semester promotion for cohort {cohort.name}"
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(cohort)
    
    return {
        "success": True,
        "cohort_id": str(cohort_id),
        "cohort_name": cohort.name,
        "old_semester": old_semester,
        "new_semester": new_semester if cohort.status == "active" else None,
        "status": cohort.status,
        "students_updated": students_updated,
        "message": status_message,
        "promoted_by": str(current_user.user_id),
        "promoted_at": datetime.utcnow().isoformat()
    }


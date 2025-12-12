"""
EduMetrics Backend - Enrollments Router
Student enrollment management endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
import uuid as uuid_lib

from app.database import get_db
from app.api.deps import require_authenticated, require_hod_or_above
from app.models import Profile, StudentEnrollment, Cohort
from app.schemas import StudentEnrollmentCreate, StudentEnrollmentResponse

router = APIRouter(prefix="/enrollments", tags=["Enrollments"])


@router.get("", response_model=List[StudentEnrollmentResponse])
async def list_enrollments(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated),
    cohort_id: UUID = None,
    student_id: UUID = None
):
    """List student enrollments."""
    query = db.query(StudentEnrollment)
    if cohort_id:
        query = query.filter(StudentEnrollment.cohort_id == cohort_id)
    if student_id:
        query = query.filter(StudentEnrollment.student_id == student_id)
    enrollments = query.order_by(StudentEnrollment.roll_number).all()
    return enrollments


@router.post("", response_model=StudentEnrollmentResponse, status_code=status.HTTP_201_CREATED)
async def create_enrollment(
    enrollment: StudentEnrollmentCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Create a new student enrollment."""
    # Check cohort exists
    cohort = db.query(Cohort).filter(Cohort.id == enrollment.cohort_id).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    
    # Check for duplicate roll number
    existing = db.query(StudentEnrollment).filter(
        StudentEnrollment.roll_number == enrollment.roll_number
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Roll number already exists")
    
    new_enrollment = StudentEnrollment(
        id=uuid_lib.uuid4(),
        student_id=enrollment.student_id,
        cohort_id=enrollment.cohort_id,
        roll_number=enrollment.roll_number,
        status=enrollment.status
    )
    db.add(new_enrollment)
    db.commit()
    db.refresh(new_enrollment)
    return new_enrollment


@router.get("/{enrollment_id}", response_model=StudentEnrollmentResponse)
async def get_enrollment(
    enrollment_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get enrollment by ID."""
    enrollment = db.query(StudentEnrollment).filter(StudentEnrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    return enrollment


@router.delete("/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_enrollment(
    enrollment_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Delete enrollment."""
    enrollment = db.query(StudentEnrollment).filter(StudentEnrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    db.delete(enrollment)
    db.commit()

"""
EduMetrics Backend - Assignments Router
Teacher assignment management endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
import uuid as uuid_lib

from app.database import get_db
from app.api.deps import require_authenticated, require_hod_or_above, get_user_role
from app.models import Profile, TeacherAssignment, Subject, Cohort
from app.schemas import TeacherAssignmentCreate, TeacherAssignmentResponse

router = APIRouter(prefix="/assignments", tags=["Assignments"])


@router.get("", response_model=List[TeacherAssignmentResponse])
async def list_assignments(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated),
    role: str = Depends(get_user_role),
    teacher_id: UUID = None,
    subject_id: UUID = None,
    cohort_id: UUID = None,
    offering_id: UUID = None
):
    """List teacher assignments."""
    query = db.query(TeacherAssignment).options(
        joinedload(TeacherAssignment.teacher),
        joinedload(TeacherAssignment.subject),
        joinedload(TeacherAssignment.cohort),
        joinedload(TeacherAssignment.offering)
    )
    
    # Teachers can only see their own assignments
    if role == "teacher":
        query = query.filter(TeacherAssignment.teacher_id == current_user.user_id)
    else:
        if teacher_id:
            query = query.filter(TeacherAssignment.teacher_id == teacher_id)
    
    if subject_id:
        query = query.filter(TeacherAssignment.subject_id == subject_id)
    if cohort_id:
        query = query.filter(TeacherAssignment.cohort_id == cohort_id)
    if offering_id:
        query = query.filter(TeacherAssignment.offering_id == offering_id)
    
    assignments = query.all()
    return assignments


@router.post("", response_model=TeacherAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    assignment: TeacherAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Create a new teacher assignment."""
    # Verify subject and cohort exist
    subject = db.query(Subject).filter(Subject.id == assignment.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    cohort = db.query(Cohort).filter(Cohort.id == assignment.cohort_id).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    
    # Check for duplicate
    existing = db.query(TeacherAssignment).filter(
        TeacherAssignment.teacher_id == assignment.teacher_id,
        TeacherAssignment.subject_id == assignment.subject_id,
        TeacherAssignment.cohort_id == assignment.cohort_id,
        TeacherAssignment.academic_year == assignment.academic_year
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Assignment already exists")
    
    new_assignment = TeacherAssignment(
        id=uuid_lib.uuid4(),
        teacher_id=assignment.teacher_id,
        subject_id=assignment.subject_id,
        cohort_id=assignment.cohort_id,
        academic_year=assignment.academic_year
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    return new_assignment


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Delete assignment."""
    assignment = db.query(TeacherAssignment).filter(TeacherAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()

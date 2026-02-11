"""
EduMetrics Backend - Remedial Actions API
Endpoints for managing remedial actions for slow learners.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
import uuid as uuid_lib

from app.database import get_db
from app.api.deps import require_authenticated, get_user_role
from app.models import Profile, RemedialAction, Student, SubjectOffering
from app.schemas.remedial import (
    RemedialActionCreate, 
    RemedialActionUpdate, 
    RemedialActionResponse, 
    RemedialBulkAssign
)

router = APIRouter(prefix="/remedial", tags=["Remedial Actions"])

@router.post("/assign", response_model=List[RemedialActionResponse], status_code=status.HTTP_201_CREATED)
async def bulk_assign_remedial_action(
    assignment: RemedialBulkAssign,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated),
    role: str = Depends(get_user_role)
):
    """
    Bulk assign a remedial action to multiple students.
    Only Faculty (Teacher) or above can assign.
    """
    if role not in ["teacher", "hod", "principal", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to assign remedial actions")

    # Verify offering exists
    offering = db.query(SubjectOffering).filter(SubjectOffering.id == assignment.offering_id).first()
    if not offering:
        raise HTTPException(status_code=404, detail="Subject Offering not found")
        
    # Verify teacher assignment (optional, for stricter access control)
    # TODO: Check if teacher is assigned to this offering or cohort

    created_actions = []
    
    for usn in assignment.student_ids:
        # Verify student exists
        student = db.query(Student).filter(Student.usn == usn).first()
        if not student:
            continue # Skip invalid students, or raise error? Skipping for bulk resilience.
            
        new_action = RemedialAction(
            id=uuid_lib.uuid4(),
            student_id=usn,
            offering_id=assignment.offering_id,
            assigned_by_id=current_user.user_id,
            action_type=assignment.action_type,
            description=assignment.description,
            deadline=assignment.deadline,
            remarks=assignment.remarks
        )
        db.add(new_action)
        created_actions.append(new_action)
    
    db.commit()
    for action in created_actions:
        db.refresh(action)
        
    return created_actions

@router.get("/student/{usn}", response_model=List[RemedialActionResponse])
async def get_student_remedial_actions(
    usn: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated),
    role: str = Depends(get_user_role)
):
    """
    Get remedial actions for a specific student.
    Students can only view their own. Faculty can view any.
    """
    # Authorization check
    # If role is student, ensure USN matches their profile USN (which we might need to fetch)
    if role == 'student':
        # Retrieve student record for current_user
        student_record = db.query(Student).filter(Student.user_id == current_user.user_id).first()
        if not student_record or student_record.usn != usn:
             raise HTTPException(status_code=403, detail="Can only view your own remedial actions")
    
    actions = db.query(RemedialAction).filter(
        RemedialAction.student_id == usn
    ).options(
        joinedload(RemedialAction.assigned_by)
    ).all()
    
    return actions

@router.get("/offering/{offering_id}", response_model=List[RemedialActionResponse])
async def get_offering_remedial_actions(
    offering_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated),
    role: str = Depends(get_user_role)
):
    """
    Get all remedial actions for a specific offering.
    Faculty/HOD/Principal only.
    """
    if role == 'student':
         raise HTTPException(status_code=403, detail="Not authorized")

    actions = db.query(RemedialAction).filter(
        RemedialAction.offering_id == offering_id
    ).options(
        joinedload(RemedialAction.assigned_by)
    ).all()
    
    return actions

@router.patch("/{action_id}", response_model=RemedialActionResponse)
async def update_remedial_action(
    action_id: UUID,
    update_data: RemedialActionUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated),
    role: str = Depends(get_user_role)
):
    """
    Update a remedial action (status, proof, etc).
    """
    action = db.query(RemedialAction).filter(RemedialAction.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Remedial action not found")
        
    # Permission logic:
    # Student can update: proof_url, status (to SUBMITTED/IN_PROGRESS)
    # Faculty can update: status, remarks, deadline, description
    
    if role == 'student':
        # Verify ownership via Student table
        student_record = db.query(Student).filter(Student.user_id == current_user.user_id).first()
        if not student_record or student_record.usn != action.student_id:
             raise HTTPException(status_code=403, detail="Not authorized")
        
        # Student allowed fields
        if update_data.proof_url is not None:
            action.proof_url = update_data.proof_url
        if update_data.status is not None:
            # Allow student to mark as COMPLETED? Or should it be 'SUBMITTED'? 
            # Enum has COMPLETED. Let's assume Student marks COMPLETED, Teacher marks VERIFIED.
            if update_data.status in ['IN_PROGRESS', 'COMPLETED']:
                 action.status = update_data.status
    else:
        # Faculty/HOD
        for field, value in update_data.dict(exclude_unset=True).items():
            setattr(action, field, value)
            
    action.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(action)
    return action

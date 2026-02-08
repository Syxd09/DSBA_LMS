"""
EduMetrics Backend - Subject Offerings Router
The CORE ANCHOR for all academic data.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
import uuid as uuid_lib

from app.database import get_db
from app.api.deps import require_authenticated, require_hod_or_above, require_teacher_or_above
from app.models import Profile, SubjectOffering, CourseOutcome, Subject, Cohort
from app.schemas import (
    SubjectOfferingResponse, CourseOutcomeResponse, CourseOutcomeCreate
)

router = APIRouter(prefix="/offerings", tags=["Subject Offerings"])


@router.get("/", response_model=List[SubjectOfferingResponse])
async def list_offerings(
    cohort_id: Optional[UUID] = None,
    subject_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """List subject offerings with optional filters."""
    query = db.query(SubjectOffering).options(
        joinedload(SubjectOffering.subject),
        joinedload(SubjectOffering.cohort)
    )
    
    if cohort_id:
        query = query.filter(SubjectOffering.cohort_id == cohort_id)
        
    if subject_id:
        query = query.filter(SubjectOffering.subject_id == subject_id)
        
    return query.all()

@router.get("/{offering_id}", response_model=SubjectOfferingResponse)
async def get_offering(
    offering_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get subject offering details."""
    offering = db.query(SubjectOffering).options(
        joinedload(SubjectOffering.subject),
        joinedload(SubjectOffering.cohort)
    ).filter(SubjectOffering.id == offering_id).first()
    
    if not offering:
        raise HTTPException(status_code=404, detail="Subject Offering not found")
        
    return offering


@router.get("/{offering_id}/outcomes", response_model=List[CourseOutcomeResponse])
async def get_offering_outcomes(
    offering_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """
    Get Course Outcomes (COs) for this specific offering/batch.
    
    CRITICAL: fetching COs attached to Offering, NOT Subject.
    """
    offering = db.query(SubjectOffering).filter(SubjectOffering.id == offering_id).first()
    if not offering:
        raise HTTPException(status_code=404, detail="Subject Offering not found")
        
    cos = db.query(CourseOutcome).filter(
        CourseOutcome.offering_id == offering_id
    ).order_by(CourseOutcome.co_number).all()
    
    return cos


@router.post("/{offering_id}/outcomes", response_model=CourseOutcomeResponse, status_code=status.HTTP_201_CREATED)
async def create_offering_outcome(
    offering_id: UUID,
    outcome: CourseOutcomeCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above) # Teachers can define COs? Usually HOD. Let's stick to HOD/Teacher.
):
    """
    Create a CO for this specific offering.
    
    VERSIONING RULE: Creating a CO here only affects THIS batch/offering.
    """
    offering = db.query(SubjectOffering).filter(SubjectOffering.id == offering_id).first()
    if not offering:
        raise HTTPException(status_code=404, detail="Subject Offering not found")
    
    # Check for duplicate limit?
    # Usually max 5-8 COs per subject
    
    existing = db.query(CourseOutcome).filter(
        CourseOutcome.offering_id == offering_id,
        CourseOutcome.co_number == outcome.co_number
    ).first()
    
    if existing:
        raise HTTPException(status_code=409, detail=f"CO{outcome.co_number} already exists for this offering")

    new_co = CourseOutcome(
        id=uuid_lib.uuid4(),
        offering_id=offering_id,
        subject_id=None, # CRITICAL: NULL subject_id to respect check constraint
        co_number=outcome.co_number,
        description=outcome.description,
        bloom_level=outcome.bloom_level
    )
    
    db.add(new_co)
    db.commit()
    db.refresh(new_co)
    
    return new_co


@router.put("/{offering_id}/outcomes/{co_id}", response_model=CourseOutcomeResponse)
async def update_offering_outcome(
    offering_id: UUID,
    co_id: UUID,
    outcome: CourseOutcomeCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Update a specific CO for this offering."""
    existing = db.query(CourseOutcome).filter(
        CourseOutcome.id == co_id,
        CourseOutcome.offering_id == offering_id
    ).first()
    
    if not existing:
        raise HTTPException(status_code=404, detail="Course outcome not found")
        
    existing.co_number = outcome.co_number
    existing.description = outcome.description
    existing.bloom_level = outcome.bloom_level
    
    db.commit()
    db.refresh(existing)
    return existing

@router.delete("/{offering_id}/outcomes/{co_id}")
async def delete_offering_outcome(
    offering_id: UUID,
    co_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Delete a CO."""
    existing = db.query(CourseOutcome).filter(
        CourseOutcome.id == co_id,
        CourseOutcome.offering_id == offering_id
    ).first()
    
    if not existing:
        raise HTTPException(status_code=404, detail="Course outcome not found")
        
    db.delete(existing)
    db.commit()
    return {"message": "Course outcome deleted"}

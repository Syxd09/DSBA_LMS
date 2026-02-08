"""
EduMetrics Backend - Subjects Router
Subject management endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
import uuid as uuid_lib

from app.database import get_db
from app.api.deps import require_authenticated, require_hod_or_above
from app.models import Profile, Subject, CourseOutcome
from app.schemas import (
    SubjectCreate, SubjectUpdate, SubjectResponse, SubjectWithOutcomes,
    CourseOutcomeCreate, CourseOutcomeResponse
)

# NOTE: CO management has been moved to `offerings.py` to support batch-specific versioning.
# The `Subject` model is now a Master/Template only.

router = APIRouter(prefix="/subjects", tags=["Subjects"])


@router.get("", response_model=List[SubjectResponse])
async def list_subjects(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated),
    semester: Optional[int] = None
):
    """List all subjects."""
    query = db.query(Subject)
    
    if semester:
        query = query.filter(Subject.semester == semester)
    
    subjects = query.order_by(Subject.semester, Subject.code).all()
    return subjects


@router.post("", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(
    subject: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Create a new subject."""
    # Check for duplicate code
    existing = db.query(Subject).filter(Subject.code == subject.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Subject with this code already exists"
        )
    
    new_subject = Subject(
        id=uuid_lib.uuid4(),
        name=subject.name,
        code=subject.code,
        credits=subject.credits,
        semester=subject.semester,
        curriculum_version_id=subject.curriculum_version_id
    )
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    
    return new_subject


@router.get("/{subject_id}", response_model=SubjectWithOutcomes)
async def get_subject(
    subject_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get subject with course outcomes."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    cos = db.query(CourseOutcome).filter(CourseOutcome.subject_id == subject_id).order_by(CourseOutcome.co_number).all()
    
    return SubjectWithOutcomes(
        id=subject.id,
        name=subject.name,
        code=subject.code,
        credits=subject.credits,
        semester=subject.semester,
        curriculum_version_id=subject.curriculum_version_id,
        created_at=subject.created_at,
        course_outcomes=[CourseOutcomeResponse.model_validate(co) for co in cos]
    )


# ============================================================================
# DEPRECATED: CO Management moved to `offerings.py`
# ============================================================================
# The following endpoints are removed to prevent data corruption.
# COs must be attached to SubjectOffering, not Subject.


@router.put("/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    subject_id: UUID,
    subject: SubjectUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Update a subject."""
    existing = db.query(Subject).filter(Subject.id == subject_id).first()
    
    if not existing:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    if subject.name is not None:
        existing.name = subject.name
    if subject.code is not None:
        existing.code = subject.code
    if subject.credits is not None:
        existing.credits = subject.credits
    if subject.semester is not None:
        existing.semester = subject.semester
    
    db.commit()
    db.refresh(existing)
    
    return existing


@router.delete("/{subject_id}")
async def delete_subject(
    subject_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Delete a subject."""
    existing = db.query(Subject).filter(Subject.id == subject_id).first()
    
    if not existing:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Delete associated course outcomes first
    db.query(CourseOutcome).filter(CourseOutcome.subject_id == subject_id).delete()
    db.delete(existing)
    db.commit()
    
    return {"message": "Subject deleted successfully"}


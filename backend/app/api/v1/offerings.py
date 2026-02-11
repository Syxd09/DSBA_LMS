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
    SubjectOfferingCreate, SubjectOfferingResponse, CourseOutcomeResponse, CourseOutcomeCreate
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
    
    # FILTER: Scoping for HOD
    from app.models import UserRole, Department, Program, Cohort
    from app.core.permissions import AppRole
    
    user_role_obj = db.query(UserRole).filter(UserRole.user_id == current_user.user_id).first()
    if user_role_obj and user_role_obj.role == AppRole.HOD:
        hod_dept = db.query(Department).filter(Department.hod_id == current_user.user_id).first()
        if hod_dept:
             # Get all cohorts for this department
             programs = db.query(Program).filter(Program.department_id == hod_dept.id).all()
             program_ids = [p.id for p in programs]
             cohorts = db.query(Cohort).filter(Cohort.program_id.in_(program_ids)).all() if program_ids else []
             cohort_ids = [c.id for c in cohorts]
             
             if cohort_ids:
                 query = query.filter(SubjectOffering.cohort_id.in_(cohort_ids))
             else:
                 return []
        else:
             return []
    
    if cohort_id:
        query = query.filter(SubjectOffering.cohort_id == cohort_id)
        
    if subject_id:
        query = query.filter(SubjectOffering.subject_id == subject_id)
        
    return query.all()


@router.post("/", response_model=SubjectOfferingResponse, status_code=status.HTTP_201_CREATED)
async def create_offering(
    offering: SubjectOfferingCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Create a subject offering (link subject to cohort).
    This enables COs to be created for specific batch+subject combinations.
    HOD and above only.
    """
    # Validate cohort exists and get program_id
    cohort = db.query(Cohort).filter(Cohort.id == offering.cohort_id).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    
    # Validate subject exists
    subject = db.query(Subject).filter(Subject.id == offering.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Check for duplicate
    existing = db.query(SubjectOffering).filter(
        SubjectOffering.subject_id == offering.subject_id,
        SubjectOffering.cohort_id == offering.cohort_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="This subject is already offered to this cohort")
    
    # Create offering
    new_offering = SubjectOffering(
        id=uuid_lib.uuid4(),
        subject_id=offering.subject_id,
        cohort_id=offering.cohort_id,
        program_id=cohort.program_id,
        semester_no=offering.semester_no,
        is_elective=offering.is_elective,
        regulation_year=offering.regulation_year or cohort.year,
        is_active=True
    )
    db.add(new_offering)
    db.commit()
    db.refresh(new_offering)
    
    return new_offering

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
        co_code=f"CO{outcome.co_number}",  # Generate co_code from co_number
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

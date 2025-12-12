"""
EduMetrics Backend - Cohorts Router
Cohort management endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
import uuid as uuid_lib

from app.database import get_db
from app.api.deps import require_authenticated, require_hod_or_above
from app.models import Profile, Cohort, Program
from app.schemas import CohortCreate, CohortUpdate, CohortResponse

router = APIRouter(prefix="/cohorts", tags=["Cohorts"])


@router.get("", response_model=List[CohortResponse])
async def list_cohorts(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated),
    program_id: UUID = None
):
    """List all cohorts."""
    query = db.query(Cohort)
    if program_id:
        query = query.filter(Cohort.program_id == program_id)
    cohorts = query.order_by(Cohort.year.desc()).all()
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
    """Delete cohort."""
    cohort = db.query(Cohort).filter(Cohort.id == cohort_id).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    db.delete(cohort)
    db.commit()

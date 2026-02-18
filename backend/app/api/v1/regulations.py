"""
EduMetrics API - Regulation Management

Endpoints for managing academic regulations and curriculum structures.
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.database import get_db
from app.api.deps import require_authenticated, require_principal, require_hod_or_above, Permission
from app.models.regulation import Regulation
from app.models.academic import CurriculumVersion, Subject
from app.schemas.regulation import (
    RegulationCreate,
    RegulationUpdate,
    RegulationResponse,
)
from app.schemas.academic import (
    CurriculumVersionResponse,
    CurriculumVersionCreate,
    SubjectCreate,
    SubjectResponse
)

router = APIRouter(tags=["Regulations"])

# ============================================================================
# REGULATION ENDPOINTS
# ============================================================================

@router.get("", response_model=List[RegulationResponse])
async def list_regulations(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated)
):
    """List all regulations."""
    query = db.query(Regulation)
    if active_only:
        query = query.filter(Regulation.is_active == True)
    
    return query.offset(skip).limit(limit).all()


@router.post("", response_model=RegulationResponse)
async def create_regulation(
    regulation_in: RegulationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_principal)  # Only Principal
):
    """Create a new regulation."""
    # Infer college_id if not provided (Single College Mode)
    if not regulation_in.college_id:
        # Check if College model exists and fetch first
        # For now, we assume a default college exists or we create a placeholder mapping
        # In a real app, we'd query: db.query(College).first()
        from app.models.college import College
        default_college = db.query(College).first()
        if not default_college:
             # Fallback or Error? For now we can't create without a college if DB enforces it.
             # If simple mode, maybe create one?
             raise HTTPException(status_code=400, detail="No college registered in system.")
        regulation_in.college_id = default_college.id

    # Check for duplicate
    existing = db.query(Regulation).filter(
        Regulation.code == regulation_in.code,
        Regulation.college_id == regulation_in.college_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Regulation code already exists")
    
    db_obj = Regulation(**regulation_in.dict())
    db_obj.created_by = current_user.user_id
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.get("/{regulation_id}", response_model=RegulationResponse)
async def get_regulation(
    regulation_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated)
):
    """Get regulation details."""
    regulation = db.query(Regulation).filter(Regulation.id == regulation_id).first()
    if not regulation:
        raise HTTPException(status_code=404, detail="Regulation not found")
    return regulation


@router.put("/{regulation_id}", response_model=RegulationResponse)
async def update_regulation(
    regulation_id: UUID,
    regulation_in: RegulationUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_principal)
):
    """Update a regulation."""
    regulation = db.query(Regulation).filter(Regulation.id == regulation_id).first()
    if not regulation:
        raise HTTPException(status_code=404, detail="Regulation not found")
    
    update_data = regulation_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(regulation, field, value)
    
    db.commit()
    db.refresh(regulation)
    return regulation


# ============================================================================
# CURRICULUM ENDPOINTS (Linked to Regulation)
# ============================================================================

@router.get("/{regulation_id}/programs/{program_id}/curriculum", response_model=List[CurriculumVersionResponse])
async def get_program_curriculum(
    regulation_id: UUID,
    program_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated)
):
    """
    Get the curriculum versions for a program under a specific regulation.
    Usually returns one active version, but list for flexibility.
    """
    versions = db.query(CurriculumVersion).filter(
        CurriculumVersion.program_id == program_id,
        CurriculumVersion.regulation_id == regulation_id
    ).all()
    
    return versions


@router.post("/{regulation_id}/programs/{program_id}/curriculum", response_model=CurriculumVersionResponse)
async def create_program_curriculum_version(
    regulation_id: UUID,
    program_id: UUID,
    version_in: CurriculumVersionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_hod_or_above)
):
    """
    Create a curriculum version linked to a regulation.
    """
    # Verify input matches URL params if provided in body (though schema implies inferred)
    # Ideally creation input shouldn't need redundant IDs if passed in URL, but schema has them.
    # We override/ensure consistency
    
    version_data = version_in.dict()
    version_data['program_id'] = program_id
    version_data['regulation_id'] = regulation_id
    
    db_obj = CurriculumVersion(**version_data)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.post("/{regulation_id}/curriculum/{version_id}/subjects", response_model=SubjectResponse)
async def add_subject_to_curriculum(
    regulation_id: UUID,
    version_id: UUID,
    subject_in: SubjectCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_hod_or_above)
):
    """
    Add a subject to a specific curriculum version.
    """
    # Verify version belongs to regulation
    version = db.query(CurriculumVersion).filter(
        CurriculumVersion.id == version_id,
        CurriculumVersion.regulation_id == regulation_id
    ).first()
    
    if not version:
        raise HTTPException(status_code=404, detail="Curriculum version not found for this regulation")
    
    # Create subject
    subject_data = subject_in.dict()
    subject_data['curriculum_version_id'] = version_id
    
    db_subject = Subject(**subject_data)
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject


@router.get("/{regulation_id}/curriculum/{version_id}/subjects", response_model=List[SubjectResponse])
async def get_curriculum_subjects(
    regulation_id: UUID,
    version_id: UUID,
    semester: int = Query(None, description="Filter by semester"),
    db: Session = Depends(get_db),
    current_user = Depends(require_authenticated)
):
    """List subjects in a curriculum version."""
    query = db.query(Subject).join(CurriculumVersion).filter(
        CurriculumVersion.id == version_id,
        CurriculumVersion.regulation_id == regulation_id
    )
    
    if semester:
        query = query.filter(Subject.semester == semester)
        
    return query.all()

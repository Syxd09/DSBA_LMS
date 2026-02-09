"""
EduMetrics Backend - CO-PO Mapping Router
CO-PO mapping management endpoints for NBA compliance
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
import uuid as uuid_lib

from app.database import get_db
from app.api.deps import require_authenticated, require_hod_or_above
from app.models import (
    Profile, CourseOutcome, ProgramOutcome, COPOMapping,
    SubjectOffering, Program
)
from app.schemas import (
    COPOMappingCreate, COPOMappingBulkCreate, COPOMappingResponse
)

router = APIRouter(prefix="/mappings", tags=["CO-PO Mappings"])


# ============ CO-PO MAPPING ============

@router.get("/co-po", response_model=List[COPOMappingResponse])
async def list_co_po_mappings(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated),
    offering_id: Optional[UUID] = None,
    program_id: Optional[UUID] = None
):
    """
    List CO-PO mappings.
    Filter by offering_id to get mappings for a specific subject offering.
    Filter by program_id to get all mappings for a program's POs.
    """
    query = db.query(COPOMapping)
    
    if offering_id:
        # Get COs for this offering, then their mappings
        co_ids = db.query(CourseOutcome.id).filter(
            CourseOutcome.offering_id == offering_id
        ).subquery()
        query = query.filter(COPOMapping.co_id.in_(co_ids))
    
    if program_id:
        # Get POs for this program, then their mappings
        po_ids = db.query(ProgramOutcome.id).filter(
            ProgramOutcome.program_id == program_id
        ).subquery()
        query = query.filter(COPOMapping.po_id.in_(po_ids))
    
    return query.all()


@router.get("/co-po/matrix/{offering_id}")
async def get_co_po_matrix(
    offering_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """
    Get CO-PO mapping matrix for a subject offering.
    Returns a structured matrix with rows (COs) and columns (POs) plus correlations.
    """
    # Get offering and program
    offering = db.query(SubjectOffering).filter(SubjectOffering.id == offering_id).first()
    if not offering:
        raise HTTPException(status_code=404, detail="Subject offering not found")
    
    # Get program from cohort
    from app.models import Cohort
    cohort = db.query(Cohort).filter(Cohort.id == offering.cohort_id).first()
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    
    program = db.query(Program).filter(Program.id == cohort.program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    # Get COs for this offering
    cos = db.query(CourseOutcome).filter(
        CourseOutcome.offering_id == offering_id
    ).order_by(CourseOutcome.co_number).all()
    
    # Get POs for the program
    pos = db.query(ProgramOutcome).filter(
        ProgramOutcome.program_id == program.id
    ).order_by(ProgramOutcome.po_number).all()
    
    # Get existing mappings
    existing_mappings = db.query(COPOMapping).filter(
        COPOMapping.co_id.in_([co.id for co in cos])
    ).all()
    
    # Build mapping lookup
    mapping_lookup = {
        (str(m.co_id), str(m.po_id)): m.correlation_level
        for m in existing_mappings
    }
    
    # Build matrix
    matrix = []
    for co in cos:
        row = {
            "co_id": str(co.id),
            "co_code": co.co_code,
            "co_description": co.description,
            "mappings": {}
        }
        for po in pos:
            key = (str(co.id), str(po.id))
            row["mappings"][str(po.id)] = mapping_lookup.get(key, 0)
        matrix.append(row)
    
    return {
        "offering_id": str(offering_id),
        "program_id": str(program.id),
        "program_name": program.name,
        "cos": [{"id": str(co.id), "code": co.co_code, "description": co.description} for co in cos],
        "pos": [{"id": str(po.id), "code": po.po_code, "description": po.description} for po in pos],
        "matrix": matrix
    }


@router.post("/co-po", response_model=COPOMappingResponse, status_code=status.HTTP_201_CREATED)
async def create_co_po_mapping(
    mapping: COPOMappingCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Create a single CO-PO mapping. HOD and above only."""
    # Validate CO exists
    co = db.query(CourseOutcome).filter(CourseOutcome.id == mapping.co_id).first()
    if not co:
        raise HTTPException(status_code=404, detail="Course Outcome not found")
    
    # Validate PO exists
    po = db.query(ProgramOutcome).filter(ProgramOutcome.id == mapping.po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Program Outcome not found")
    
    # Check if mapping already exists
    existing = db.query(COPOMapping).filter(
        COPOMapping.co_id == mapping.co_id,
        COPOMapping.po_id == mapping.po_id
    ).first()
    
    if existing:
        # Update existing mapping
        existing.correlation_level = mapping.correlation_level
        db.commit()
        db.refresh(existing)
        return existing
    
    # Create new mapping
    new_mapping = COPOMapping(
        id=uuid_lib.uuid4(),
        co_id=mapping.co_id,
        po_id=mapping.po_id,
        correlation_level=mapping.correlation_level
    )
    db.add(new_mapping)
    db.commit()
    db.refresh(new_mapping)
    return new_mapping


@router.post("/co-po/bulk", status_code=status.HTTP_201_CREATED)
async def bulk_save_co_po_mappings(
    data: COPOMappingBulkCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Bulk save CO-PO mappings. HOD and above only.
    Upserts mappings - creates new or updates existing.
    If correlation_level is 0, deletes the mapping.
    """
    created = 0
    updated = 0
    deleted = 0
    
    for mapping in data.mappings:
        # Check if mapping exists
        existing = db.query(COPOMapping).filter(
            COPOMapping.co_id == mapping.co_id,
            COPOMapping.po_id == mapping.po_id
        ).first()
        
        if mapping.correlation_level == 0:
            # Delete if exists
            if existing:
                db.delete(existing)
                deleted += 1
        elif existing:
            # Update
            existing.correlation_level = mapping.correlation_level
            updated += 1
        else:
            # Create
            new_mapping = COPOMapping(
                id=uuid_lib.uuid4(),
                co_id=mapping.co_id,
                po_id=mapping.po_id,
                correlation_level=mapping.correlation_level
            )
            db.add(new_mapping)
            created += 1
    
    db.commit()
    return {"created": created, "updated": updated, "deleted": deleted}


@router.delete("/co-po/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_co_po_mapping(
    mapping_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Delete a CO-PO mapping. HOD and above only."""
    mapping = db.query(COPOMapping).filter(COPOMapping.id == mapping_id).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    
    db.delete(mapping)
    db.commit()


@router.get("/traceability/{program_id}")
async def get_traceability_matrix(
    program_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """
    Get full CO-PO traceability matrix for a program.
    Shows all subjects, their COs, and mappings to POs.
    """
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    # Get all POs for the program
    pos = db.query(ProgramOutcome).filter(
        ProgramOutcome.program_id == program_id
    ).order_by(ProgramOutcome.po_number).all()
    
    # Get all offerings for this program (via cohorts)
    from app.models import Cohort, Subject
    cohort_ids = db.query(Cohort.id).filter(Cohort.program_id == program_id).subquery()
    offerings = db.query(SubjectOffering).filter(
        SubjectOffering.cohort_id.in_(cohort_ids)
    ).all()
    
    # Build traceability data
    subjects_data = []
    for offering in offerings:
        subject = db.query(Subject).filter(Subject.id == offering.subject_id).first()
        if not subject:
            continue
        
        cos = db.query(CourseOutcome).filter(
            CourseOutcome.offering_id == offering.id
        ).order_by(CourseOutcome.co_number).all()
        
        co_mappings = []
        for co in cos:
            mappings = db.query(COPOMapping).filter(COPOMapping.co_id == co.id).all()
            mapping_dict = {str(m.po_id): m.correlation_level for m in mappings}
            co_mappings.append({
                "co_code": co.co_code,
                "co_description": co.description,
                "mappings": mapping_dict
            })
        
        subjects_data.append({
            "subject_code": subject.code,
            "subject_name": subject.name,
            "offering_id": str(offering.id),
            "cos": co_mappings
        })
    
    return {
        "program_id": str(program_id),
        "program_name": program.name,
        "pos": [{"id": str(po.id), "code": po.po_code, "description": po.description} for po in pos],
        "subjects": subjects_data
    }

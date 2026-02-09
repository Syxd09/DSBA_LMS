"""
EduMetrics Backend - Programs Router
Program management endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
import uuid as uuid_lib

from app.database import get_db
from app.api.deps import require_authenticated, require_principal, require_hod_or_above
from app.models import Profile, Program, Department, ProgramOutcome
from app.schemas import (
    ProgramCreate, ProgramUpdate, ProgramResponse,
    ProgramOutcomeCreate, ProgramOutcomeUpdate, ProgramOutcomeResponse
)

router = APIRouter(prefix="/programs", tags=["Programs"])


@router.get("", response_model=List[ProgramResponse])
async def list_programs(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated),
    department_id: UUID = None
):
    """List all programs."""
    query = db.query(Program).options(joinedload(Program.department))
    if department_id:
        query = query.filter(Program.department_id == department_id)
    programs = query.order_by(Program.name).all()
    return programs


@router.post("", response_model=ProgramResponse, status_code=status.HTTP_201_CREATED)
async def create_program(
    program: ProgramCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_principal)
):
    """Create a new program."""
    existing = db.query(Program).filter(Program.code == program.code).first()
    if existing:
        raise HTTPException(status_code=409, detail="Program code already exists")
    
    new_program = Program(
        id=uuid_lib.uuid4(),
        name=program.name,
        code=program.code,
        department_id=program.department_id,
        duration_years=program.duration_years
    )
    db.add(new_program)
    db.commit()
    db.refresh(new_program)
    return new_program


@router.get("/{program_id}", response_model=ProgramResponse)
async def get_program(
    program_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get program by ID."""
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    return program


@router.put("/{program_id}", response_model=ProgramResponse)
async def update_program(
    program_id: UUID,
    program: ProgramUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_principal)
):
    """Update program."""
    db_program = db.query(Program).filter(Program.id == program_id).first()
    if not db_program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    if program.name:
        db_program.name = program.name
    if program.code:
        db_program.code = program.code
    if program.department_id:
        db_program.department_id = program.department_id
    if program.duration_years:
        db_program.duration_years = program.duration_years
    
    db.commit()
    db.refresh(db_program)
    return db_program


@router.delete("/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_program(
    program_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_principal)
):
    """Delete program."""
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    db.delete(program)
    db.commit()


# ============ PROGRAM OUTCOMES (PO) ============

@router.get("/{program_id}/outcomes", response_model=List[ProgramOutcomeResponse])
async def list_program_outcomes(
    program_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """List all POs for a program. All authenticated users can view."""
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    pos = db.query(ProgramOutcome).filter(
        ProgramOutcome.program_id == program_id
    ).order_by(ProgramOutcome.po_number).all()
    return pos


@router.post("/{program_id}/outcomes", response_model=ProgramOutcomeResponse, status_code=status.HTTP_201_CREATED)
async def create_program_outcome(
    program_id: UUID,
    po_data: ProgramOutcomeCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Create a PO for a program. HOD and above only."""
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    # Check for duplicate PO number
    existing = db.query(ProgramOutcome).filter(
        ProgramOutcome.program_id == program_id,
        ProgramOutcome.po_number == po_data.po_number
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"PO{po_data.po_number} already exists for this program")
    
    new_po = ProgramOutcome(
        id=uuid_lib.uuid4(),
        program_id=program_id,
        po_code=f"PO{po_data.po_number}",
        po_number=po_data.po_number,
        description=po_data.description,
        threshold=60.0  # Default NBA threshold
    )
    db.add(new_po)
    db.commit()
    db.refresh(new_po)
    return new_po


@router.put("/{program_id}/outcomes/{po_id}", response_model=ProgramOutcomeResponse)
async def update_program_outcome(
    program_id: UUID,
    po_id: UUID,
    po_data: ProgramOutcomeUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Update a PO. HOD and above only."""
    po = db.query(ProgramOutcome).filter(
        ProgramOutcome.id == po_id,
        ProgramOutcome.program_id == program_id
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Program Outcome not found")
    
    if po_data.description is not None:
        po.description = po_data.description
    if po_data.threshold is not None:
        po.threshold = po_data.threshold
    
    db.commit()
    db.refresh(po)
    return po


@router.delete("/{program_id}/outcomes/{po_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_program_outcome(
    program_id: UUID,
    po_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Delete a PO. HOD and above only. Will fail if CO-PO mappings exist."""
    po = db.query(ProgramOutcome).filter(
        ProgramOutcome.id == po_id,
        ProgramOutcome.program_id == program_id
    ).first()
    if not po:
        raise HTTPException(status_code=404, detail="Program Outcome not found")
    
    # Check for existing CO-PO mappings
    if po.co_po_mappings:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete PO with existing CO-PO mappings. Remove mappings first."
        )
    
    db.delete(po)
    db.commit()


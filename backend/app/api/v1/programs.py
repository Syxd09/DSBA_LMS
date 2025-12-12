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
from app.api.deps import require_authenticated, require_principal
from app.models import Profile, Program, Department
from app.schemas import ProgramCreate, ProgramUpdate, ProgramResponse

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

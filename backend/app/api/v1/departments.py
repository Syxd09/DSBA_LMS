"""
EduMetrics Backend - Departments Router
Department management endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
import uuid as uuid_lib

from app.database import get_db
from app.api.deps import get_current_user, require_principal, require_authenticated
from app.models import Profile, Department
from app.schemas import DepartmentCreate, DepartmentUpdate, DepartmentResponse

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("")
async def list_departments(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """List all departments with HOD details."""
    departments = db.query(Department).order_by(Department.name).all()
    
    # Build response with HOD details
    result = []
    for dept in departments:
        dept_dict = {
            "id": str(dept.id),
            "name": dept.name,
            "code": dept.code,
            "hod_id": str(dept.hod_id) if dept.hod_id else None,
            "created_at": dept.created_at.isoformat() if dept.created_at else None,
            "hod": None
        }
        if dept.hod_id:
            hod = db.query(Profile).filter(Profile.user_id == dept.hod_id).first()
            if hod:
                dept_dict["hod"] = {"full_name": hod.full_name, "email": hod.email}
        result.append(dept_dict)
    
    return result


@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(
    department: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_principal)
):
    """Create a new department (Principal only)."""
    # Check for duplicates
    existing = db.query(Department).filter(
        (Department.name == department.name) | (Department.code == department.code)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Department with this name or code already exists"
        )
    
    new_dept = Department(
        id=uuid_lib.uuid4(),
        name=department.name,
        code=department.code,
        hod_id=department.hod_id
    )
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)
    
    return new_dept


@router.get("/{department_id}", response_model=DepartmentResponse)
async def get_department(
    department_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get department by ID."""
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    return dept


@router.put("/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: UUID,
    department: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_principal)
):
    """Update department (Principal only)."""
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    if department.name is not None:
        dept.name = department.name
    if department.code is not None:
        dept.code = department.code
    if department.hod_id is not None:
        dept.hod_id = department.hod_id
    
    db.commit()
    db.refresh(dept)
    
    return dept


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    department_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_principal)
):
    """Delete department (Principal only)."""
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    db.delete(dept)
    db.commit()

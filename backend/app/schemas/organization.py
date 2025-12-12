"""
EduMetrics Backend - Organization Schemas
Pydantic models for department, program, cohort endpoints
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from uuid import UUID


# Department schemas
class DepartmentBase(BaseModel):
    """Base department schema."""
    name: str
    code: str
    hod_id: Optional[UUID] = None


class DepartmentCreate(DepartmentBase):
    """Create department schema."""
    pass


class DepartmentUpdate(BaseModel):
    """Update department schema."""
    name: Optional[str] = None
    code: Optional[str] = None
    hod_id: Optional[UUID] = None


class DepartmentResponse(DepartmentBase):
    """Department response schema."""
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Program schemas
class ProgramBase(BaseModel):
    """Base program schema."""
    name: str
    code: str
    department_id: Optional[UUID] = None
    duration_years: int = 3


class ProgramCreate(ProgramBase):
    """Create program schema."""
    pass


class ProgramUpdate(BaseModel):
    """Update program schema."""
    name: Optional[str] = None
    code: Optional[str] = None
    department_id: Optional[UUID] = None
    duration_years: Optional[int] = None


class ProgramResponse(ProgramBase):
    """Program response schema."""
    id: UUID
    created_at: datetime
    department: Optional[DepartmentResponse] = None
    
    class Config:
        from_attributes = True


# Cohort schemas
class CohortBase(BaseModel):
    """Base cohort schema."""
    program_id: UUID
    year: int
    name: str
    current_semester: int = 1


class CohortCreate(CohortBase):
    """Create cohort schema."""
    pass


class CohortUpdate(BaseModel):
    """Update cohort schema."""
    name: Optional[str] = None
    current_semester: Optional[int] = None


class CohortResponse(CohortBase):
    """Cohort response schema."""
    id: UUID
    created_at: datetime
    program: Optional[ProgramResponse] = None
    
    class Config:
        from_attributes = True

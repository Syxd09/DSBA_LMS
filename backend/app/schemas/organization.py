"""
EduMetrics Backend - Organization Schemas
Pydantic models for department, program, cohort endpoints
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from uuid import UUID
from app.schemas.regulation import RegulationResponse


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


# Section schemas
class SectionBase(BaseModel):
    """Base section schema."""
    name: str
    cohort_id: UUID


class SectionCreate(SectionBase):
    """Create section schema."""
    pass


class SectionUpdate(BaseModel):
    """Update section schema."""
    name: Optional[str] = None


class SectionResponse(SectionBase):
    """Section response schema."""
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Cohort schemas
class CohortBase(BaseModel):
    """Base cohort schema."""
    program_id: UUID
    regulation_id: Optional[UUID] = None  # NEW
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
    regulation: Optional[RegulationResponse] = None  # NEW
    sections: List[SectionResponse] = []  # Added sections list
    student_count: int = 0
    exam_count: int = 0
    
    class Config:
        from_attributes = True

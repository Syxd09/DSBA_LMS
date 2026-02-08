"""
EduMetrics Backend - Academic Schemas
Pydantic models for subject, curriculum, enrollment endpoints
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from uuid import UUID
from app.schemas.user import ProfileResponse
from app.schemas.organization import CohortResponse


# Subject schemas
class SubjectBase(BaseModel):
    """Base subject schema."""
    name: str
    code: str
    credits: int = 3
    semester: Optional[int] = None
    curriculum_version_id: Optional[UUID] = None


class SubjectCreate(SubjectBase):
    """Create subject schema."""
    pass


class SubjectUpdate(BaseModel):
    """Update subject schema."""
    name: Optional[str] = None
    code: Optional[str] = None
    credits: Optional[int] = None
    semester: Optional[int] = None


class SubjectResponse(SubjectBase):
    """Subject response schema."""
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


class SubjectWithOutcomes(SubjectResponse):
    """Subject with course outcomes."""
    course_outcomes: List["CourseOutcomeResponse"] = []


# Curriculum schemas
class CurriculumVersionBase(BaseModel):
    """Base curriculum version schema."""
    program_id: UUID
    version_name: str
    effective_from: int
    is_active: bool = True


class CurriculumVersionCreate(CurriculumVersionBase):
    """Create curriculum version schema."""
    pass


class CurriculumVersionResponse(CurriculumVersionBase):
    """Curriculum version response schema."""
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Student enrollment schemas
class StudentEnrollmentBase(BaseModel):
    """Base student enrollment schema."""
    student_id: UUID
    cohort_id: UUID
    roll_number: str
    status: str = "active"


class StudentEnrollmentCreate(StudentEnrollmentBase):
    """Create student enrollment schema."""
    pass


class StudentEnrollmentResponse(StudentEnrollmentBase):
    """Student enrollment response schema."""
    id: UUID
    created_at: datetime
    student: Optional[ProfileResponse] = None
    cohort: Optional[CohortResponse] = None
    
    class Config:
        from_attributes = True


# Teacher assignment schemas
class TeacherAssignmentBase(BaseModel):
    """Base teacher assignment schema."""
    teacher_id: UUID
    subject_id: UUID
    cohort_id: UUID
    academic_year: str


class TeacherAssignmentCreate(TeacherAssignmentBase):
    """Create teacher assignment schema."""
    pass


class TeacherAssignmentResponse(TeacherAssignmentBase):
    """Teacher assignment response schema."""
    id: UUID
    created_at: datetime
    subject: Optional[SubjectResponse] = None
    teacher: Optional[ProfileResponse] = None
    cohort: Optional[CohortResponse] = None
    
    class Config:
        from_attributes = True



# Subject Offering schemas
class SubjectOfferingResponse(BaseModel):
    """Subject offering response schema."""
    id: UUID
    subject_id: UUID
    program_id: UUID
    cohort_id: UUID
    semester_no: int
    is_elective: bool
    regulation_year: int
    is_active: bool
    created_at: datetime
    subject: Optional[SubjectResponse] = None
    cohort: Optional[CohortResponse] = None
    
    class Config:
        from_attributes = True

# Forward reference update
from app.schemas.outcomes import CourseOutcomeResponse
SubjectWithOutcomes.model_rebuild()

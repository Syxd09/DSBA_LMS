"""
EduMetrics Backend - Exam Schemas
Pydantic models for exam-related endpoints
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from uuid import UUID


# Sub-question schemas
class SubQuestionBase(BaseModel):
    """Base sub-question schema."""
    label: str
    max_marks: int
    bloom_level: str
    co_id: Optional[UUID] = None


class SubQuestionCreate(SubQuestionBase):
    """Create sub-question schema."""
    pass


class SubQuestionResponse(SubQuestionBase):
    """Sub-question response schema."""
    id: UUID
    question_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Question schemas
class QuestionBase(BaseModel):
    """Base question schema."""
    sequence: int
    max_marks: int
    bloom_level: str
    co_id: Optional[UUID] = None
    is_optional: bool = False
    group_key: Optional[str] = None


class QuestionCreate(QuestionBase):
    """Create question schema."""
    sub_questions: List[SubQuestionCreate] = []


class QuestionResponse(QuestionBase):
    """Question response schema."""
    id: UUID
    section_id: UUID
    created_at: datetime
    sub_questions: List[SubQuestionResponse] = []
    
    class Config:
        from_attributes = True


# Exam section schemas
class ExamSectionBase(BaseModel):
    """Base exam section schema."""
    name: str
    sequence: int
    max_marks: int
    required_questions: int = 1
    selection_mode: str = "FIRST_N"  # FIRST_N, BEST_N


class ExamSectionCreate(ExamSectionBase):
    """Create exam section schema."""
    questions: List[QuestionCreate] = []


class ExamSectionResponse(ExamSectionBase):
    """Exam section response schema."""
    id: UUID
    exam_id: UUID
    created_at: datetime
    questions: List[QuestionResponse] = []
    
    class Config:
        from_attributes = True


# Exam schemas
class ExamBase(BaseModel):
    """Base exam schema."""
    subject_id: UUID
    cohort_id: UUID
    exam_type: str  # internal1, internal2
    max_marks: int = 30


class ExamCreate(ExamBase):
    """Create exam schema."""
    pass


class ExamUpdate(BaseModel):
    """Update exam schema."""
    max_marks: Optional[int] = None
    status: Optional[str] = None


class ExamResponse(ExamBase):
    """Exam response schema."""
    id: UUID
    status: str
    teacher_id: Optional[UUID] = None
    created_at: datetime
    published_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ExamWithStructure(ExamResponse):
    """Exam with full structure."""
    sections: List[ExamSectionResponse] = []
    subject: Optional[dict] = None
    cohort: Optional[dict] = None


class ExamStructureCreate(BaseModel):
    """Create exam structure schema."""
    sections: List[ExamSectionCreate]

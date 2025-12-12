"""
EduMetrics Backend - Grading Schemas
Pydantic models for grading-related endpoints
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from uuid import UUID


class GradingRuleBase(BaseModel):
    """Base grading rule schema."""
    grade: str
    min_percentage: float
    max_percentage: float
    grade_point: float


class GradingRuleCreate(GradingRuleBase):
    """Create grading rule schema."""
    pass


class GradingRuleResponse(GradingRuleBase):
    """Grading rule response schema."""
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


class CalculateGradesRequest(BaseModel):
    """Request to calculate grades."""
    cohort_id: UUID
    subject_id: UUID


class CalculateSGPARequest(BaseModel):
    """Request to calculate SGPA."""
    student_id: UUID
    semester: int

"""
EduMetrics Backend - Regulation Schemas

Pydantic schemas for Regulation API endpoints.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, validator


class RegulationBase(BaseModel):
    """Base schema for regulation."""
    name: str = Field(..., min_length=1, max_length=50)
    code: str = Field(..., min_length=1, max_length=20)
    year: int = Field(..., ge=2000, le=2100)
    description: Optional[str] = None
    
    bloom_version: str = Field("revised", description="old or revised")
    
    # Weightages
    internal_weightage: int = Field(40, ge=0, le=100)
    external_weightage: int = Field(60, ge=0, le=100)
    
    @validator('external_weightage')
    def validate_weightages(cls, v, values):
        if 'internal_weightage' in values:
            if values['internal_weightage'] + v != 100:
                raise ValueError('Internal and external weightages must sum to 100')
        return v


class RegulationCreate(RegulationBase):
    """Schema for creating a regulation."""
    college_id: Optional[UUID] = None
    
    # Internal component weightages
    internal_exam_weightage: Optional[Decimal] = 15.0
    assignment_weightage: Optional[Decimal] = 10.0
    attendance_weightage: Optional[Decimal] = 5.0
    activity_weightage: Optional[Decimal] = 5.0
    other_weightage: Optional[Decimal] = 5.0
    
    # CO Attainment thresholds
    co_threshold_level1: Optional[Decimal] = 40.0
    co_threshold_level2: Optional[Decimal] = 60.0
    co_threshold_level3: Optional[Decimal] = 75.0
    
    # PO Attainment thresholds
    po_threshold_level1: Optional[Decimal] = 1.0
    po_threshold_level2: Optional[Decimal] = 2.0
    po_threshold_level3: Optional[Decimal] = 3.0
    
    # Pass criteria
    min_attendance_percentage: int = 75
    min_internal_marks: Optional[Decimal] = 16.0
    min_external_marks: Optional[Decimal] = 24.0
    min_total_marks: Optional[Decimal] = 40.0
    max_backlogs_for_promotion: int = 4
    
    # Optional
    grade_scale_id: Optional[UUID] = None
    effective_from: Optional[datetime] = None
    additional_rules: Optional[Dict[str, Any]] = None


class RegulationUpdate(BaseModel):
    """Schema for updating a regulation."""
    name: Optional[str] = None
    description: Optional[str] = None
    bloom_version: Optional[str] = None
    
    co_threshold_level1: Optional[Decimal] = None
    co_threshold_level2: Optional[Decimal] = None
    co_threshold_level3: Optional[Decimal] = None
    
    min_attendance_percentage: Optional[int] = None
    max_backlogs_for_promotion: Optional[int] = None
    
    is_active: Optional[bool] = None
    effective_until: Optional[datetime] = None
    additional_rules: Optional[Dict[str, Any]] = None


class RegulationInDB(RegulationBase):
    """Schema for regulation from database."""
    id: UUID
    college_id: UUID
    
    internal_exam_weightage: Decimal
    assignment_weightage: Decimal
    attendance_weightage: Decimal
    activity_weightage: Decimal
    other_weightage: Decimal
    
    co_threshold_level1: Decimal
    co_threshold_level2: Decimal
    co_threshold_level3: Decimal
    
    po_threshold_level1: Decimal
    po_threshold_level2: Decimal
    po_threshold_level3: Decimal
    
    min_attendance_percentage: int
    min_internal_marks: Decimal
    min_external_marks: Decimal
    min_total_marks: Decimal
    max_backlogs_for_promotion: int
    
    grade_scale_id: Optional[UUID] = None
    version: int
    is_active: bool
    effective_from: Optional[datetime] = None
    effective_until: Optional[datetime] = None
    
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class RegulationResponse(RegulationInDB):
    """Response schema with additional computed fields."""
    total_internal_weightage: Optional[float] = None
    cohort_count: Optional[int] = None  # Number of cohorts using this regulation

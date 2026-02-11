"""
EduMetrics Backend - Remedial Schemas
Pydantic models for remedial action workflows.
"""
from typing import Optional
from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel
from app.models.remedial import RemedialActionType, RemedialActionStatus
from app.schemas.user import ProfileResponse

class RemedialBulkAssign(BaseModel):
    """Schema for bulk assigning remedial actions."""
    student_ids: list[str]
    offering_id: UUID
    action_type: RemedialActionType
    description: str
    deadline: date
    remarks: Optional[str] = None

class RemedialActionBase(BaseModel):
    """Base schema for Remedial Actions."""
    student_id: str # USN
    offering_id: UUID
    action_type: RemedialActionType
    description: str
    deadline: date
    remarks: Optional[str] = None
    proof_url: Optional[str] = None
    impact_score: Optional[int] = None
    status: RemedialActionStatus = RemedialActionStatus.ASSIGNED

class RemedialActionCreate(RemedialActionBase):
    """Schema for creating a remedial action."""
    pass

class RemedialActionUpdate(BaseModel):
    """Schema for updating a remedial action."""
    action_type: Optional[RemedialActionType] = None
    description: Optional[str] = None
    deadline: Optional[date] = None
    status: Optional[RemedialActionStatus] = None
    proof_url: Optional[str] = None
    remarks: Optional[str] = None
    impact_score: Optional[int] = None

class RemedialActionResponse(RemedialActionBase):
    """Schema for serializing a remedial action."""
    id: UUID
    assigned_by_id: UUID
    created_at: datetime
    updated_at: datetime
    
    assigned_by: Optional[ProfileResponse] = None
    
    class Config:
        from_attributes = True

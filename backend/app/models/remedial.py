"""
EduMetrics Backend - Remedial Action Model
Tracks interventions for slow learners assigned by faculty.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Date, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.database import Base

class RemedialActionType(str, enum.Enum):
    ASSIGNMENT = "ASSIGNMENT"
    EXTRA_CLASS = "EXTRA_CLASS"
    COUNSELING = "COUNSELING"
    RETEST = "RETEST"
    OTHER = "OTHER"

class RemedialActionStatus(str, enum.Enum):
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    VERIFIED = "VERIFIED"

class RemedialAction(Base):
    """
    RemedialAction model.
    Links a slow learner (Student) to a specific intervention in a SubjectOffering.
    """
    __tablename__ = "remedial_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Core Links
    student_id = Column(String, ForeignKey("students.usn"), nullable=False, index=True)
    offering_id = Column(UUID(as_uuid=True), ForeignKey("subject_offerings.id"), nullable=False, index=True)
    assigned_by_id = Column(UUID(as_uuid=True), ForeignKey("profiles.user_id"), nullable=False)
    
    # Action Details
    action_type = Column(SQLEnum(RemedialActionType), nullable=False)
    description = Column(String, nullable=False)
    deadline = Column(Date, nullable=False)
    
    # Tracking
    status = Column(SQLEnum(RemedialActionStatus), default=RemedialActionStatus.ASSIGNED, nullable=False)
    proof_url = Column(String, nullable=True) # Link to uploaded assignment/doc
    remarks = Column(String, nullable=True) # Teacher's feedback
    
    # Outcome
    impact_score = Column(Integer, nullable=True) # Improvement points (optional)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    student = relationship("Student", backref="remedial_actions")
    offering = relationship("SubjectOffering", backref="remedial_actions")
    assigned_by = relationship("Profile", foreign_keys=[assigned_by_id])
    
    def __repr__(self):
        return f"<RemedialAction {self.id}: {self.action_type} for {self.student_id}>"

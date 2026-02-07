"""
EduMetrics Backend - Semester Promotion Model

Tracks semester promotion history with HOD approval.
"""
import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey,
    Index, Text, JSON
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class SemesterPromotion(Base):
    """
    Semester promotion tracking model.
    
    Records each semester promotion event for a cohort,
    including HOD approval and student counts.
    """
    __tablename__ = "semester_promotions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Cohort being promoted
    cohort_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cohorts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Semester transition
    from_semester = Column(Integer, nullable=False)
    to_semester = Column(Integer, nullable=False)
    academic_year = Column(String(10), nullable=False)  # e.g., "2025-26"
    
    # Approval details
    approved_by = Column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id"),
        nullable=False
    )
    approved_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    approval_notes = Column(Text, nullable=True)
    
    # Student counts
    total_students = Column(Integer, nullable=False, default=0)
    students_promoted = Column(Integer, nullable=False, default=0)
    students_detained = Column(Integer, nullable=False, default=0)
    students_on_hold = Column(Integer, nullable=False, default=0)
    
    # Detailed lists (for audit)
    promoted_student_ids = Column(JSONB, nullable=True)  # List of UUIDs
    detained_student_ids = Column(JSONB, nullable=True)  # List of UUIDs
    detention_reasons = Column(JSONB, nullable=True)  # {student_id: reason}
    
    # Status
    status = Column(String(20), default="completed")  # completed, rolled_back
    rolled_back_at = Column(DateTime, nullable=True)
    rolled_back_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)
    rollback_reason = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    cohort = relationship("Cohort", back_populates="promotions")
    approver = relationship("Profile", foreign_keys=[approved_by])
    
    __table_args__ = (
        Index('ix_promotion_cohort_semester', 'cohort_id', 'from_semester'),
        Index('ix_promotion_academic_year', 'academic_year'),
    )
    
    def __repr__(self):
        return f"<SemesterPromotion cohort={self.cohort_id} {self.from_semester}→{self.to_semester}>"


class StudentSemesterStatus(Base):
    """
    Individual student semester status tracking.
    
    Tracks whether a student is promoted, detained, or on-hold
    for each semester transition.
    """
    __tablename__ = "student_semester_status"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Links to promotion event and student
    promotion_id = Column(
        UUID(as_uuid=True),
        ForeignKey("semester_promotions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    student_usn = Column(
        String,
        ForeignKey("students.usn", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Status
    status = Column(String(20), nullable=False)  # PROMOTED, DETAINED, ON_HOLD
    reason = Column(Text, nullable=True)  # For DETAINED: attendance shortage, backlog count, etc.
    
    # Additional details
    backlog_count = Column(Integer, default=0)
    attendance_percentage = Column(Integer, nullable=True)
    cgpa = Column(String(10), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    promotion = relationship("SemesterPromotion")
    student = relationship("Student")
    
    __table_args__ = (
        Index('ix_student_status_promotion', 'promotion_id', 'student_usn', unique=True),
    )

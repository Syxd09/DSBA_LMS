"""
EduMetrics Backend - Backlog Attempt Model

Tracks backlog attempt history per student per subject.
Per project outline: stores attempt history, best external score.
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column, String, Integer, Boolean, Numeric, DateTime, ForeignKey,
    Index, UniqueConstraint, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class BacklogAttempt(Base):
    """
    Backlog attempt tracking model.
    
    Tracks each attempt a student makes at a backlog exam,
    including external marks and whether internal marks are carried forward.
    """
    __tablename__ = "backlog_attempts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Student and subject offering
    student_usn = Column(
        String,
        ForeignKey("students.usn", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    offering_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subject_offerings.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Attempt details
    attempt_number = Column(Integer, nullable=False, default=1)
    exam_type = Column(String(20), nullable=False)  # EXT1, EXT2, BACKLOG, SUPPLY
    semester_attempted = Column(Integer, nullable=False)  # When attempt was made
    academic_year = Column(String(10), nullable=True)  # e.g., "2025-26"
    
    # Marks
    external_marks = Column(Numeric(5, 2), nullable=True)
    external_max_marks = Column(Numeric(5, 2), default=60)
    internal_marks_carried = Column(Numeric(5, 2), nullable=True)  # Carried forward
    internal_max_marks = Column(Numeric(5, 2), default=40)
    
    # Result
    total_marks = Column(Numeric(5, 2), nullable=True)
    result = Column(String(20), nullable=True)  # PASS, FAIL, ABSENT, DETAINED
    grade = Column(String(5), nullable=True)
    grade_points = Column(Numeric(3, 1), nullable=True)
    
    # Status flags
    is_best_attempt = Column(Boolean, default=False)
    is_cleared = Column(Boolean, default=False)
    
    # Timestamps
    exam_date = Column(DateTime, nullable=True)
    result_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Audit
    created_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)
    
    # Relationships
    student = relationship("Student", back_populates="backlog_attempts")
    offering = relationship("SubjectOffering", back_populates="backlog_attempts")
    
    __table_args__ = (
        # Composite indexes for common queries
        Index('ix_backlog_student_offering', 'student_usn', 'offering_id'),
        Index('ix_backlog_student_result', 'student_usn', 'result'),
        Index('ix_backlog_offering_semester', 'offering_id', 'semester_attempted'),
        
        # Unique constraint: one attempt per attempt number per student per offering
        UniqueConstraint(
            'student_usn', 'offering_id', 'attempt_number',
            name='uq_backlog_attempt'
        ),
        
        # Check constraints
        CheckConstraint('attempt_number > 0', name='ck_backlog_positive_attempt'),
        CheckConstraint(
            'external_marks IS NULL OR (external_marks >= 0 AND external_marks <= external_max_marks)',
            name='ck_backlog_external_marks_range'
        ),
    )
    
    def __repr__(self):
        return f"<BacklogAttempt student={self.student_usn} offering={self.offering_id} attempt={self.attempt_number}>"
    
    @property
    def is_passed(self) -> bool:
        """Check if this attempt resulted in a pass."""
        return self.result == "PASS"
    
    def calculate_total(self) -> Optional[float]:
        """Calculate total marks from internal + external."""
        if self.external_marks is None:
            return None
        internal = float(self.internal_marks_carried or 0)
        external = float(self.external_marks)
        return internal + external

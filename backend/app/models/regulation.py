"""
EduMetrics Backend - Regulation Model

Academic regulation versioning for different batches.
Supports different Bloom's taxonomy versions, weightages, and thresholds.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Boolean, Numeric, DateTime, ForeignKey,
    Index, UniqueConstraint, Text
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class Regulation(Base):
    """
    Academic regulation model.
    
    Defines versioned academic rules that apply to specific batches:
    - Bloom's taxonomy version (old vs revised)
    - Internal/External weightages
    - CO attainment thresholds
    - Grading scales
    """
    __tablename__ = "regulations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # College association
    college_id = Column(
        UUID(as_uuid=True),
        ForeignKey("colleges.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Regulation identity
    year = Column(Integer, nullable=False)  # e.g., 2021, 2023
    name = Column(String(50), nullable=False)  # e.g., "R-2021", "NEP-2020"
    code = Column(String(20), nullable=False)  # Short code
    description = Column(Text, nullable=True)
    
    # Bloom's taxonomy settings
    bloom_version = Column(String(20), default="revised")  # old, revised
    
    # Assessment weightages (should sum to 100)
    internal_weightage = Column(Integer, default=40)
    external_weightage = Column(Integer, default=60)
    
    # Internal component weightages (should sum to internal_weightage)
    internal_exam_weightage = Column(Numeric(5, 2), default=15.0)  # Two exams
    assignment_weightage = Column(Numeric(5, 2), default=10.0)     # Two assignments
    attendance_weightage = Column(Numeric(5, 2), default=5.0)
    activity_weightage = Column(Numeric(5, 2), default=5.0)
    other_weightage = Column(Numeric(5, 2), default=5.0)           # Labs, projects, etc.
    
    # CO Attainment thresholds (percentage of students meeting target)
    co_threshold_level1 = Column(Numeric(5, 2), default=40.0)  # Low
    co_threshold_level2 = Column(Numeric(5, 2), default=60.0)  # Medium
    co_threshold_level3 = Column(Numeric(5, 2), default=75.0)  # High
    
    # PO Attainment thresholds
    po_threshold_level1 = Column(Numeric(5, 2), default=1.0)
    po_threshold_level2 = Column(Numeric(5, 2), default=2.0)
    po_threshold_level3 = Column(Numeric(5, 2), default=3.0)
    
    # Grading scale reference
    grade_scale_id = Column(UUID(as_uuid=True), ForeignKey("grade_scales.id"), nullable=True)
    
    # Pass criteria
    min_attendance_percentage = Column(Integer, default=75)
    min_internal_marks = Column(Numeric(5, 2), default=16.0)  # 40% of 40
    min_external_marks = Column(Numeric(5, 2), default=24.0)  # 40% of 60
    min_total_marks = Column(Numeric(5, 2), default=40.0)
    max_backlogs_for_promotion = Column(Integer, default=4)
    
    # Additional settings as JSON
    additional_rules = Column(JSONB, nullable=True)  # Flexible extension
    
    # Versioning
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    effective_from = Column(DateTime, nullable=True)  # When this regulation starts
    effective_until = Column(DateTime, nullable=True)  # Optional end date
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)
    
    # Relationships
    college = relationship("College", back_populates="regulations")
    cohorts = relationship("Cohort", back_populates="regulation")
    grade_scale = relationship("GradeScale")
    
    __table_args__ = (
        # Unique regulation per college per year
        UniqueConstraint('college_id', 'code', name='uq_regulation_college_code'),
        Index('ix_regulation_college_year', 'college_id', 'year'),
        Index('ix_regulation_active', 'is_active'),
    )
    
    def __repr__(self):
        return f"<Regulation {self.name} ({self.year})>"
    
    @property
    def total_internal_weightage(self) -> float:
        """Calculate total internal component weightage."""
        return sum([
            float(self.internal_exam_weightage or 0),
            float(self.assignment_weightage or 0),
            float(self.attendance_weightage or 0),
            float(self.activity_weightage or 0),
            float(self.other_weightage or 0),
        ])
    
    def get_co_level(self, attainment_percentage: float) -> int:
        """
        Get CO attainment level based on percentage.
        
        Returns:
            0: Below threshold
            1: Level 1
            2: Level 2
            3: Level 3
        """
        if attainment_percentage >= float(self.co_threshold_level3):
            return 3
        elif attainment_percentage >= float(self.co_threshold_level2):
            return 2
        elif attainment_percentage >= float(self.co_threshold_level1):
            return 1
        return 0

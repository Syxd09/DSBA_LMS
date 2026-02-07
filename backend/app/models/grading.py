"""
EduMetrics Backend - Grading Models
GradingRule and GradeScale models
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Numeric, DateTime, ForeignKey, Text,
    Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class GradeScale(Base):
    """
    Grading Scale definition (e.g. Absolute, Relative, R-2021).
    Container for grading rules.
    """
    __tablename__ = "grade_scales"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    rules = relationship("GradingRule", back_populates="grade_scale", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<GradeScale {self.name}>"


class GradingRule(Base):
    """
    Individual grading rule (e.g. 90-100% -> S grade).
    Belongs to a GradeScale.
    """
    __tablename__ = "grading_rules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Parent Scale
    grade_scale_id = Column(
        UUID(as_uuid=True),
        ForeignKey("grade_scales.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    grade = Column(String(2), nullable=False)  # S, A, B, etc.
    min_percentage = Column(Numeric(5, 2), nullable=False)
    max_percentage = Column(Numeric(5, 2), nullable=False)
    grade_point = Column(Numeric(3, 1), nullable=False)  # 10.0, 9.0
    
    description = Column(String(100), nullable=True)  # Outstanding, Excellent
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    grade_scale = relationship("GradeScale", back_populates="rules")
    
    __table_args__ = (
        # Ensure no overlapping ranges for same scale (simplified check)
        UniqueConstraint('grade_scale_id', 'grade', name='uq_grading_rule_grade'),
        Index('ix_grading_rule_range', 'grade_scale_id', 'min_percentage', 'max_percentage'),
    )
    
    def __repr__(self):
        return f"<GradingRule {self.grade}: {self.min_percentage}-{self.max_percentage}%>"

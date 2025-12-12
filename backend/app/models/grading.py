"""
EduMetrics Backend - Grading Models
GradingRule model
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Numeric, DateTime
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class GradingRule(Base):
    """Grading scale configuration."""
    __tablename__ = "grading_rules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grade = Column(String(2), nullable=False)
    min_percentage = Column(Numeric(5, 2), nullable=False)
    max_percentage = Column(Numeric(5, 2), nullable=False)
    grade_point = Column(Numeric(3, 1), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<GradingRule {self.grade}: {self.min_percentage}-{self.max_percentage}%>"

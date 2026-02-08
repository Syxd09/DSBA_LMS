"""
EduMetrics Backend - Configuration Models
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, Numeric, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class AttainmentConfig(Base):
    """
    Configuration for attainment calculation thresholds.
    
    Versioned by effective_year (e.g., regulations changes).
    Levels 1, 2, 3 correspond to Low, Medium, High attainment targets.
    """
    __tablename__ = "attainment_configs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"), nullable=False)
    effective_year = Column(Integer, nullable=False)  # Applies to cohorts from this year onwards
    
    # Thresholds (percentage of students achieving target)
    level_1_threshold = Column(Numeric(5, 2), default=50.0, nullable=False)
    level_2_threshold = Column(Numeric(5, 2), default=60.0, nullable=False)
    level_3_threshold = Column(Numeric(5, 2), default=70.0, nullable=False)
    
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    program = relationship("Program", back_populates="attainment_configs")
    
    def __repr__(self):
        return f"<AttainmentConfig {self.program_id} ({self.effective_year})>"

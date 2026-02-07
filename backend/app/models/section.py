"""
EduMetrics Backend - Section Model
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Section(Base):
    """Section model - A/B/C divisions within a cohort."""
    __tablename__ = "sections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id"), nullable=False)
    name = Column(String, nullable=False)  # A, B, C
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    cohort = relationship("Cohort", back_populates="sections")
    students = relationship("Student", back_populates="section")
    
    def __repr__(self):
        return f"<Section {self.name}>"

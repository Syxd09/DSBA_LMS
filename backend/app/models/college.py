"""
EduMetrics Backend - College Model (Multi-Tenant Root)
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class College(Base):
    """College model - top-level tenant for multi-college support."""
    __tablename__ = "colleges"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)  # e.g., "VTU-BLR"
    university = Column(String, nullable=False)
    status = Column(String, default="active", nullable=False)  # active, inactive
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    departments = relationship("Department", back_populates="college")
    regulations = relationship("Regulation", back_populates="college")
    
    def __repr__(self):
        return f"<College {self.code}: {self.name}>"

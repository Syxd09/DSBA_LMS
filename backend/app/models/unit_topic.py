"""
EduMetrics Backend - Unit and Topic Models
For granular weakness detection and NBA analytics.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Unit(Base):
    """Unit model - grouping of topics within a subject offering."""
    __tablename__ = "units"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    offering_id = Column(UUID(as_uuid=True), ForeignKey("subject_offerings.id"), nullable=False)
    unit_no = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    offering = relationship("SubjectOffering", back_populates="units")
    topics = relationship("Topic", back_populates="unit", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="unit")
    sub_questions = relationship("SubQuestion", back_populates="unit")
    
    def __repr__(self):
        return f"<Unit {self.unit_no}: {self.name}>"


class Topic(Base):
    """Topic model - granular topic for weakness detection."""
    __tablename__ = "topics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    unit_id = Column(UUID(as_uuid=True), ForeignKey("units.id"), nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    unit = relationship("Unit", back_populates="topics")
    questions = relationship("Question", back_populates="topic")
    sub_questions = relationship("SubQuestion", back_populates="topic")
    
    def __repr__(self):
        return f"<Topic {self.name}>"

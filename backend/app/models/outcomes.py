"""
EduMetrics Backend - Outcome Models
CourseOutcome, ProgramOutcome, CO-PO Mapping models
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class CourseOutcome(Base):
    """Course Outcome (CO) model."""
    __tablename__ = "course_outcomes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    co_number = Column(Integer, nullable=False)
    description = Column(String, nullable=False)
    bloom_level = Column(String, nullable=False)  # Remember, Understand, Apply, Analyze, Evaluate, Create
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    subject = relationship("Subject", back_populates="course_outcomes")
    co_po_mappings = relationship("COPOMapping", back_populates="course_outcome")
    questions = relationship("Question", back_populates="course_outcome")
    sub_questions = relationship("SubQuestion", back_populates="course_outcome")
    
    def __repr__(self):
        return f"<CourseOutcome CO{self.co_number}>"


class ProgramOutcome(Base):
    """Program Outcome (PO) model."""
    __tablename__ = "program_outcomes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"), nullable=False)
    po_number = Column(Integer, nullable=False)
    description = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    program = relationship("Program", back_populates="program_outcomes")
    co_po_mappings = relationship("COPOMapping", back_populates="program_outcome")
    
    def __repr__(self):
        return f"<ProgramOutcome PO{self.po_number}>"


class COPOMapping(Base):
    """CO to PO mapping with correlation level."""
    __tablename__ = "co_po_mappings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    co_id = Column(UUID(as_uuid=True), ForeignKey("course_outcomes.id"), nullable=False)
    po_id = Column(UUID(as_uuid=True), ForeignKey("program_outcomes.id"), nullable=False)
    correlation_level = Column(Integer, nullable=False)  # 1=Low, 2=Medium, 3=High
    
    # Relationships
    course_outcome = relationship("CourseOutcome", back_populates="co_po_mappings")
    program_outcome = relationship("ProgramOutcome", back_populates="co_po_mappings")
    
    def __repr__(self):
        return f"<COPOMapping CO->PO ({self.correlation_level})>"

"""
EduMetrics Backend - Outcome Models
CourseOutcome, ProgramOutcome, CO-PO Mapping models

ARCHITECTURE RULES (LOCKED):
- CourseOutcome attaches to SubjectOffering (the ONLY academic anchor)
- subject_id is LEGACY only - new COs must use offering_id
- FIX #3: Exactly ONE of subject_id or offering_id must be non-null (enforced at DB level)
- Bloom version inferred from bloom_id, never stored redundantly
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class CourseOutcome(Base):
    """
    Course Outcome (CO) model.
    
    COs are defined per SubjectOffering, not per Subject.
    This ensures old batches retain their COs even when
    new regulations introduce changes.
    
    CONSTRAINT: Exactly one of subject_id or offering_id must be set.
    - subject_id = legacy data only
    - offering_id = new data (SubjectOffering is the anchor)
    """
    __tablename__ = "course_outcomes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    offering_id = Column(UUID(as_uuid=True), ForeignKey("subject_offerings.id"), nullable=True)  # NEW: The anchor
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=True)  # Legacy ONLY
    co_code = Column(String, nullable=False)  # "CO1", "CO2" - more flexible than integer
    co_number = Column(Integer, nullable=False)  # Numeric order for sorting
    description = Column(String, nullable=False)
    bloom_id = Column(UUID(as_uuid=True), ForeignKey("bloom_taxonomy.id"), nullable=True)  # Reference table
    bloom_level = Column(String, nullable=True)  # Legacy string field
    threshold = Column(Numeric(5, 2), default=60.0, nullable=False)  # Configurable per CO
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # FIX #3: Check constraint - exactly one parent must be set
    __table_args__ = (
        CheckConstraint(
            '(subject_id IS NOT NULL AND offering_id IS NULL) OR (subject_id IS NULL AND offering_id IS NOT NULL)',
            name='ck_course_outcomes_single_parent'
        ),
    )
    
    # Relationships
    offering = relationship("SubjectOffering", back_populates="course_outcomes")
    subject = relationship("Subject", back_populates="course_outcomes")  # Legacy
    bloom = relationship("Bloom", back_populates="course_outcomes")
    co_po_mappings = relationship("COPOMapping", back_populates="course_outcome")
    co_pso_mappings = relationship("COPSOMapping", back_populates="course_outcome")  # NEW: PSO mapping
    questions = relationship("Question", back_populates="course_outcome")
    sub_questions = relationship("SubQuestion", back_populates="course_outcome")
    
    def __repr__(self):
        return f"<CourseOutcome {self.co_code}>"


class ProgramOutcome(Base):
    """
    Program Outcome (PO) model.
    
    POs are fixed per program but may have per-year thresholds.
    """
    __tablename__ = "program_outcomes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"), nullable=False)
    po_code = Column(String, nullable=False)  # "PO1", "PO2"
    po_number = Column(Integer, nullable=False)
    description = Column(String, nullable=False)
    threshold = Column(Numeric(5, 2), default=60.0, nullable=False)  # Configurable threshold
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    program = relationship("Program", back_populates="program_outcomes")
    co_po_mappings = relationship("COPOMapping", back_populates="program_outcome")
    
    def __repr__(self):
        return f"<ProgramOutcome {self.po_code}>"


class COPOMapping(Base):
    """
    CO to PO mapping with correlation level.
    
    Versioned by year to allow year-wise changes.
    """
    __tablename__ = "co_po_mappings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    co_id = Column(UUID(as_uuid=True), ForeignKey("course_outcomes.id"), nullable=False)
    po_id = Column(UUID(as_uuid=True), ForeignKey("program_outcomes.id"), nullable=False)
    correlation_level = Column(Integer, nullable=False)  # 1=Low, 2=Medium, 3=High
    version_year = Column(Integer, nullable=True)  # For year-wise versioning
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    course_outcome = relationship("CourseOutcome", back_populates="co_po_mappings")
    program_outcome = relationship("ProgramOutcome", back_populates="co_po_mappings")
    
    def __repr__(self):
        return f"<COPOMapping {self.co_id}->{self.po_id} ({self.correlation_level})>"


class ProgramSpecificOutcome(Base):
    """
    Program Specific Outcome (PSO) model.
    
    PSOs are program-specific outcomes that complement POs.
    Typically 2-4 per program, focused on domain-specific skills.
    
    Example for BCA:
    - PSO1: Apply programming skills to solve real-world problems
    - PSO2: Design and develop software applications
    """
    __tablename__ = "program_specific_outcomes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"), nullable=False)
    pso_code = Column(String, nullable=False)  # "PSO1", "PSO2"
    pso_number = Column(Integer, nullable=False)
    description = Column(String, nullable=False)
    threshold = Column(Numeric(5, 2), default=60.0, nullable=False)  # Configurable threshold
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    program = relationship("Program", back_populates="program_specific_outcomes")
    co_pso_mappings = relationship("COPSOMapping", back_populates="program_specific_outcome")
    
    def __repr__(self):
        return f"<ProgramSpecificOutcome {self.pso_code}>"


class COPSOMapping(Base):
    """
    CO to PSO mapping with correlation level.
    
    Similar to CO-PO mapping but for Program Specific Outcomes.
    Versioned by year to allow changes across regulations.
    """
    __tablename__ = "co_pso_mappings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    co_id = Column(UUID(as_uuid=True), ForeignKey("course_outcomes.id"), nullable=False)
    pso_id = Column(UUID(as_uuid=True), ForeignKey("program_specific_outcomes.id"), nullable=False)
    correlation_level = Column(Integer, nullable=False)  # 1=Low, 2=Medium, 3=High
    version_year = Column(Integer, nullable=True)  # For year-wise versioning
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    course_outcome = relationship("CourseOutcome", back_populates="co_pso_mappings")
    program_specific_outcome = relationship("ProgramSpecificOutcome", back_populates="co_pso_mappings")
    
    def __repr__(self):
        return f"<COPSOMapping {self.co_id}->{self.pso_id} ({self.correlation_level})>"


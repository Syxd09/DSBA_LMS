"""
EduMetrics Backend - Organization Models
Department, Program, Cohort models
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Department(Base):
    """Academic department model."""
    __tablename__ = "departments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    college_id = Column(UUID(as_uuid=True), ForeignKey("colleges.id"), nullable=True)  # NEW: Multi-tenant
    name = Column(String, nullable=False)
    code = Column(String, nullable=False, unique=True)
    hod_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    college = relationship("College", back_populates="departments")
    programs = relationship("Program", back_populates="department")
    
    def __repr__(self):
        return f"<Department {self.code}: {self.name}>"


class Program(Base):
    """Academic program model (e.g., BCA, BBA)."""
    __tablename__ = "programs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False, unique=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)
    duration_years = Column(Integer, default=3, nullable=False)  # Kept for backward compat
    duration_semesters = Column(Integer, default=6, nullable=False)  # NEW: Semester-based duration
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    department = relationship("Department", back_populates="programs")
    cohorts = relationship("Cohort", back_populates="program")
    curriculum_versions = relationship("CurriculumVersion", back_populates="program")
    program_outcomes = relationship("ProgramOutcome", back_populates="program")
    program_specific_outcomes = relationship("ProgramSpecificOutcome", back_populates="program")  # NEW: PSO
    subject_offerings = relationship("SubjectOffering", back_populates="program")
    attainment_configs = relationship("AttainmentConfig", back_populates="program", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Program {self.code}: {self.name}>"


class Cohort(Base):
    """Student cohort/batch model."""
    __tablename__ = "cohorts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"), nullable=False)
    regulation_id = Column(UUID(as_uuid=True), ForeignKey("regulations.id"), nullable=True)  # NEW: Link to regulation
    year = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    current_semester = Column(Integer, default=1, nullable=False)
    status = Column(String, default="active", nullable=False)  # active, completed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    program = relationship("Program", back_populates="cohorts")
    regulation = relationship("Regulation", back_populates="cohorts")  # NEW
    sections = relationship("Section", back_populates="cohort")
    students = relationship("Student", back_populates="cohort", cascade="all, delete-orphan")
    subject_offerings = relationship("SubjectOffering", back_populates="cohort")
    student_enrollments = relationship("StudentEnrollment", back_populates="cohort")  # Legacy
    exams = relationship("Exam", back_populates="cohort")
    teacher_assignments = relationship("TeacherAssignment", back_populates="cohort")
    promotions = relationship("SemesterPromotion", back_populates="cohort")  # NEW
    semesters = relationship("Semester", back_populates="cohort")  # Fixed: Missing relationship
    
    def __repr__(self):
        return f"<Cohort {self.name} ({self.year})>"

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
    name = Column(String, nullable=False, unique=True)
    code = Column(String, nullable=False, unique=True)
    hod_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
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
    duration_years = Column(Integer, default=3, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    department = relationship("Department", back_populates="programs")
    cohorts = relationship("Cohort", back_populates="program")
    curriculum_versions = relationship("CurriculumVersion", back_populates="program")
    program_outcomes = relationship("ProgramOutcome", back_populates="program")
    
    def __repr__(self):
        return f"<Program {self.code}: {self.name}>"


class Cohort(Base):
    """Student cohort/batch model."""
    __tablename__ = "cohorts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"), nullable=False)
    year = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    current_semester = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    program = relationship("Program", back_populates="cohorts")
    student_enrollments = relationship("StudentEnrollment", back_populates="cohort")
    exams = relationship("Exam", back_populates="cohort")
    teacher_assignments = relationship("TeacherAssignment", back_populates="cohort")
    
    def __repr__(self):
        return f"<Cohort {self.name} ({self.year})>"

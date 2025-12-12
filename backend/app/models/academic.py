"""
EduMetrics Backend - Academic Models
Subject, CurriculumVersion models
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class CurriculumVersion(Base):
    """Curriculum version model for version control."""
    __tablename__ = "curriculum_versions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"), nullable=False)
    version_name = Column(String, nullable=False)
    effective_from = Column(Integer, nullable=False)  # Year
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    program = relationship("Program", back_populates="curriculum_versions")
    subjects = relationship("Subject", back_populates="curriculum_version")
    
    def __repr__(self):
        return f"<CurriculumVersion {self.version_name}>"


class Subject(Base):
    """Academic subject model."""
    __tablename__ = "subjects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False, unique=True)
    credits = Column(Integer, default=3, nullable=False)
    semester = Column(Integer, nullable=False)
    curriculum_version_id = Column(UUID(as_uuid=True), ForeignKey("curriculum_versions.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    curriculum_version = relationship("CurriculumVersion", back_populates="subjects")
    course_outcomes = relationship("CourseOutcome", back_populates="subject")
    exams = relationship("Exam", back_populates="subject")
    teacher_assignments = relationship("TeacherAssignment", back_populates="subject")
    final_marks = relationship("FinalMarks", back_populates="subject")
    
    def __repr__(self):
        return f"<Subject {self.code}: {self.name}>"


class StudentEnrollment(Base):
    """Student enrollment in a cohort."""
    __tablename__ = "student_enrollments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id"), nullable=False)
    roll_number = Column(String, nullable=False, unique=True)
    status = Column(String, default="active", nullable=False)  # active, promoted, detained, graduated
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    cohort = relationship("Cohort", back_populates="student_enrollments")
    
    def __repr__(self):
        return f"<StudentEnrollment {self.roll_number}>"


class TeacherAssignment(Base):
    """Teacher assignment to subject and cohort."""
    __tablename__ = "teacher_assignments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id"), nullable=False)
    academic_year = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    subject = relationship("Subject", back_populates="teacher_assignments")
    cohort = relationship("Cohort", back_populates="teacher_assignments")
    
    def __repr__(self):
        return f"<TeacherAssignment {self.teacher_id} -> {self.subject_id}>"

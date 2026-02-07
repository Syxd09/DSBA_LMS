"""
EduMetrics Backend - Academic Models
Subject, CurriculumVersion, StudentEnrollment, TeacherAssignment models

NOTE: Subject is now a MASTER/REFERENCE entity only.
All academic operations attach to SubjectOffering, not Subject.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class CurriculumVersion(Base):
    """Curriculum version model for regulation version control."""
    __tablename__ = "curriculum_versions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"), nullable=False)
    version_name = Column(String, nullable=False)  # e.g., "2021 Regulation"
    effective_from = Column(Integer, nullable=False)  # Year
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    program = relationship("Program", back_populates="curriculum_versions")
    subjects = relationship("Subject", back_populates="curriculum_version")
    
    def __repr__(self):
        return f"<CurriculumVersion {self.version_name}>"


class Subject(Base):
    """
    Academic subject model - MASTER/REFERENCE ENTITY ONLY.
    
    Subject is a catalog entry. Actual academic operations
    (COs, Exams, Analytics) attach to SubjectOffering.
    
    NOTE: Subject.code is no longer globally unique.
    Same code can exist across different programs.
    """
    __tablename__ = "subjects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)  # NOT unique globally anymore
    credits = Column(Integer, default=3, nullable=False)
    subject_type = Column(String, default="core", nullable=False)  # core, elective, lab
    semester = Column(Integer, nullable=True)  # Default semester (can vary by offering)
    curriculum_version_id = Column(UUID(as_uuid=True), ForeignKey("curriculum_versions.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    curriculum_version = relationship("CurriculumVersion", back_populates="subjects")
    offerings = relationship("SubjectOffering", back_populates="subject")
    # Legacy relationships (to be migrated)
    course_outcomes = relationship("CourseOutcome", back_populates="subject")
    exams = relationship("Exam", back_populates="subject")
    teacher_assignments = relationship("TeacherAssignment", back_populates="subject")
    final_marks = relationship("FinalMarks", back_populates="subject")
    
    def __repr__(self):
        return f"<Subject {self.code}: {self.name}>"


class StudentEnrollment(Base):
    """
    LEGACY: Student enrollment in a cohort.
    
    This is the old enrollment model. New Student model with USN as PK
    should be used for new implementations. This is kept for backward
    compatibility during migration.
    """
    __tablename__ = "student_enrollments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id"), nullable=False)
    roll_number = Column(String, nullable=False, unique=True)
    usn = Column(String, nullable=True, index=True)  # NEW: For migration to Student table
    status = Column(String, default="active", nullable=False)  # active, promoted, detained, graduated
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    cohort = relationship("Cohort", back_populates="student_enrollments")
    student = relationship("Profile", primaryjoin="foreign(StudentEnrollment.student_id)==Profile.user_id", uselist=False)
    
    def __repr__(self):
        return f"<StudentEnrollment {self.roll_number}>"


class TeacherAssignment(Base):
    """
    Teacher assignment to subject offering and cohort.
    
    Links faculty to the subjects they teach for a specific cohort.
    """
    __tablename__ = "teacher_assignments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    offering_id = Column(UUID(as_uuid=True), ForeignKey("subject_offerings.id"), nullable=True)  # NEW
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=True)  # Legacy
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id"), nullable=False)
    academic_year = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    offering = relationship("SubjectOffering", back_populates="teacher_assignments")
    subject = relationship("Subject", back_populates="teacher_assignments")  # Legacy
    cohort = relationship("Cohort", back_populates="teacher_assignments")
    teacher = relationship("Profile", primaryjoin="foreign(TeacherAssignment.teacher_id)==Profile.user_id", uselist=False)
    
    def __repr__(self):
        return f"<TeacherAssignment {self.teacher_id} -> {self.offering_id or self.subject_id}>"

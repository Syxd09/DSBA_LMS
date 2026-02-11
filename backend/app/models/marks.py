"""
EduMetrics Backend - Marks Models
StudentMarks, StudentQuestionMark, FinalMarks, SemesterResult models

IMPORTANT: MarksComputed has been REMOVED per the "no stored analytics" rule.
FinalMarks stores ONLY raw input marks - computed values are derived on-demand.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class StudentMarks(Base):
    """
    LEGACY: Raw student marks per sub-question.
    
    Being replaced by StudentQuestionMark which uses USN.
    Kept for backward compatibility during migration.
    """
    __tablename__ = "student_marks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    sub_question_id = Column(UUID(as_uuid=True), ForeignKey("sub_questions.id"), nullable=False)
    marks = Column(Numeric(5, 2), nullable=False)
    entered_by = Column(UUID(as_uuid=True), nullable=True)
    entered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    version = Column(Integer, default=1, nullable=False)  # Optimistic locking
    
    # Relationships
    exam = relationship("Exam", back_populates="student_marks")
    sub_question = relationship("SubQuestion", back_populates="student_marks")
    student = relationship("Profile", primaryjoin="foreign(StudentMarks.student_id)==Profile.user_id", uselist=False)
    
    def __repr__(self):
        return f"<StudentMarks {self.student_id}: {self.marks}>"


class StudentQuestionMark(Base):
    """
    Student marks per sub-question (CLARIFICATION #4).
    
    Marks are stored at the lowest evaluable unit (sub-question level).
    Parent question marks are derived, NOT stored.
    Uses USN as student identifier.
    """
    __tablename__ = "student_question_marks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    usn = Column(String, ForeignKey("students.usn"), nullable=False, index=True)
    sub_question_id = Column(UUID(as_uuid=True), ForeignKey("sub_questions.id"), nullable=False)
    marks = Column(Numeric(5, 2), nullable=False)
    entered_by = Column(UUID(as_uuid=True), nullable=True)
    entered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    version = Column(Integer, default=1, nullable=False)  # Optimistic locking
    
    # Relationships
    student = relationship("Student", back_populates="question_marks")
    exam = relationship("Exam", back_populates="question_marks")
    sub_question = relationship("SubQuestion", back_populates="question_marks")
    
    def __repr__(self):
        return f"<StudentQuestionMark {self.usn}: {self.marks}>"


# NOTE: MarksComputed has been REMOVED
# It was storing computed totals which violates "no stored analytics" rule.
# All computed values (Best-N selection, totals) must be calculated on-demand.


class FinalMarks(Base):
    """
    Final marks for a subject - RAW INPUTS ONLY (CLARIFICATION #5).
    
    This is NOT authoritative - it's a cache of raw inputs.
    REMOVED: best_internal, total_marks, percentage, grade, grade_point
    These are all COMPUTED on-demand, not stored.
    
    Any edit to raw marks invalidates downstream calculations.
    """
    __tablename__ = "final_marks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usn = Column(String, ForeignKey("students.usn"), nullable=True, index=True)  # NEW: USN-based
    student_id = Column(UUID(as_uuid=True), nullable=True, index=True)  # Legacy
    offering_id = Column(UUID(as_uuid=True), ForeignKey("subject_offerings.id"), nullable=True)  # NEW
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=True)  # Legacy
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id"), nullable=False)
    
    # RAW INPUT MARKS ONLY - no computed values
    internal_1 = Column(Numeric(5, 2), nullable=True)  # Raw scaled internal 1
    internal_2 = Column(Numeric(5, 2), nullable=True)  # Raw scaled internal 2
    assignment_1 = Column(Numeric(4, 2), nullable=True)  # NEW: 0-5
    assignment_2 = Column(Numeric(4, 2), nullable=True)  # NEW: 0-5
    attendance = Column(Numeric(4, 2), nullable=True)  # NEW: 0-5
    activity = Column(Numeric(4, 2), nullable=True)  # NEW: 0-5
    external_marks = Column(Numeric(5, 2), nullable=True)  # Raw external
    
    # Backlog tracking
    attempt_number = Column(Integer, default=1, nullable=False)  # NEW
    is_backlog = Column(Boolean, default=False, nullable=False)  # NEW
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    version = Column(Integer, default=1, nullable=False)  # Optimistic locking
    
    # Relationships
    student = relationship("Student", back_populates="final_marks")
    subject = relationship("Subject", back_populates="final_marks")  # Legacy
    
    def __repr__(self):
        return f"<FinalMarks {self.usn or self.student_id}>"


# Import Boolean for is_backlog field
from sqlalchemy import Boolean


class SemesterResult(Base):
    """
    Semester-wise results with SGPA/CGPA.
    
    NOTE: SGPA and CGPA are stored here as they represent
    official university-declared results, not computed analytics.
    """
    __tablename__ = "semester_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usn = Column(String, ForeignKey("students.usn"), nullable=True, index=True)  # NEW
    student_id = Column(UUID(as_uuid=True), nullable=True, index=True)  # Legacy
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id"), nullable=False)
    semester = Column(Integer, nullable=False)
    total_credits = Column(Integer, nullable=True)
    earned_credits = Column(Integer, nullable=True)
    sgpa = Column(Numeric(4, 2), nullable=True)
    cgpa = Column(Numeric(4, 2), nullable=True)
    status = Column(String, default="pass", nullable=False)  # pass, fail, detained
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    student = relationship("Student", back_populates="semester_results")
    cohort = relationship("Cohort")
    
    def __repr__(self):
        return f"<SemesterResult Sem{self.semester}: SGPA {self.sgpa}>"

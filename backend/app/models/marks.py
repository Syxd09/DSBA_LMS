"""
EduMetrics Backend - Marks Models
StudentMarks, MarksComputed, FinalMarks models
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class StudentMarks(Base):
    """Raw student marks per sub-question."""
    __tablename__ = "student_marks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    sub_question_id = Column(UUID(as_uuid=True), ForeignKey("sub_questions.id"), nullable=False)
    marks = Column(Numeric(5, 2), nullable=False)
    entered_by = Column(UUID(as_uuid=True), nullable=True)
    entered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    exam = relationship("Exam", back_populates="student_marks")
    sub_question = relationship("SubQuestion", back_populates="student_marks")
    
    def __repr__(self):
        return f"<StudentMarks {self.student_id}: {self.marks}>"


class MarksComputed(Base):
    """Computed final marks after selection (Best-N, etc.)."""
    __tablename__ = "marks_computed"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    total_marks = Column(Numeric(5, 2), nullable=False)
    selected_questions = Column(JSONB, default=list, nullable=False)  # List of selected question IDs
    computed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    exam = relationship("Exam", back_populates="marks_computed")
    
    def __repr__(self):
        return f"<MarksComputed {self.student_id}: {self.total_marks}>"


class FinalMarks(Base):
    """Final marks with grade for a subject."""
    __tablename__ = "final_marks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id"), nullable=False)
    internal_1 = Column(Numeric(5, 2), nullable=True)
    internal_2 = Column(Numeric(5, 2), nullable=True)
    best_internal = Column(Numeric(5, 2), nullable=True)
    external_marks = Column(Numeric(5, 2), nullable=True)
    total_marks = Column(Numeric(5, 2), nullable=True)
    percentage = Column(Numeric(5, 2), nullable=True)
    grade = Column(String(2), nullable=True)
    grade_point = Column(Numeric(3, 1), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    subject = relationship("Subject", back_populates="final_marks")
    
    def __repr__(self):
        return f"<FinalMarks {self.student_id}: {self.grade}>"


class SemesterResult(Base):
    """Semester-wise results with SGPA/CGPA."""
    __tablename__ = "semester_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    cohort_id = Column(UUID(as_uuid=True), ForeignKey("cohorts.id"), nullable=False)
    semester = Column(Integer, nullable=False)
    total_credits = Column(Integer, nullable=True)
    earned_credits = Column(Integer, nullable=True)
    sgpa = Column(Numeric(4, 2), nullable=True)
    cgpa = Column(Numeric(4, 2), nullable=True)
    status = Column(String, default="pass", nullable=False)  # pass, fail, detained
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<SemesterResult Sem{self.semester}: SGPA {self.sgpa}>"

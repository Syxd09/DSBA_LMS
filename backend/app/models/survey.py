"""
EduMetrics Backend - Survey Models (Indirect Attainment)

Support for NBA Indirect Attainment via:
- Course Exit Surveys
- Program Exit Surveys
- Alumni Surveys

Architecture:
- Survey linked to Program & Academic Year
- Questions mapped to specific POs/PSOs
- Responses used for Indirect Attainment calculation
"""
import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base

class SurveyType(str, Enum):
    COURSE_EXIT = "COURSE_EXIT"
    PROGRAM_EXIT = "PROGRAM_EXIT"
    ALUMNI = "ALUMNI"
    EMPLOYER = "EMPLOYER"

class Survey(Base):
    """
    Survey definition.
    Example: "B.Tech CSE 2025 Program Exit Survey"
    """
    __tablename__ = "surveys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    survey_type = Column(String, nullable=False)  # usage check: SurveyType enum
    
    # Scope
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"), nullable=False)
    academic_year = Column(Integer, nullable=False)  # e.g., 2025
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("profiles.user_id"), nullable=False)
    
    # Relationships
    program = relationship("Program")
    questions = relationship("SurveyQuestion", back_populates="survey", cascade="all, delete-orphan")
    responses = relationship("SurveyResponse", back_populates="survey")

    def __repr__(self):
        return f"<Survey {self.title}>"


class SurveyQuestion(Base):
    """
    Individual question in a survey.
    MUST be mapped to a PO or PSO for attainment calculation.
    """
    __tablename__ = "survey_questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    survey_id = Column(UUID(as_uuid=True), ForeignKey("surveys.id"), nullable=False)
    
    question_text = Column(String, nullable=False)
    sequence = Column(Integer, default=0)
    
    # Mapping (Optional but recommended for NBA)
    mapped_po_id = Column(UUID(as_uuid=True), ForeignKey("program_outcomes.id"), nullable=True)
    mapped_pso_id = Column(UUID(as_uuid=True), ForeignKey("program_specific_outcomes.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    survey = relationship("Survey", back_populates="questions")
    program_outcome = relationship("ProgramOutcome")
    program_specific_outcome = relationship("ProgramSpecificOutcome")
    responses = relationship("SurveyQuestionResponse", back_populates="question")

    def __repr__(self):
        return f"<SurveyQuestion {self.question_text[:20]}...>"


class SurveyResponse(Base):
    """
    A student's submission of a survey.
    """
    __tablename__ = "survey_responses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    survey_id = Column(UUID(as_uuid=True), ForeignKey("surveys.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("profiles.user_id"), nullable=False)
    
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    survey = relationship("Survey", back_populates="responses")
    student = relationship("Profile")
    answers = relationship("SurveyQuestionResponse", back_populates="response", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<SurveyResponse {self.survey_id} - {self.student_id}>"


class SurveyQuestionResponse(Base):
    """
    Answer to a specific question.
    Score: 1-5 (Likert scale) typically used for NBA.
    """
    __tablename__ = "survey_question_responses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    response_id = Column(UUID(as_uuid=True), ForeignKey("survey_responses.id"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("survey_questions.id"), nullable=False)
    
    score = Column(Integer, nullable=False)  # 1-5
    
    # Relationships
    response = relationship("SurveyResponse", back_populates="answers")
    question = relationship("SurveyQuestion", back_populates="responses")

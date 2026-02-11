from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.survey import SurveyType

class SurveyQuestionBase(BaseModel):
    question_text: str
    sequence: int = 0
    mapped_po_id: Optional[UUID] = None
    mapped_pso_id: Optional[UUID] = None

class SurveyQuestionCreate(SurveyQuestionBase):
    pass

class SurveyQuestionDTO(SurveyQuestionBase):
    id: UUID
    class Config:
        from_attributes = True

class SurveyBase(BaseModel):
    title: str
    description: Optional[str] = None
    survey_type: SurveyType
    program_id: UUID
    academic_year: int
    is_active: bool = True

class SurveyCreate(SurveyBase):
    questions: List[SurveyQuestionCreate]

class SurveyDTO(SurveyBase):
    id: UUID
    created_at: datetime
    questions: List[SurveyQuestionDTO]
    class Config:
        from_attributes = True

class AnswerCreate(BaseModel):
    question_id: UUID
    score: int = Field(..., ge=1, le=5, description="Score 1-5")

class SurveySubmission(BaseModel):
    answers: List[AnswerCreate]

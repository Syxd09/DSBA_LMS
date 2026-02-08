"""
EduMetrics Analytics - Question Analysis Service
F-06: Per-question analysis with attempt %, avg marks, difficulty index

Provides detailed question-level analytics for faculty to understand:
1. Question difficulty based on student performance
2. Attempt rates and completion patterns
3. Section-wise analysis
4. Bloom level correlation with difficulty
"""
from typing import List, Dict, Optional
from uuid import UUID
from decimal import Decimal
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func, case

from app.models import (
    Exam, ExamSection, Question, SubQuestion,
    StudentQuestionMark, CourseOutcome, Unit, Topic
)


# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class SubQuestionAnalysis:
    """Analysis for a single sub-question."""
    sub_question_id: str
    sub_question_label: str  # e.g., "1(a)"
    max_marks: float
    avg_marks: float
    attempt_count: int
    total_students: int
    attempt_percentage: float
    avg_percentage: float
    difficulty_index: float  # 0-1, lower = harder
    discrimination_index: Optional[float]  # How well it differentiates
    bloom_level: Optional[str]
    co_code: Optional[str]
    topic_name: Optional[str]


@dataclass
class QuestionAnalysis:
    """Analysis for a question with its sub-questions."""
    question_id: str
    question_no: int
    question_text: str
    section_name: str
    max_marks: float
    avg_marks: float
    attempt_percentage: float
    difficulty_index: float
    sub_questions: List[SubQuestionAnalysis]


@dataclass
class SectionAnalysis:
    """Section-level analysis."""
    section_id: str
    section_name: str
    max_marks: float
    avg_marks: float
    question_count: int
    avg_difficulty: float
    questions: List[QuestionAnalysis]


@dataclass
class ExamAnalysisResult:
    """Complete exam analysis result."""
    exam_id: str
    exam_type: str
    offering_id: str
    subject_code: str
    subject_name: str
    total_students: int
    total_marks: float
    avg_marks: float
    avg_percentage: float
    sections: List[SectionAnalysis]
    hardest_questions: List[Dict]
    easiest_questions: List[Dict]
    bloom_analysis: Dict[str, Dict]


# =============================================================================
# QUESTION ANALYSIS SERVICE
# =============================================================================

class QuestionAnalysisService:
    """Service for computing question-level analytics."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def analyze_exam(self, exam_id: UUID) -> ExamAnalysisResult:
        """
        Perform complete question analysis for an exam.
        
        Computes:
        - Per-question/sub-question difficulty index
        - Attempt percentages
        - Average marks
        - Bloom level correlation
        """
        # Get exam details
        exam = self.db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise ValueError(f"Exam {exam_id} not found")
        
        # Get total enrolled students for this offering
        total_students = await self._get_total_students(exam.offering_id)
        
        # Get sections
        sections = self.db.query(ExamSection).filter(
            ExamSection.exam_id == exam_id
        ).order_by(ExamSection.name).all()
        
        section_analyses = []
        all_sq_analyses = []
        bloom_data = {}
        
        for section in sections:
            section_analysis = await self._analyze_section(
                section, 
                total_students
            )
            section_analyses.append(section_analysis)
            
            # Collect all sub-questions for ranking
            for q in section_analysis.questions:
                for sq in q.sub_questions:
                    all_sq_analyses.append({
                        'id': sq.sub_question_id,
                        'label': f"Q{q.question_no}{sq.sub_question_label}",
                        'difficulty': sq.difficulty_index,
                        'avg_pct': sq.avg_percentage,
                        'bloom': sq.bloom_level,
                        'co': sq.co_code
                    })
                    
                    # Aggregate by Bloom level
                    if sq.bloom_level:
                        bloom = sq.bloom_level.lower()
                        if bloom not in bloom_data:
                            bloom_data[bloom] = {
                                'count': 0,
                                'total_difficulty': 0,
                                'total_marks': 0,
                                'avg_difficulty': 0
                            }
                        bloom_data[bloom]['count'] += 1
                        bloom_data[bloom]['total_difficulty'] += sq.difficulty_index
                        bloom_data[bloom]['total_marks'] += sq.max_marks
        
        # Calculate Bloom averages
        for bloom in bloom_data:
            if bloom_data[bloom]['count'] > 0:
                bloom_data[bloom]['avg_difficulty'] = (
                    bloom_data[bloom]['total_difficulty'] / bloom_data[bloom]['count']
                )
        
        # Sort for hardest/easiest
        sorted_by_diff = sorted(all_sq_analyses, key=lambda x: x['difficulty'])
        hardest = sorted_by_diff[:5]  # Lowest difficulty = hardest
        easiest = sorted_by_diff[-5:][::-1]  # Highest difficulty = easiest
        
        # Calculate totals
        total_marks = sum(s.max_marks for s in section_analyses)
        avg_marks = sum(s.avg_marks for s in section_analyses)
        
        return ExamAnalysisResult(
            exam_id=str(exam_id),
            exam_type=exam.exam_type,
            offering_id=str(exam.offering_id),
            subject_code=exam.subject_offering.subject.code if hasattr(exam, 'subject_offering') else '',
            subject_name=exam.subject_offering.subject.name if hasattr(exam, 'subject_offering') else '',
            total_students=total_students,
            total_marks=total_marks,
            avg_marks=avg_marks,
            avg_percentage=(avg_marks / total_marks * 100) if total_marks > 0 else 0,
            sections=section_analyses,
            hardest_questions=hardest,
            easiest_questions=easiest,
            bloom_analysis=bloom_data
        )
    
    async def _analyze_section(
        self, 
        section: ExamSection, 
        total_students: int
    ) -> SectionAnalysis:
        """Analyze a section with all its questions."""
        questions = self.db.query(Question).filter(
            Question.section_id == section.id
        ).order_by(Question.question_no).all()
        
        question_analyses = []
        section_max_marks = 0
        section_avg_marks = 0
        section_difficulty_sum = 0
        
        for question in questions:
            q_analysis = await self._analyze_question(question, total_students)
            question_analyses.append(q_analysis)
            
            section_max_marks += q_analysis.max_marks
            section_avg_marks += q_analysis.avg_marks
            section_difficulty_sum += q_analysis.difficulty_index
        
        return SectionAnalysis(
            section_id=str(section.id),
            section_name=section.name,
            max_marks=section_max_marks,
            avg_marks=section_avg_marks,
            question_count=len(questions),
            avg_difficulty=(
                section_difficulty_sum / len(questions) if questions else 0
            ),
            questions=question_analyses
        )
    
    async def _analyze_question(
        self, 
        question: Question, 
        total_students: int
    ) -> QuestionAnalysis:
        """Analyze a question with all its sub-questions."""
        sub_questions = self.db.query(SubQuestion).filter(
            SubQuestion.question_id == question.id
        ).order_by(SubQuestion.sub_question_no).all()
        
        sq_analyses = []
        q_max_marks = 0
        q_avg_marks = 0
        q_attempt_sum = 0
        q_difficulty_sum = 0
        
        for sq in sub_questions:
            sq_analysis = await self._analyze_sub_question(sq, total_students)
            sq_analyses.append(sq_analysis)
            
            q_max_marks += sq.max_marks
            q_avg_marks += sq_analysis.avg_marks
            q_attempt_sum += sq_analysis.attempt_percentage
            q_difficulty_sum += sq_analysis.difficulty_index
        
        return QuestionAnalysis(
            question_id=str(question.id),
            question_no=question.question_no,
            question_text=question.question_text or "",
            section_name=question.section.name if hasattr(question, 'section') else "",
            max_marks=float(q_max_marks),
            avg_marks=q_avg_marks,
            attempt_percentage=(
                q_attempt_sum / len(sub_questions) if sub_questions else 0
            ),
            difficulty_index=(
                q_difficulty_sum / len(sub_questions) if sub_questions else 0
            ),
            sub_questions=sq_analyses
        )
    
    async def _analyze_sub_question(
        self, 
        sq: SubQuestion, 
        total_students: int
    ) -> SubQuestionAnalysis:
        """
        Analyze a single sub-question.
        
        Difficulty Index = (mean score) / (max score)
        - 1.0 = very easy (everyone got full marks)
        - 0.0 = very hard (no one got marks)
        - 0.5 = moderate difficulty
        """
        # Get marks distribution
        result = self.db.execute(
            select(
                func.count(StudentQuestionMark.id).label('attempts'),
                func.sum(StudentQuestionMark.marks).label('total_marks'),
                func.avg(StudentQuestionMark.marks).label('avg_marks')
            )
            .where(StudentQuestionMark.sub_question_id == sq.id)
        )
        row = result.fetchone()
        
        attempts = row[0] or 0
        total_marks = float(row[1]) if row[1] else 0
        avg_marks = float(row[2]) if row[2] else 0
        
        # Calculate metrics
        attempt_pct = (attempts / total_students * 100) if total_students > 0 else 0
        avg_pct = (avg_marks / float(sq.max_marks) * 100) if sq.max_marks else 0
        
        # Difficulty Index: avg_marks / max_marks (higher = easier)
        difficulty = (avg_marks / float(sq.max_marks)) if sq.max_marks else 0
        
        # Get CO code
        co_code = None
        if sq.co_id:
            co = self.db.query(CourseOutcome).filter(
                CourseOutcome.id == sq.co_id
            ).first()
            co_code = co.co_code if co else None
        
        # Get topic name
        topic_name = None
        if sq.topic_id:
            topic = self.db.query(Topic).filter(Topic.id == sq.topic_id).first()
            topic_name = topic.name if topic else None
        
        return SubQuestionAnalysis(
            sub_question_id=str(sq.id),
            sub_question_label=f"({sq.sub_question_no})" if sq.sub_question_no else "",
            max_marks=float(sq.max_marks),
            avg_marks=avg_marks,
            attempt_count=attempts,
            total_students=total_students,
            attempt_percentage=round(attempt_pct, 1),
            avg_percentage=round(avg_pct, 1),
            difficulty_index=round(difficulty, 3),
            discrimination_index=None,  # Future: calculate from high/low groups
            bloom_level=sq.bloom_level,
            co_code=co_code,
            topic_name=topic_name
        )
    
    async def _get_total_students(self, offering_id: UUID) -> int:
        """Get total enrolled students for an offering."""
        result = self.db.execute(
            select(func.count(func.distinct(StudentQuestionMark.usn)))
            .join(Exam, Exam.id == StudentQuestionMark.exam_id)
            .where(Exam.offering_id == offering_id)
        )
        return result.scalar() or 0


# =============================================================================
# API HELPER FUNCTION
# =============================================================================

async def get_exam_question_analysis(db: Session, exam_id: UUID) -> Dict:
    """
    Get complete question analysis for an exam.
    
    Returns API-ready dictionary.
    """
    service = QuestionAnalysisService(db)
    result = await service.analyze_exam(exam_id)
    
    return {
        'exam_id': result.exam_id,
        'exam_type': result.exam_type,
        'offering_id': result.offering_id,
        'subject_code': result.subject_code,
        'subject_name': result.subject_name,
        'total_students': result.total_students,
        'total_marks': result.total_marks,
        'avg_marks': round(result.avg_marks, 2),
        'avg_percentage': round(result.avg_percentage, 1),
        'sections': [
            {
                'section_id': s.section_id,
                'section_name': s.section_name,
                'max_marks': s.max_marks,
                'avg_marks': round(s.avg_marks, 2),
                'question_count': s.question_count,
                'avg_difficulty': round(s.avg_difficulty, 3),
                'questions': [
                    {
                        'question_id': q.question_id,
                        'question_no': q.question_no,
                        'question_text': q.question_text[:100] + '...' if len(q.question_text) > 100 else q.question_text,
                        'max_marks': q.max_marks,
                        'avg_marks': round(q.avg_marks, 2),
                        'attempt_percentage': round(q.attempt_percentage, 1),
                        'difficulty_index': round(q.difficulty_index, 3),
                        'sub_questions': [
                            {
                                'sub_question_id': sq.sub_question_id,
                                'label': sq.sub_question_label,
                                'max_marks': sq.max_marks,
                                'avg_marks': sq.avg_marks,
                                'attempt_percentage': sq.attempt_percentage,
                                'avg_percentage': sq.avg_percentage,
                                'difficulty_index': sq.difficulty_index,
                                'bloom_level': sq.bloom_level,
                                'co_code': sq.co_code,
                                'topic_name': sq.topic_name
                            }
                            for sq in q.sub_questions
                        ]
                    }
                    for q in s.questions
                ]
            }
            for s in result.sections
        ],
        'hardest_questions': result.hardest_questions,
        'easiest_questions': result.easiest_questions,
        'bloom_analysis': result.bloom_analysis
    }

"""
EduMetrics Analytics - Topic Coverage Analysis Service
B-03: Compute topics taught vs topics assessed vs student performance

This service provides:
1. Topic-wise question coverage (how many questions per topic)
2. Student performance per topic
3. Gap analysis (topics defined but not assessed)
4. Faculty teaching effectiveness per topic
"""
from typing import List, Dict, Optional
from uuid import UUID
from decimal import Decimal
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func, case

from app.models import (
    Unit, Topic, Question, SubQuestion, StudentQuestionMark,
    Exam, ExamSection, CourseOutcome
)
from app.models.subject_offering import SubjectOffering


# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class TopicCoverage:
    """Topic coverage analysis result."""
    topic_id: str
    topic_name: str
    unit_no: int
    unit_name: str
    # Coverage metrics
    question_count: int  # Questions asking this topic
    total_marks: float   # Max marks allocated
    # Performance metrics (if available)
    avg_percentage: Optional[float] = None
    attempt_count: Optional[int] = None
    # CO linkage
    co_codes: List[str] = None


@dataclass
class UnitCoverage:
    """Unit-level coverage with topics."""
    unit_id: str
    unit_no: int
    unit_name: str
    topic_count: int
    assessed_topics: int  # Topics with at least one question
    unassessed_topics: int  # Topics never asked
    coverage_percentage: float
    avg_performance: Optional[float]
    topics: List[TopicCoverage]


@dataclass 
class CoverageAnalysis:
    """Complete coverage analysis for an offering."""
    offering_id: str
    subject_code: str
    subject_name: str
    total_units: int
    total_topics: int
    assessed_topics: int
    coverage_percentage: float
    avg_performance: Optional[float]
    units: List[UnitCoverage]
    gaps: List[Dict]  # Topics never assessed


# =============================================================================
# TOPIC COVERAGE SERVICE
# =============================================================================

class TopicCoverageService:
    """Service for computing topic coverage analytics."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_offering_coverage(
        self, 
        offering_id: UUID
    ) -> CoverageAnalysis:
        """
        Get complete topic coverage analysis for an offering.
        
        Returns coverage of topics defined vs assessed, with performance.
        """
        # Get offering details
        offering = self.db.query(SubjectOffering).filter(
            SubjectOffering.id == offering_id
        ).first()
        
        if not offering:
            raise ValueError(f"Offering {offering_id} not found")
        
        # Get all units and topics
        units = self.db.query(Unit).filter(
            Unit.offering_id == offering_id
        ).order_by(Unit.unit_no).all()
        
        # Get question coverage per topic
        topic_questions = await self._get_topic_question_counts(offering_id)
        
        # Get performance per topic
        topic_performance = await self._get_topic_performance(offering_id)
        
        # Build unit coverage
        unit_coverages = []
        total_topics = 0
        total_assessed = 0
        gaps = []
        
        for unit in units:
            topics = self.db.query(Topic).filter(
                Topic.unit_id == unit.id
            ).order_by(Topic.name).all()
            
            topic_coverages = []
            assessed_count = 0
            unit_perf_sum = 0
            unit_perf_count = 0
            
            for topic in topics:
                total_topics += 1
                
                q_count = topic_questions.get(str(topic.id), {}).get('count', 0)
                q_marks = topic_questions.get(str(topic.id), {}).get('marks', 0)
                perf = topic_performance.get(str(topic.id))
                
                if q_count > 0:
                    assessed_count += 1
                    total_assessed += 1
                else:
                    gaps.append({
                        'topic_id': str(topic.id),
                        'topic_name': topic.name,
                        'unit_no': unit.unit_no,
                        'unit_name': unit.name
                    })
                
                topic_cov = TopicCoverage(
                    topic_id=str(topic.id),
                    topic_name=topic.name,
                    unit_no=unit.unit_no,
                    unit_name=unit.name,
                    question_count=q_count,
                    total_marks=float(q_marks),
                    avg_percentage=perf['avg_pct'] if perf else None,
                    attempt_count=perf['attempts'] if perf else None,
                    co_codes=topic_questions.get(str(topic.id), {}).get('cos', [])
                )
                topic_coverages.append(topic_cov)
                
                if perf and perf.get('avg_pct') is not None:
                    unit_perf_sum += perf['avg_pct']
                    unit_perf_count += 1
            
            unit_coverage = UnitCoverage(
                unit_id=str(unit.id),
                unit_no=unit.unit_no,
                unit_name=unit.name,
                topic_count=len(topics),
                assessed_topics=assessed_count,
                unassessed_topics=len(topics) - assessed_count,
                coverage_percentage=(assessed_count / len(topics) * 100) if topics else 0,
                avg_performance=(unit_perf_sum / unit_perf_count) if unit_perf_count > 0 else None,
                topics=topic_coverages
            )
            unit_coverages.append(unit_coverage)
        
        # Calculate overall stats
        overall_perf = None
        if topic_performance:
            perf_values = [p['avg_pct'] for p in topic_performance.values() if p]
            overall_perf = sum(perf_values) / len(perf_values) if perf_values else None
        
        return CoverageAnalysis(
            offering_id=str(offering_id),
            subject_code=offering.subject.code if hasattr(offering, 'subject') else '',
            subject_name=offering.subject.name if hasattr(offering, 'subject') else '',
            total_units=len(units),
            total_topics=total_topics,
            assessed_topics=total_assessed,
            coverage_percentage=(total_assessed / total_topics * 100) if total_topics > 0 else 0,
            avg_performance=overall_perf,
            units=unit_coverages,
            gaps=gaps
        )
    
    async def get_student_topic_performance(
        self,
        usn: str,
        offering_id: UUID
    ) -> List[Dict]:
        """
        Get student's performance per topic.
        
        Returns list of {topic, unit, percentage, max_marks, scored}
        """
        result = self.db.execute(
            select(
                Topic.id,
                Topic.name,
                Unit.unit_no,
                Unit.name.label('unit_name'),
                func.sum(StudentQuestionMark.marks).label('scored'),
                func.sum(SubQuestion.max_marks).label('max_marks')
            )
            .join(SubQuestion, SubQuestion.topic_id == Topic.id)
            .join(StudentQuestionMark, StudentQuestionMark.sub_question_id == SubQuestion.id)
            .join(Unit, Unit.id == Topic.unit_id)
            .where(and_(
                StudentQuestionMark.usn == usn,
                Unit.offering_id == offering_id
            ))
            .group_by(Topic.id, Topic.name, Unit.unit_no, Unit.name)
            .order_by(Unit.unit_no, Topic.name)
        )
        
        return [
            {
                'topic_id': str(row[0]),
                'topic_name': row[1],
                'unit_no': row[2],
                'unit_name': row[3],
                'scored': float(row[4]) if row[4] else 0,
                'max_marks': float(row[5]) if row[5] else 0,
                'percentage': (float(row[4]) / float(row[5]) * 100) if row[5] else 0
            }
            for row in result.fetchall()
        ]
    
    async def _get_topic_question_counts(
        self, 
        offering_id: UUID
    ) -> Dict[str, Dict]:
        """Get question counts and marks per topic."""
        result = self.db.execute(
            select(
                SubQuestion.topic_id,
                func.count(SubQuestion.id).label('count'),
                func.sum(SubQuestion.max_marks).label('marks'),
                func.array_agg(func.distinct(CourseOutcome.co_code)).label('cos')
            )
            .join(Question, Question.id == SubQuestion.question_id)
            .join(ExamSection, ExamSection.id == Question.section_id)
            .join(Exam, Exam.id == ExamSection.exam_id)
            .outerjoin(CourseOutcome, CourseOutcome.id == SubQuestion.co_id)
            .where(and_(
                Exam.offering_id == offering_id,
                SubQuestion.topic_id.isnot(None)
            ))
            .group_by(SubQuestion.topic_id)
        )
        
        return {
            str(row[0]): {
                'count': row[1],
                'marks': float(row[2]) if row[2] else 0,
                'cos': [c for c in (row[3] or []) if c]
            }
            for row in result.fetchall()
        }
    
    async def _get_topic_performance(
        self, 
        offering_id: UUID
    ) -> Dict[str, Dict]:
        """Get average performance per topic across all students."""
        result = self.db.execute(
            select(
                SubQuestion.topic_id,
                func.avg(
                    case(
                        (SubQuestion.max_marks > 0, 
                         StudentQuestionMark.marks * 100.0 / SubQuestion.max_marks),
                        else_=0
                    )
                ).label('avg_pct'),
                func.count(func.distinct(StudentQuestionMark.usn)).label('attempts')
            )
            .join(StudentQuestionMark, StudentQuestionMark.sub_question_id == SubQuestion.id)
            .join(Question, Question.id == SubQuestion.question_id)
            .join(ExamSection, ExamSection.id == Question.section_id)
            .join(Exam, Exam.id == ExamSection.exam_id)
            .where(and_(
                Exam.offering_id == offering_id,
                SubQuestion.topic_id.isnot(None)
            ))
            .group_by(SubQuestion.topic_id)
        )
        
        return {
            str(row[0]): {
                'avg_pct': float(row[1]) if row[1] else None,
                'attempts': row[2]
            }
            for row in result.fetchall()
        }


# =============================================================================
# API HELPER FUNCTIONS
# =============================================================================

async def get_topic_coverage(
    db: Session, 
    offering_id: UUID
) -> Dict:
    """
    Get topic coverage analysis for an offering.
    
    Returns API-ready dictionary.
    """
    service = TopicCoverageService(db)
    analysis = await service.get_offering_coverage(offering_id)
    
    return {
        'offering_id': analysis.offering_id,
        'subject_code': analysis.subject_code,
        'subject_name': analysis.subject_name,
        'total_units': analysis.total_units,
        'total_topics': analysis.total_topics,
        'assessed_topics': analysis.assessed_topics,
        'coverage_percentage': round(analysis.coverage_percentage, 1),
        'avg_performance': round(analysis.avg_performance, 1) if analysis.avg_performance else None,
        'units': [
            {
                'unit_id': u.unit_id,
                'unit_no': u.unit_no,
                'unit_name': u.unit_name,
                'topic_count': u.topic_count,
                'assessed_topics': u.assessed_topics,
                'unassessed_topics': u.unassessed_topics,
                'coverage_percentage': round(u.coverage_percentage, 1),
                'avg_performance': round(u.avg_performance, 1) if u.avg_performance else None,
                'topics': [
                    {
                        'topic_id': t.topic_id,
                        'topic_name': t.topic_name,
                        'question_count': t.question_count,
                        'total_marks': t.total_marks,
                        'avg_percentage': round(t.avg_percentage, 1) if t.avg_percentage else None,
                        'attempt_count': t.attempt_count,
                        'co_codes': t.co_codes or []
                    }
                    for t in u.topics
                ]
            }
            for u in analysis.units
        ],
        'gaps': analysis.gaps
    }


async def get_student_topic_heatmap(
    db: Session,
    usn: str,
    offering_id: UUID
) -> Dict:
    """
    Get student's topic-wise performance for heatmap visualization.
    
    Returns API-ready dictionary with performance per topic.
    """
    service = TopicCoverageService(db)
    performance = await service.get_student_topic_performance(usn, offering_id)
    
    # Group by unit for easier UI rendering
    units = {}
    for p in performance:
        unit_no = p['unit_no']
        if unit_no not in units:
            units[unit_no] = {
                'unit_no': unit_no,
                'unit_name': p['unit_name'],
                'topics': []
            }
        units[unit_no]['topics'].append({
            'topic_id': p['topic_id'],
            'topic_name': p['topic_name'],
            'percentage': round(p['percentage'], 1),
            'scored': round(p['scored'], 2),
            'max_marks': round(p['max_marks'], 2)
        })
    
    return {
        'usn': usn,
        'offering_id': str(offering_id),
        'units': list(units.values())
    }

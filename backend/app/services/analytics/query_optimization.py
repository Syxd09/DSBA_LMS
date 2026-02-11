"""
EduMetrics Analytics - Query Optimization
P-02: Dashboard query optimization with batch queries and index recommendations

Provides:
- Batch query helpers to avoid N+1 problems
- Eager loading patterns
- Query result prefetching
- Index recommendations for common queries
"""
from typing import List, Dict, Optional, Any, TypeVar, Generic
from uuid import UUID
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import select, and_, or_, func, text
from dataclasses import dataclass
import logging

from app.models import (
    Exam, ExamSection, Question, SubQuestion,
    StudentQuestionMark, CourseOutcome, FinalMarks,
    SubjectOffering, Cohort, Student
)

logger = logging.getLogger(__name__)

# =============================================================================
# BATCH QUERY HELPERS
# =============================================================================

async def batch_get_students_by_usns(
    db: Session,
    usns: List[str]
) -> Dict[str, Any]:
    """
    Batch fetch students by USNs.
    Avoids N+1 when processing multiple students.
    """
    if not usns:
        return {}
    
    result = db.execute(
        select(Student)
        .where(Student.usn.in_(usns))
    )
    students = result.scalars().all()
    return {s.usn: s for s in students}


async def batch_get_offerings_with_subjects(
    db: Session,
    offering_ids: List[UUID]
) -> Dict[UUID, Any]:
    """
    Batch fetch offerings with joined subject data.
    Single query instead of N queries.
    """
    if not offering_ids:
        return {}
    
    result = db.execute(
        select(SubjectOffering)
        .options(joinedload(SubjectOffering.subject))
        .where(SubjectOffering.id.in_(offering_ids))
    )
    offerings = result.unique().scalars().all()
    return {o.id: o for o in offerings}


async def batch_get_exams_with_structure(
    db: Session,
    exam_ids: List[UUID]
) -> Dict[UUID, Any]:
    """
    Batch fetch exams with sections, questions, and sub-questions.
    Uses selectinload for efficient loading.
    """
    if not exam_ids:
        return {}
    
    result = db.execute(
        select(Exam)
        .options(
            selectinload(Exam.sections).selectinload(ExamSection.questions)
            .selectinload(Question.sub_questions)
        )
        .where(Exam.id.in_(exam_ids))
    )
    exams = result.unique().scalars().all()
    return {e.id: e for e in exams}


async def batch_get_cos_by_offering(
    db: Session,
    offering_ids: List[UUID]
) -> Dict[UUID, List[Any]]:
    """
    Batch fetch course outcomes grouped by offering.
    """
    if not offering_ids:
        return {}
    
    result = db.execute(
        select(CourseOutcome)
        .where(CourseOutcome.offering_id.in_(offering_ids))
        .order_by(CourseOutcome.offering_id, CourseOutcome.co_code)
    )
    cos = result.scalars().all()
    
    grouped = {}
    for co in cos:
        if co.offering_id not in grouped:
            grouped[co.offering_id] = []
        grouped[co.offering_id].append(co)
    
    return grouped


# =============================================================================
# AGGREGATED QUERIES (Single Query for Dashboard)
# =============================================================================

@dataclass
class DashboardStats:
    """Pre-computed dashboard statistics."""
    total_students: int
    total_exams: int
    exams_with_marks: int
    avg_marks_percentage: float
    pass_percentage: float
    co_attainment_avg: Optional[float]


async def get_offering_dashboard_stats(
    db: Session,
    offering_id: UUID
) -> DashboardStats:
    """
    Get all dashboard stats in a single optimized query batch.
    Replaces multiple separate queries.
    """
    # Count students with marks
    student_count = db.execute(
        select(func.count(func.distinct(FinalMarks.usn)))
        .where(FinalMarks.offering_id == offering_id)
    ).scalar() or 0
    
    # Exam counts - resolve offering to subject_id + cohort_id
    offering = db.query(SubjectOffering).filter(SubjectOffering.id == offering_id).first()
    
    exam_stats = None
    if offering:
        exam_filter = or_(
            Exam.offering_id == offering_id,
            and_(Exam.subject_id == offering.subject_id, Exam.cohort_id == offering.cohort_id)
        )
        exam_stats = db.execute(
            select(
                func.count(Exam.id).label('total'),
                func.count(Exam.id).filter(Exam.status == 'locked').label('published')
            )
            .where(exam_filter)
        ).first()
    
    total_exams = exam_stats[0] if exam_stats else 0
    published_exams = exam_stats[1] if exam_stats else 0
    
    # Get average marks
    marks_stats = db.execute(
        select(
            func.avg(FinalMarks.total_marks).label('avg_marks'),
            func.count(FinalMarks.id).filter(FinalMarks.grade != 'F').label('passed'),
            func.count(FinalMarks.id).label('total')
        )
        .where(FinalMarks.offering_id == offering_id)
    ).first()
    
    avg_marks = float(marks_stats[0]) if marks_stats and marks_stats[0] else 0
    passed = marks_stats[1] if marks_stats else 0
    total = marks_stats[2] if marks_stats else 0
    pass_pct = (passed / total * 100) if total > 0 else 0
    
    return DashboardStats(
        total_students=student_count,
        total_exams=total_exams,
        exams_with_marks=published_exams,
        avg_marks_percentage=avg_marks,
        pass_percentage=pass_pct,
        co_attainment_avg=None  # Computed separately if needed
    )


async def get_cohort_progress_summary(
    db: Session,
    cohort_id: UUID
) -> Dict[str, Any]:
    """
    Get cohort progress summary with optimized single query batch.
    """
    # Student counts by status
    student_stats = db.execute(
        select(
            Student.status,
            func.count(Student.usn)
        )
        .where(Student.cohort_id == cohort_id)
        .group_by(Student.status)
    ).all()
    
    status_counts = {row[0]: row[1] for row in student_stats}
    
    # Offering counts
    offering_count = db.execute(
        select(func.count(SubjectOffering.id))
        .where(SubjectOffering.cohort_id == cohort_id)
    ).scalar() or 0
    
    return {
        "total_students": sum(status_counts.values()),
        "active_students": status_counts.get('active', 0),
        "promoted_students": status_counts.get('promoted', 0),
        "detained_students": status_counts.get('detained', 0),
        "total_offerings": offering_count
    }


# =============================================================================
# PREFETCH UTILITIES
# =============================================================================

class QueryPrefetcher:
    """
    Helper to prefetch related data efficiently.
    
    Usage:
        prefetcher = QueryPrefetcher(db)
        prefetcher.prefetch_students(student_usns)
        prefetcher.prefetch_offerings(offering_ids)
        
        # Later access without additional queries
        student = prefetcher.get_student(usn)
    """
    
    def __init__(self, db: Session):
        self.db = db
        self._students: Dict[str, Any] = {}
        self._offerings: Dict[UUID, Any] = {}
        self._exams: Dict[UUID, Any] = {}
        self._cos: Dict[UUID, List[Any]] = {}
    
    async def prefetch_students(self, usns: List[str]):
        """Prefetch students by USNs."""
        self._students = await batch_get_students_by_usns(self.db, usns)
    
    async def prefetch_offerings(self, offering_ids: List[UUID]):
        """Prefetch offerings with subjects."""
        self._offerings = await batch_get_offerings_with_subjects(self.db, offering_ids)
    
    async def prefetch_exams(self, exam_ids: List[UUID]):
        """Prefetch exams with full structure."""
        self._exams = await batch_get_exams_with_structure(self.db, exam_ids)
    
    async def prefetch_cos(self, offering_ids: List[UUID]):
        """Prefetch course outcomes by offerings."""
        self._cos = await batch_get_cos_by_offering(self.db, offering_ids)
    
    def get_student(self, usn: str) -> Optional[Any]:
        return self._students.get(usn)
    
    def get_offering(self, offering_id: UUID) -> Optional[Any]:
        return self._offerings.get(offering_id)
    
    def get_exam(self, exam_id: UUID) -> Optional[Any]:
        return self._exams.get(exam_id)
    
    def get_cos(self, offering_id: UUID) -> List[Any]:
        return self._cos.get(offering_id, [])


# =============================================================================
# INDEX RECOMMENDATIONS
# =============================================================================

# These are the recommended indexes for optimal query performance.
# Run as migrations or apply directly to database.

INDEX_RECOMMENDATIONS = """
-- Performance indexes for EduMetrics analytics

-- StudentQuestionMark: Most queried table for analytics
CREATE INDEX IF NOT EXISTS idx_sqm_exam_usn ON student_question_marks(exam_id, usn);
CREATE INDEX IF NOT EXISTS idx_sqm_sub_question ON student_question_marks(sub_question_id);

-- FinalMarks: Dashboard and reports
CREATE INDEX IF NOT EXISTS idx_final_marks_offering ON final_marks(offering_id);
CREATE INDEX IF NOT EXISTS idx_final_marks_usn ON final_marks(usn);
CREATE INDEX IF NOT EXISTS idx_final_marks_offering_usn ON final_marks(offering_id, usn);

-- Exams: Filtering by offering and status
CREATE INDEX IF NOT EXISTS idx_exam_offering ON exams(offering_id);
CREATE INDEX IF NOT EXISTS idx_exam_offering_type ON exams(offering_id, exam_type);
CREATE INDEX IF NOT EXISTS idx_exam_published ON exams(is_published) WHERE is_published = true;

-- CourseOutcome: CO attainment queries
CREATE INDEX IF NOT EXISTS idx_co_offering ON course_outcomes(offering_id);

-- SubQuestion: CO-based analytics
CREATE INDEX IF NOT EXISTS idx_sq_co ON sub_questions(co_id);
CREATE INDEX IF NOT EXISTS idx_sq_topic ON sub_questions(topic_id);

-- Students: Cohort-based queries
CREATE INDEX IF NOT EXISTS idx_student_cohort ON students(cohort_id);
CREATE INDEX IF NOT EXISTS idx_student_cohort_status ON students(cohort_id, status);

-- SubjectOffering: Cohort lookups
CREATE INDEX IF NOT EXISTS idx_offering_cohort ON subject_offerings(cohort_id);
"""


def get_index_sql() -> str:
    """Return SQL for recommended indexes."""
    return INDEX_RECOMMENDATIONS


async def check_missing_indexes(db: Session) -> List[str]:
    """
    Check which recommended indexes are missing.
    Returns list of CREATE INDEX statements needed.
    """
    # This would query pg_indexes and compare
    # Simplified for now - returns full recommendations
    return [INDEX_RECOMMENDATIONS]

"""
EduMetrics Analytics - Rule-based Insights Engine
Phase B-02: Pattern detection and personalized insights generation

INSIGHT CATEGORIES:
1. Bloom Taxonomy Patterns - Strong/weak in specific cognitive levels
2. Exam Consistency - Internal vs External performance
3. Unit Weakness - Repeated topic/unit weaknesses
4. CO Attainment Patterns - CO-level strengths and gaps
5. Historical Trends - Progress over semesters

RULES ARE:
- Deterministic (same input = same output)
- Explainable (clear rationale for each insight)
- Actionable (concrete recommendations)
"""
from typing import List, Dict, Optional, Tuple
from uuid import UUID
from decimal import Decimal
from dataclasses import dataclass
from enum import Enum
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func

# Import models
from app.models import (
    Student, Exam, ExamSection, Question, SubQuestion,
    StudentQuestionMark, FinalMarks, CourseOutcome, Unit, Topic
)
from app.models.subject_offering import SubjectOffering


# =============================================================================
# INSIGHT TYPES & DATA STRUCTURES
# =============================================================================

class InsightCategory(str, Enum):
    BLOOM_PATTERN = "bloom_pattern"
    EXAM_CONSISTENCY = "exam_consistency"  
    UNIT_WEAKNESS = "unit_weakness"
    CO_PATTERN = "co_pattern"
    IMPROVEMENT_TREND = "improvement_trend"


class InsightSeverity(str, Enum):
    INFO = "info"           # Positive observation
    SUGGESTION = "suggestion"  # Mild improvement area
    WARNING = "warning"      # Needs attention
    CRITICAL = "critical"    # Urgent action needed


@dataclass
class Insight:
    """A single actionable insight for a student."""
    id: str
    category: InsightCategory
    severity: InsightSeverity
    title: str
    description: str
    rationale: str
    recommendation: str
    metadata: Dict  # Additional context data


@dataclass
class BloomLevel:
    """Bloom taxonomy level with student performance."""
    level: str  # remember, understand, apply, analyze, evaluate, create
    avg_percentage: float
    question_count: int
    total_marks: float
    scored_marks: float


# =============================================================================
# INSIGHT RULES ENGINE
# =============================================================================

class InsightRuleEngine:
    """
    Rule-based engine for generating student insights.
    
    Each rule is a pure function that:
    1. Takes student performance data
    2. Applies detection logic
    3. Returns zero or more insights
    """
    
    # Thresholds for pattern detection
    BLOOM_GAP_THRESHOLD = 20.0  # % difference to flag
    EXAM_CONSISTENCY_GAP = 15.0  # % diff between INT and EXT
    UNIT_WEAKNESS_THRESHOLD = 50.0  # % below which unit is weak
    CO_WEAKNESS_THRESHOLD = 60.0  # % below which CO is weak
    IMPROVEMENT_THRESHOLD = 10.0  # % improvement to note
    
    def __init__(self, db: Session):
        self.db = db
    
    async def generate_insights(
        self, 
        usn: str, 
        offering_id: Optional[UUID] = None
    ) -> List[Insight]:
        """
        Generate all insights for a student.
        
        If offering_id is provided, insights are scoped to that subject.
        Otherwise, generates cross-subject insights.
        """
        insights: List[Insight] = []
        
        if offering_id:
            # Subject-specific insights
            insights.extend(await self._bloom_pattern_insights(usn, offering_id))
            insights.extend(await self._exam_consistency_insights(usn, offering_id))
            insights.extend(await self._unit_weakness_insights(usn, offering_id))
            insights.extend(await self._co_pattern_insights(usn, offering_id))
        else:
            # Cross-subject insights
            insights.extend(await self._overall_bloom_insights(usn))
            insights.extend(await self._improvement_trend_insights(usn))
        
        return insights
    
    # =========================================================================
    # RULE 1: Bloom Taxonomy Pattern Detection
    # =========================================================================
    
    async def _bloom_pattern_insights(
        self, 
        usn: str, 
        offering_id: UUID
    ) -> List[Insight]:
        """
        Detect patterns in Bloom taxonomy performance.
        
        Rules:
        - R1.1: Strong in recall (L1-L2), weak in application (L3-L6)
        - R1.2: Weak in lower levels but strong in higher (unusual)
        - R1.3: Consistent across all levels (positive)
        """
        insights = []
        
        # Get Bloom-level performance
        bloom_perf = await self._get_bloom_performance(usn, offering_id)
        if not bloom_perf or len(bloom_perf) < 2:
            return insights
        
        # Categorize into lower (L1-L2) and higher (L3-L6) levels
        lower_levels = ['remember', 'understand']
        higher_levels = ['apply', 'analyze', 'evaluate', 'create']
        
        lower_avg = self._avg_bloom_levels(bloom_perf, lower_levels)
        higher_avg = self._avg_bloom_levels(bloom_perf, higher_levels)
        
        # R1.1: Strong recall, weak application
        if lower_avg is not None and higher_avg is not None:
            gap = lower_avg - higher_avg
            
            if gap > self.BLOOM_GAP_THRESHOLD:
                insights.append(Insight(
                    id=f"bloom_recall_strong_{offering_id}",
                    category=InsightCategory.BLOOM_PATTERN,
                    severity=InsightSeverity.SUGGESTION,
                    title="Strong in Recall, Needs Application Practice",
                    description=f"You score {lower_avg:.0f}% on factual recall questions but only {higher_avg:.0f}% on application-based questions.",
                    rationale=f"The {gap:.0f}% gap suggests you remember concepts well but struggle to apply them in new contexts.",
                    recommendation="Practice solving more case studies and application problems. Focus on 'why' and 'how' rather than 'what'.",
                    metadata={
                        "lower_level_avg": lower_avg,
                        "higher_level_avg": higher_avg,
                        "gap": gap
                    }
                ))
            
            # R1.2: Weak recall, strong application (unusual but possible)
            elif gap < -self.BLOOM_GAP_THRESHOLD:
                insights.append(Insight(
                    id=f"bloom_application_strong_{offering_id}",
                    category=InsightCategory.BLOOM_PATTERN,
                    severity=InsightSeverity.INFO,
                    title="Strong Application Skills",
                    description=f"You excel at application ({higher_avg:.0f}%) despite lower recall scores ({lower_avg:.0f}%).",
                    rationale="This suggests strong conceptual understanding. Memorizing key facts could further boost your scores.",
                    recommendation="Create flashcards for definitions and formulas to strengthen foundational recall.",
                    metadata={
                        "lower_level_avg": lower_avg,
                        "higher_level_avg": higher_avg,
                        "gap": abs(gap)
                    }
                ))
            
            # R1.3: Consistent across levels
            elif abs(gap) <= 10:
                avg_overall = (lower_avg + higher_avg) / 2
                if avg_overall >= 70:
                    insights.append(Insight(
                        id=f"bloom_balanced_{offering_id}",
                        category=InsightCategory.BLOOM_PATTERN,
                        severity=InsightSeverity.INFO,
                        title="Well-Balanced Cognitive Skills",
                        description=f"Consistent performance across all Bloom levels ({avg_overall:.0f}% average).",
                        rationale="You demonstrate balanced understanding from basic recall to complex application.",
                        recommendation="Maintain this balance while focusing on any specific weak topics.",
                        metadata={
                            "average": avg_overall,
                            "gap": gap
                        }
                    ))
        
        return insights
    
    # =========================================================================
    # RULE 2: Exam Consistency Detection
    # =========================================================================
    
    async def _exam_consistency_insights(
        self, 
        usn: str, 
        offering_id: UUID
    ) -> List[Insight]:
        """
        Detect internal vs external exam consistency.
        
        Rules:
        - R2.1: High internal, low external (exam pressure issue)
        - R2.2: Low internal, high external (late bloomer)
        - R2.3: Consistent across both (positive)
        """
        insights = []
        
        # Get exam scores
        internal_avg = await self._get_internal_avg(usn, offering_id)
        external_pct = await self._get_external_percentage(usn, offering_id)
        
        if internal_avg is None or external_pct is None:
            return insights
        
        gap = internal_avg - external_pct
        
        # R2.1: High internal, low external
        if gap > self.EXAM_CONSISTENCY_GAP:
            insights.append(Insight(
                id=f"exam_pressure_{offering_id}",
                category=InsightCategory.EXAM_CONSISTENCY,
                severity=InsightSeverity.WARNING,
                title="Possible Exam Pressure Issue",
                description=f"Internal average: {internal_avg:.0f}%, External: {external_pct:.0f}%.",
                rationale=f"The {gap:.0f}% drop in external exams suggests stress or time management issues under pressure.",
                recommendation="Practice timed mock exams. Review external exam patterns and allocate time per section.",
                metadata={
                    "internal_avg": internal_avg,
                    "external_pct": external_pct,
                    "gap": gap
                }
            ))
        
        # R2.2: Low internal, high external
        elif gap < -self.EXAM_CONSISTENCY_GAP:
            insights.append(Insight(
                id=f"exam_late_bloomer_{offering_id}",
                category=InsightCategory.EXAM_CONSISTENCY,
                severity=InsightSeverity.INFO,
                title="Strong Final Exam Performance",
                description=f"You scored higher in externals ({external_pct:.0f}%) than internals ({internal_avg:.0f}%).",
                rationale="This may indicate improved preparation over time or comfort with final exam format.",
                recommendation="Consider applying similar preparation approach to internal exams for better consistency.",
                metadata={
                    "internal_avg": internal_avg,
                    "external_pct": external_pct,
                    "gap": abs(gap)
                }
            ))
        
        # R2.3: Consistent
        elif abs(gap) <= 10 and min(internal_avg, external_pct) >= 60:
            insights.append(Insight(
                id=f"exam_consistent_{offering_id}",
                category=InsightCategory.EXAM_CONSISTENCY,
                severity=InsightSeverity.INFO,
                title="Consistent Exam Performance",
                description=f"Similar performance in internals ({internal_avg:.0f}%) and externals ({external_pct:.0f}%).",
                rationale="Consistent scoring indicates stable preparation and exam skills.",
                recommendation="Continue with current study approach.",
                metadata={
                    "internal_avg": internal_avg,
                    "external_pct": external_pct
                }
            ))
        
        return insights
    
    # =========================================================================
    # RULE 3: Unit Weakness Detection
    # =========================================================================
    
    async def _unit_weakness_insights(
        self, 
        usn: str, 
        offering_id: UUID
    ) -> List[Insight]:
        """
        Detect weak units/topics.
        
        Rules:
        - R3.1: Specific unit below threshold
        - R3.2: Multiple weak units (pattern)
        """
        insights = []
        
        # Get unit-wise performance
        unit_perf = await self._get_unit_performance(usn, offering_id)
        if not unit_perf:
            return insights
        
        weak_units = [
            u for u in unit_perf 
            if u['percentage'] < self.UNIT_WEAKNESS_THRESHOLD and u['question_count'] >= 2
        ]
        
        if len(weak_units) >= 3:
            # R3.2: Multiple weak units
            unit_names = [u['unit_name'] for u in weak_units[:3]]
            avg_weak = sum(u['percentage'] for u in weak_units) / len(weak_units)
            
            insights.append(Insight(
                id=f"multi_unit_weakness_{offering_id}",
                category=InsightCategory.UNIT_WEAKNESS,
                severity=InsightSeverity.WARNING,
                title="Multiple Units Need Attention",
                description=f"Struggling in {len(weak_units)} units: {', '.join(unit_names)}.",
                rationale=f"Average score in these units is only {avg_weak:.0f}%, well below passing.",
                recommendation="Prioritize revision of these units. Consider seeking help from faculty or peers.",
                metadata={
                    "weak_units": weak_units,
                    "count": len(weak_units)
                }
            ))
        
        elif len(weak_units) == 1:
            # R3.1: Single weak unit
            unit = weak_units[0]
            insights.append(Insight(
                id=f"single_unit_weakness_{offering_id}_{unit['unit_no']}",
                category=InsightCategory.UNIT_WEAKNESS,
                severity=InsightSeverity.SUGGESTION,
                title=f"Focus Area: Unit {unit['unit_no']}",
                description=f"Scoring only {unit['percentage']:.0f}% in '{unit['unit_name']}'.",
                rationale="This specific unit is bringing down your overall performance.",
                recommendation=f"Review Unit {unit['unit_no']} topics thoroughly. Check if foundational concepts are clear.",
                metadata={
                    "unit_no": unit['unit_no'],
                    "unit_name": unit['unit_name'],
                    "percentage": unit['percentage']
                }
            ))
        
        return insights
    
    # =========================================================================
    # RULE 4: CO Pattern Detection
    # =========================================================================
    
    async def _co_pattern_insights(
        self, 
        usn: str, 
        offering_id: UUID
    ) -> List[Insight]:
        """
        Detect CO attainment patterns.
        
        Rules:
        - R4.1: Weak in specific CO
        - R4.2: Strong in all COs (positive)
        """
        insights = []
        
        # Get CO-wise performance
        co_perf = await self._get_co_performance(usn, offering_id)
        if not co_perf:
            return insights
        
        weak_cos = [co for co in co_perf if co['percentage'] < self.CO_WEAKNESS_THRESHOLD]
        strong_cos = [co for co in co_perf if co['percentage'] >= 75]
        
        if len(weak_cos) > 0:
            for co in weak_cos[:2]:  # Limit to top 2 weak COs
                insights.append(Insight(
                    id=f"co_weakness_{offering_id}_{co['co_code']}",
                    category=InsightCategory.CO_PATTERN,
                    severity=InsightSeverity.SUGGESTION,
                    title=f"Course Outcome Gap: {co['co_code']}",
                    description=f"Scoring {co['percentage']:.0f}% in {co['co_code']}: {co['description'][:50]}...",
                    rationale="This outcome measures a specific competency that needs strengthening.",
                    recommendation=f"Focus on topics related to {co['co_code']}. Review related questions from previous exams.",
                    metadata={
                        "co_code": co['co_code'],
                        "percentage": co['percentage'],
                        "description": co['description']
                    }
                ))
        
        # R4.2: All COs strong
        if len(strong_cos) == len(co_perf) and len(co_perf) >= 3:
            avg_co = sum(co['percentage'] for co in co_perf) / len(co_perf)
            insights.append(Insight(
                id=f"co_all_strong_{offering_id}",
                category=InsightCategory.CO_PATTERN,
                severity=InsightSeverity.INFO,
                title="Excellent CO Attainment",
                description=f"Strong performance across all {len(co_perf)} course outcomes ({avg_co:.0f}% avg).",
                rationale="You have demonstrated competency in all defined learning outcomes.",
                recommendation="Maintain this performance. Consider helping peers who may be struggling.",
                metadata={
                    "average": avg_co,
                    "co_count": len(co_perf)
                }
            ))
        
        return insights
    
    # =========================================================================
    # RULE 5: Improvement Trend Detection
    # =========================================================================
    
    async def _improvement_trend_insights(self, usn: str) -> List[Insight]:
        """
        Detect improvement or decline trends across semesters.
        
        Rules:
        - R5.1: Consistent improvement
        - R5.2: Recent decline
        """
        insights = []
        
        # Get semester-wise averages
        semester_perf = await self._get_semester_performance(usn)
        if len(semester_perf) < 2:
            return insights
        
        # Sort by semester
        sorted_perf = sorted(semester_perf, key=lambda x: x['semester'])
        
        # Check trend between last two semesters
        if len(sorted_perf) >= 2:
            prev = sorted_perf[-2]['average']
            curr = sorted_perf[-1]['average']
            change = curr - prev
            
            if change >= self.IMPROVEMENT_THRESHOLD:
                insights.append(Insight(
                    id=f"improvement_trend_{usn}",
                    category=InsightCategory.IMPROVEMENT_TREND,
                    severity=InsightSeverity.INFO,
                    title="Great Progress!",
                    description=f"Your average improved from {prev:.0f}% to {curr:.0f}% (+{change:.0f}%).",
                    rationale="Consistent improvement shows your hard work is paying off.",
                    recommendation="Keep up the excellent work. Set even higher targets for next semester.",
                    metadata={
                        "previous": prev,
                        "current": curr,
                        "change": change
                    }
                ))
            
            elif change <= -self.IMPROVEMENT_THRESHOLD:
                insights.append(Insight(
                    id=f"decline_trend_{usn}",
                    category=InsightCategory.IMPROVEMENT_TREND,
                    severity=InsightSeverity.WARNING,
                    title="Performance Decline Detected",
                    description=f"Your average dropped from {prev:.0f}% to {curr:.0f}% ({change:.0f}%).",
                    rationale="This decline may indicate increased difficulty or external factors.",
                    recommendation="Analyze what changed this semester. Consider seeking academic counseling.",
                    metadata={
                        "previous": prev,
                        "current": curr,
                        "change": change
                    }
                ))
        
        return insights
    
    async def _overall_bloom_insights(self, usn: str) -> List[Insight]:
        """Generate cross-subject Bloom insights."""
        # Aggregate across all offerings - simplified for now
        return []
    
    # =========================================================================
    # DATA FETCHING HELPERS
    # =========================================================================
    
    async def _get_bloom_performance(
        self, 
        usn: str, 
        offering_id: UUID
    ) -> List[BloomLevel]:
        """Fetch Bloom-level performance for a student in an offering."""
        result = self.db.execute(
            select(
                SubQuestion.bloom_level,
                func.sum(StudentQuestionMark.marks).label('scored'),
                func.sum(SubQuestion.max_marks).label('max_marks'),
                func.count(StudentQuestionMark.id).label('count')
            )
            .join(StudentQuestionMark, StudentQuestionMark.sub_question_id == SubQuestion.id)
            .join(Question, Question.id == SubQuestion.question_id)
            .join(ExamSection, ExamSection.id == Question.section_id)
            .join(Exam, Exam.id == ExamSection.exam_id)
            .where(and_(
                StudentQuestionMark.usn == usn,
                Exam.offering_id == offering_id,
                SubQuestion.bloom_level.isnot(None)
            ))
            .group_by(SubQuestion.bloom_level)
        )
        
        return [
            BloomLevel(
                level=row[0].lower() if row[0] else 'unknown',
                avg_percentage=(float(row[1]) / float(row[2]) * 100) if row[2] else 0,
                question_count=row[3],
                total_marks=float(row[2]) if row[2] else 0,
                scored_marks=float(row[1]) if row[1] else 0
            )
            for row in result.fetchall()
        ]
    
    def _avg_bloom_levels(
        self, 
        bloom_perf: List[BloomLevel], 
        levels: List[str]
    ) -> Optional[float]:
        """Calculate average percentage for specified Bloom levels."""
        matching = [b for b in bloom_perf if b.level in levels]
        if not matching:
            return None
        
        total_scored = sum(b.scored_marks for b in matching)
        total_max = sum(b.total_marks for b in matching)
        
        return (total_scored / total_max * 100) if total_max > 0 else None
    
    async def _get_internal_avg(
        self, 
        usn: str, 
        offering_id: UUID
    ) -> Optional[float]:
        """Get average internal exam percentage."""
        result = self.db.execute(
            select(
                func.sum(StudentQuestionMark.marks).label('scored'),
                func.sum(SubQuestion.max_marks).label('max')
            )
            .join(SubQuestion, SubQuestion.id == StudentQuestionMark.sub_question_id)
            .join(Question, Question.id == SubQuestion.question_id)
            .join(ExamSection, ExamSection.id == Question.section_id)
            .join(Exam, Exam.id == ExamSection.exam_id)
            .where(and_(
                StudentQuestionMark.usn == usn,
                Exam.offering_id == offering_id,
                Exam.exam_type.in_(['INT1', 'INT2'])
            ))
        )
        row = result.fetchone()
        if row and row[1]:
            return float(row[0]) / float(row[1]) * 100
        return None
    
    async def _get_external_percentage(
        self, 
        usn: str, 
        offering_id: UUID
    ) -> Optional[float]:
        """Get external exam percentage."""
        result = self.db.execute(
            select(FinalMarks.external_marks)
            .where(and_(
                FinalMarks.usn == usn,
                FinalMarks.offering_id == offering_id
            ))
            .order_by(FinalMarks.attempt_number.desc())
            .limit(1)
        )
        row = result.fetchone()
        if row and row[0]:
            # External is out of 60
            return float(row[0]) / 60 * 100
        return None
    
    async def _get_unit_performance(
        self, 
        usn: str, 
        offering_id: UUID
    ) -> List[Dict]:
        """Get unit-wise performance."""
        result = self.db.execute(
            select(
                Unit.unit_no,
                Unit.name,
                func.sum(StudentQuestionMark.marks).label('scored'),
                func.sum(SubQuestion.max_marks).label('max'),
                func.count(StudentQuestionMark.id).label('count')
            )
            .join(SubQuestion, SubQuestion.unit_id == Unit.id)
            .join(StudentQuestionMark, StudentQuestionMark.sub_question_id == SubQuestion.id)
            .where(and_(
                StudentQuestionMark.usn == usn,
                Unit.offering_id == offering_id
            ))
            .group_by(Unit.id, Unit.unit_no, Unit.name)
            .order_by(Unit.unit_no)
        )
        
        return [
            {
                'unit_no': row[0],
                'unit_name': row[1],
                'percentage': (float(row[2]) / float(row[3]) * 100) if row[3] else 0,
                'question_count': row[4]
            }
            for row in result.fetchall()
        ]
    
    async def _get_co_performance(
        self, 
        usn: str, 
        offering_id: UUID
    ) -> List[Dict]:
        """Get CO-wise performance."""
        result = self.db.execute(
            select(
                CourseOutcome.co_code,
                CourseOutcome.description,
                func.sum(StudentQuestionMark.marks).label('scored'),
                func.sum(SubQuestion.max_marks).label('max')
            )
            .join(SubQuestion, SubQuestion.co_id == CourseOutcome.id)
            .join(StudentQuestionMark, StudentQuestionMark.sub_question_id == SubQuestion.id)
            .where(and_(
                StudentQuestionMark.usn == usn,
                CourseOutcome.offering_id == offering_id
            ))
            .group_by(CourseOutcome.id, CourseOutcome.co_code, CourseOutcome.description)
            .order_by(CourseOutcome.co_code)
        )
        
        return [
            {
                'co_code': row[0],
                'description': row[1],
                'percentage': (float(row[2]) / float(row[3]) * 100) if row[3] else 0
            }
            for row in result.fetchall()
        ]
    
    async def _get_semester_performance(self, usn: str) -> List[Dict]:
        """Get semester-wise average performance."""
        result = self.db.execute(
            select(
                SubjectOffering.semester,
                func.avg((FinalMarks.internal_marks + FinalMarks.external_marks)).label('avg')
            )
            .join(SubjectOffering, SubjectOffering.id == FinalMarks.offering_id)
            .where(FinalMarks.usn == usn)
            .group_by(SubjectOffering.semester)
            .order_by(SubjectOffering.semester)
        )
        
        return [
            {
                'semester': row[0],
                'average': float(row[1]) if row[1] else 0
            }
            for row in result.fetchall()
        ]


# =============================================================================
# API HELPER FUNCTION
# =============================================================================

async def get_student_insights(
    db: Session,
    usn: str,
    offering_id: Optional[UUID] = None
) -> List[Dict]:
    """
    Generate insights for a student.
    
    Returns list of insight dictionaries ready for API response.
    """
    engine = InsightRuleEngine(db)
    insights = await engine.generate_insights(usn, offering_id)
    
    return [
        {
            'id': i.id,
            'category': i.category.value,
            'severity': i.severity.value,
            'title': i.title,
            'description': i.description,
            'rationale': i.rationale,
            'recommendation': i.recommendation,
            'metadata': i.metadata
        }
        for i in insights
    ]

"""
EduMetrics Analytics - Bloom's Taxonomy Analysis Service
GAP-03: Deep analysis of assessment quality distribution.

Analyze how well assessments cover different cognitive levels.
Supports both Legacy (string-based) and New (relation-based) Bloom mappings.
"""
from typing import List, Dict, Optional, Tuple
from uuid import UUID
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_

from app.models import (
    Exam, ExamSection, Question, SubQuestion, StudentQuestionMark,
    Bloom, Student
)
from app.services.analytics.schemas import (
    BloomAnalysisDTO, BloomStatsDTO, BloomLevelDTO, WarningDTO, AnalyticsResponse
)

class BloomAnalysisService:
    """
    Service for computing Bloom's Taxonomy distribution.
    
    Aggregates data from all exams in an offering to show:
    - Target Distribution (Max Marks per level)
    - Actual Performance (Obtained Marks per level)
    """
    
    def __init__(self, db: Session):
        self.db = db

    async def analyze_offering_bloom(
        self, 
        offering_id: UUID
    ) -> AnalyticsResponse:
        """
        Compute Bloom analysis for an offering.
        
        Aggregation Strategy:
        1. Fetch all exams (INT1, INT2, EXT) for the offering.
        2. Collect all sub-questions.
        3. Group by Bloom Level.
        4. Calculate Max Marks (Weightage) and Obtained Marks (Performance).
        """
        warnings = []
        
        # 1. Resolve Offering to get subject_id + cohort_id for robust exam lookup
        from app.models import SubjectOffering
        from sqlalchemy import or_
        offering = self.db.query(SubjectOffering).filter(SubjectOffering.id == offering_id).first()
        if not offering:
            return AnalyticsResponse(
                data=BloomAnalysisDTO(
                    offering_id=offering_id,
                    total_marks=Decimal(0),
                    bloom_distribution=[],
                    weakest_levels=[]
                ),
                warnings=[WarningDTO(code="NO_OFFERING", message="Offering not found")]
            )
        
        # Query exams by offering_id OR (subject_id + cohort_id) to handle both paths
        exams = self.db.query(Exam).filter(
            or_(
                Exam.offering_id == offering_id,
                and_(
                    Exam.subject_id == offering.subject_id,
                    Exam.cohort_id == offering.cohort_id
                )
            )
        ).all()
        
        if not exams:
            return AnalyticsResponse(
                data=BloomAnalysisDTO(
                    offering_id=offering_id,
                    total_marks=Decimal(0),
                    bloom_distribution=[],
                    weakest_levels=[]
                ),
                warnings=[WarningDTO(code="NO_EXAMS", message="No exams found for this offering")]
            )

        exam_ids = [e.id for e in exams]

        # 2. Fetch SubQuestions with Bloom Info
        # Hierarchy: Exam -> Section -> Question -> SubQuestion
        # We join back to Question/Section to filter by Exam
        
        stmt = (
            select(SubQuestion, Question, ExamSection)
            .join(Question, SubQuestion.question_id == Question.id)
            .join(ExamSection, Question.section_id == ExamSection.id)
            .where(ExamSection.exam_id.in_(exam_ids))
        )
        
        results = self.db.execute(stmt).all()
        
        # Data collectors
        # distinct levels found (id -> details)
        levels_map: Dict[str, BloomLevelDTO] = {} 
        # stats (level_key -> {max: 0, obtained: 0, count: 0})
        stats_map: Dict[str, Dict] = {}
        
        total_offering_marks = Decimal(0)

        # 3. Iterate and Aggregate
        for sq, q, sec in results:
            # Determine Bloom Level
            # Priority: SubQuestion.bloom_id > SubQuestion.bloom_level (legacy)
            
            level_key = None
            level_dto = None
            
            if sq.bloom_id:
                bloom_obj = self.db.query(Bloom).filter(Bloom.id == sq.bloom_id).first()
                if bloom_obj:
                    level_key = str(bloom_obj.id)
                    level_dto = BloomLevelDTO(
                        level_name=bloom_obj.level_name,
                        level_order=bloom_obj.level_order,
                        version=bloom_obj.version
                    )
            elif sq.bloom_level:
                # Legacy fallback
                level_key = sq.bloom_level.upper()
                level_dto = BloomLevelDTO(
                    level_name=sq.bloom_level,
                    level_order=99, # Unknown order
                    version="legacy"
                )
            
            if not level_key:
                # Unmapped question
                continue

            if level_key not in levels_map:
                levels_map[level_key] = level_dto
                stats_map[level_key] = {
                    "max": Decimal(0),
                    "obtained": Decimal(0),
                    "student_count": 0
                }
            
            # Aggregate Max Marks (Weightage)
            # Logic: Identify how much 'weight' this question carries in the course
            # Note: This sums RAW marks. 
            # If we want scaled, we need to know the scaling factor per exam.
            # For now, we use Raw Marks as it represents "Effort/Content" distribution better.
            stats_map[level_key]["max"] += Decimal(sq.max_marks)
            total_offering_marks += Decimal(sq.max_marks)
            
            # Aggregate Obtained Marks
            # Fetch all student marks for this sub-question
            marks_sum = self.db.query(func.sum(StudentQuestionMark.marks)).filter(
                StudentQuestionMark.sub_question_id == sq.id
            ).scalar() or 0
            
            count = self.db.query(func.count(StudentQuestionMark.id)).filter(
                StudentQuestionMark.sub_question_id == sq.id
            ).scalar() or 0
            
            stats_map[level_key]["obtained"] += Decimal(marks_sum)
            stats_map[level_key]["student_count"] += count

        # 4. Build Response
        dist_list = []
        weakest = []
        
        for key, stats in stats_map.items():
            lvl = levels_map[key]
            
            # Calculate metrics
            max_m = stats["max"]
            obt_m = stats["obtained"]
            cnt = stats["student_count"]
            
            # Logic for "Percentage":
            # Is it (Obtained / Potential_Obtained)? 
            # Potential_Obtained = Max_Marks * Number_of_Students_Attempting?
            # Or just raw sum comparison?
            # Standard Academy Metric: Average % score for questions of this level.
            # = (Total Obtained Marks / (Max_Marks_Per_Q * Student_Count)) * 100
            
            # We need to approximate if we don't have exact student count per question in this loop easily
            # But we aggregated student_count (total attempts)
            
            if cnt > 0 and max_m > 0:
                # Average score per attempt
                # But max_m in stats is SUM of max_marks for all questions.
                # We need proper normalizing.
                
                # Let's use: Performance = (Total Obtained / (Sum(Max_Marks_i * Attempts_i)))
                # But we summed Max Marks globally for the exam structure, not per attempt.
                
                # Simpler Metric:
                # Performance Index = (Total Obtained) / (Total Attempts * Avg Max Marks)?
                
                # Let's do it accurately: 
                # We need Sum(Max_Marks * Attempts) for the denominator.
                # Since we looped questions, we can't easily query that aggregate without grouping.
                
                # REVISION: Let's do a separate query or sum correctly inside loop.
                # Inside loop: stats["potential"] += (sq.max_marks * attempts_count)
                pass

        # RE-LOOP to calculate accurately
        # ... (Optimized implementation below)
        
        return await self._finalize_computation(offering_id, exam_ids)

    async def _finalize_computation(self, offering_id: UUID, exam_ids: List[UUID]) -> AnalyticsResponse:
        """Helper to run the optimized aggregation query."""
        
        # We need to join everything to get precise numbers
        # SubQuestion -> StudentMarks
        
        # 1. Get List of SubQuestions for these exams
        sq_rows = self.db.execute(
            select(SubQuestion)
            .join(Question)
            .join(ExamSection)
            .where(ExamSection.exam_id.in_(exam_ids))
        ).scalars().all()
        
        bloom_data = {} # key -> {level_obj, total_max, total_obtained, total_attempts_max}
        
        grand_total_structure_marks = Decimal(0)

        for sq in sq_rows:
            # Verify Bloom
            level_key, level_dto = self._resolve_bloom(sq)
            if not level_key: 
                continue
                
            if level_key not in bloom_data:
                bloom_data[level_key] = {
                    "level": level_dto,
                    "structure_max": Decimal(0), # Sum of Question Max Marks (Target Distribution)
                    "obtained": Decimal(0),
                    "potential": Decimal(0)      # Sum of (Question Max * Attempts)
                }
            
            # 1. Structure Weightage (How much this level appears in paper)
            bloom_data[level_key]["structure_max"] += Decimal(sq.max_marks)
            grand_total_structure_marks += Decimal(sq.max_marks)
            
            # 2. Performance (How well students did)
            # Query attempts for this SQ
            # OPTIMIZATION: This allows N+1 problem. 
            # Ideally we fetch all marks for these exams in bulk.
            
            # Bulk fetch marks stats
            stats = self.db.execute(
                select(
                    func.sum(StudentQuestionMark.marks),
                    func.count(StudentQuestionMark.id)
                ).where(StudentQuestionMark.sub_question_id == sq.id)
            ).first()
            
            marks_sum = stats[0] or 0
            attempts = stats[1] or 0
            
            bloom_data[level_key]["obtained"] += Decimal(marks_sum)
            bloom_data[level_key]["potential"] += (Decimal(sq.max_marks) * attempts)

        # Build Result
        final_list = []
        weakest = []
        
        for k, v in bloom_data.items():
            # Performance score
            perf_pct = Decimal(0)
            avg_score = Decimal(0)
            
            if v["potential"] > 0:
                perf_pct = (v["obtained"] / v["potential"]) * 100
                
            # Identify weak areas (< 60% performance)
            if perf_pct < 60:
                weakest.append(v["level"].level_name)
                
            final_list.append(BloomStatsDTO(
                level=v["level"],
                max_marks=v["structure_max"],
                obtained_marks=v["obtained"],
                percentage=round(perf_pct, 2),
                average_score=Decimal(0) # TODO: refine calculation 
            ))
            
        # Sort by Order
        final_list.sort(key=lambda x: x.level.level_order)

        return AnalyticsResponse(
            data=BloomAnalysisDTO(
                offering_id=offering_id,
                total_marks=grand_total_structure_marks,
                bloom_distribution=final_list,
                weakest_levels=weakest
            )
        )

    def _resolve_bloom(self, sq: SubQuestion) -> Tuple[Optional[str], Optional[BloomLevelDTO]]:
        """Resolve Bloom level from relation or legacy string."""
        if sq.bloom_id:
            # We need to load bloom. 
            # Assuming joined loading or individual fetch (cache recommended)
            bloom = self.db.query(Bloom).filter(Bloom.id == sq.bloom_id).first()
            if bloom:
                return str(bloom.id), BloomLevelDTO(
                    level_name=bloom.level_name,
                    level_order=bloom.level_order,
                    version=bloom.version
                )
        if sq.bloom_level:
            return sq.bloom_level.upper(), BloomLevelDTO(
                level_name=sq.bloom_level,
                level_order=99,
                version="legacy"
            )
        return None, None

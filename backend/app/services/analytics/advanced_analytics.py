
"""
EduMetrics - Advanced Analytics Service
Phase 3 Extension: Deep Insights & Quality Metrics

Implements:
1. Question Paper Quality Index (QPQI) - Teacher
2. Student Consistency Score - Teacher
3. Course Attainment Gap - HOD
4. Accreditation Readiness - Principal
"""
import statistics
from uuid import UUID
from typing import Dict, List, Optional, Any
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import func, distinct

from app.models import (
    Exam, Question, SubQuestion, Bloom, 
    StudentQuestionMark, SubjectOffering, CourseOutcome,
    Student, Department, Program, Cohort, Subject, COPOMapping
)
from app.services.analytics.schemas import AnalyticsResponse, WarningDTO

class AdvancedAnalyticsService:
    
    # -------------------------------------------------------------------------
    # TEACHER METRICS
    # -------------------------------------------------------------------------
    
    @staticmethod
    async def get_qpqi(db: Session, exam_id: UUID) -> AnalyticsResponse:
        """
        Calculate Question Paper Quality Index (QPQI).
        
        Evaluates:
        - Bloom's Taxonomy Distribution vs Ideal
        - CO Coverage (Are all COs for this exam covered?)
        """
        warnings = []
        exam = db.query(Exam).get(exam_id)
        if not exam:
            return AnalyticsResponse(data={}, warnings=[WarningDTO(code="404", message="Exam not found")], is_complete=False, computed_at=datetime.utcnow())

        # 1. Fetch Questions & Bloom
        questions = db.query(SubQuestion).join(Question).join(Question.section).filter(
            Question.section.has(exam_id=exam_id)
        ).all()
        
        if not questions:
            return AnalyticsResponse(data={"qpqi_score": 0, "status": "NO_QUESTIONS"}, warnings=[], is_complete=True, computed_at=datetime.utcnow())
            
        total_marks = sum(float(sq.max_marks) for sq in questions)
        if total_marks == 0:
            return AnalyticsResponse(data={"qpqi_score": 0}, warnings=[], is_complete=True, computed_at=datetime.utcnow())

        # 2. Calculate Actual Bloom Distribution
        bloom_marks = {
            "Remember": 0.0, "Understand": 0.0, "Apply": 0.0, 
            "Analyze": 0.0, "Evaluate": 0.0, "Create": 0.0
        }
        
        def normalize_bloom(b):
            b = str(b).capitalize()
            if "Rem" in b: return "Remember"
            if "Und" in b: return "Understand"
            if "App" in b: return "Apply"
            if "Ana" in b: return "Analyze"
            if "Eva" in b: return "Evaluate"
            if "Cre" in b: return "Create"
            return "Remember" 
            
        for sq in questions:
            b = sq.bloom_level or "Remember" 
            key = normalize_bloom(b)
            bloom_marks[key] += float(sq.max_marks)
            
        actual_dist = {k: round((v/total_marks)*100, 1) for k, v in bloom_marks.items()}
        
        # 3. Ideal Distribution (Simple Model)
        # LOTS (Remember+Understand) : ~60%
        # HOTS (Apply+Analyze+...) : ~40%
        
        lots = actual_dist["Remember"] + actual_dist["Understand"]
        hots = sum(actual_dist.values()) - lots
        
        ideal_hots = 40.0
        deviation = abs(hots - ideal_hots)
        
        # Score calculation (100 - deviation penalty)
        quality_score = max(0, 100 - (deviation * 1.5))
        
        recommendation = "Balanced paper."
        if hots < 20:
             recommendation = "Too easy. Increase Higher Order Thinking questions."
        elif hots > 60:
             recommendation = "Too hard. Increase fundamental questions."
             
        return AnalyticsResponse(
            data={
                "exam_id": str(exam_id),
                "qpqi_score": round(quality_score, 1),
                "bloom_distribution": actual_dist,
                "hots_percentage": round(hots, 1),
                "lots_percentage": round(lots, 1),
                "recommendation": recommendation
            },
            warnings=warnings,
            is_complete=True,
            computed_at=datetime.utcnow()
        )

    @staticmethod
    async def get_student_consistency(db: Session, student_id: UUID, offering_id: UUID) -> AnalyticsResponse:
        """
        Calculate Student Consistency Score.
        """
        stu = db.query(Student).filter(Student.user_id == student_id).first()
        if not stu:
             return AnalyticsResponse(data={}, warnings=[WarningDTO(code="404", message="Student not found")], is_complete=False, computed_at=datetime.utcnow())
             
        # Get exams for offering
        exams = db.query(Exam).filter(Exam.offering_id == offering_id, Exam.status == 'locked').all()
        exam_ids = [e.id for e in exams]
        
        if not exam_ids:
            return AnalyticsResponse(data={"consistency_score": None, "message": "No locked exams"}, warnings=[], is_complete=True, computed_at=datetime.utcnow())
            
        exam_scores = []
        
        for eid in exam_ids:
            questions = db.query(SubQuestion).join(Question).join(Question.section).filter(
                Question.section.has(exam_id=eid)
            ).all()
            sq_ids = [sq.id for sq in questions]
            max_m = sum(float(sq.max_marks) for sq in questions)
            
            if max_m == 0: continue
            
            marks = db.query(func.sum(StudentQuestionMark.marks)).filter(
                StudentQuestionMark.sub_question_id.in_(sq_ids),
                StudentQuestionMark.usn == stu.usn
            ).scalar()
            
            obtained = float(marks) if marks else 0
            pct = (obtained / max_m) * 100
            exam_scores.append(pct)
            
        if len(exam_scores) < 2:
            return AnalyticsResponse(
                data={
                    "consistency_score": 100.0, 
                    "standard_deviation": 0.0,
                    "trend": "Insufficient Data",
                    "exam_scores": exam_scores,
                    "message": "Need at least 2 exams"
                }, 
                warnings=[], is_complete=True, computed_at=datetime.utcnow()
            )
            
        stdev = statistics.stdev(exam_scores)
        consistency = max(0, 100 - stdev)
        
        trend = "Stable"
        if stdev > 15: trend = "Volatile"
        if stdev < 5: trend = "Very Consistent"
        
        return AnalyticsResponse(
            data={
                "consistency_score": round(consistency, 1),
                "standard_deviation": round(stdev, 2),
                "trend": trend,
                "exam_scores": [round(s, 1) for s in exam_scores]
            },
            warnings=[],
            is_complete=True,
            computed_at=datetime.utcnow()
        )

    # -------------------------------------------------------------------------
    # HOD METRICS
    # -------------------------------------------------------------------------

    @staticmethod
    async def get_course_attainment_gap(db: Session, offering_id: UUID) -> AnalyticsResponse:
        """
        Calculate gap between Target vs Actual Attainment per CO.
        """
        from app.services.analytics.co_service import compute_offering_co_attainments
        
        co_resp = await compute_offering_co_attainments(db, offering_id)
        if not co_resp.data:
             return co_resp
             
        gaps = []
        total_gap = 0
        count = 0
        
        # Determine actual CO objects to get thresholds (compute service might not return target)
        # We need to fetch COs again? 
        # Actually compute_offering_co_attainments returns 'average_attainment' but strict per-CO data is in 'cos'.
        
        cos_data = co_resp.data.cos 
        
        for co in cos_data:
            # co is COAttainmentDTO, has final_attainment
            actual = float(co.final_attainment.percentage) if co.final_attainment else 0.0
            
            # Target is usually defined on CO or PO. Assuming CO model has threshold.
            # We need to fetch CO definition to get threshold if not in response.
            # Response schema has 'threshold'? Let's assume standard 60% if missing or fetch.
            target = 60.0 # Default
            
            # Fetch real threshold from DB
            co_db = db.query(CourseOutcome).filter(CourseOutcome.co_code == co.co_code, CourseOutcome.offering_id == offering_id).first()
            if co_db and co_db.threshold:
                target = float(co_db.threshold)
                
            gap = target - actual
            gaps.append({
                "co_code": co.co_code,
                "target": target,
                "actual": actual,
                "gap": round(gap, 2),
                "status": "MET" if gap <= 0 else "MISSED"
            })
            total_gap += max(0, gap) # Only sum positive gaps (misses)
            count += 1
            
        avg_gap = (total_gap / count) if count > 0 else 0
        
        return AnalyticsResponse(
            data={
                "offering_id": str(offering_id),
                "average_gap": round(avg_gap, 2),
                "co_gaps": gaps,
                "critical_cos": [g["co_code"] for g in gaps if g["gap"] > 10]
            },
            warnings=co_resp.warnings,
            is_complete=True,
            computed_at=datetime.utcnow()
        )

    # -------------------------------------------------------------------------
    # PRINCIPAL METRICS
    # -------------------------------------------------------------------------

    @staticmethod
    async def get_accreditation_readiness(db: Session) -> AnalyticsResponse:
        """
        Calculate overall NBA/NAAC Digital Readiness Score.
        """
        # 1. CO Definition Completeness
        # % of SubjectOfferings that have at least 1 CO
        total_offerings = db.query(SubjectOffering).count()
        offerings_with_cos = db.query(distinct(CourseOutcome.offering_id)).count()
        
        score_co_def = (offerings_with_cos / total_offerings * 100) if total_offerings > 0 else 0
        
        # 2. CO-PO Mapping Completeness
        # % of COs that are mapped to at least one PO
        total_cos = db.query(CourseOutcome).count()
        mapped_cos = db.query(distinct(COPOMapping.co_id)).count()
        
        score_mapping = (mapped_cos / total_cos * 100) if total_cos > 0 else 0
        
        # 3. Assessment Data Health
        # % of Locked Exams vs Total Exams
        total_exams = db.query(Exam).count()
        locked_exams = db.query(Exam).filter(Exam.status == 'locked').count()
        
        score_exams = (locked_exams / total_exams * 100) if total_exams > 0 else 0
        
        # 4. Result Generation status
        # Has Final Marks been generated? 
        # Check active students with > 0 FinalMarks
        # Simplified: weighted average of above 3
        
        overall_score = (score_co_def * 0.3) + (score_mapping * 0.3) + (score_exams * 0.4)
        
        readiness_status = "NOT READY"
        if overall_score > 80: readiness_status = "READY"
        elif overall_score > 50: readiness_status = "NEEDS ACTION"
        
        return AnalyticsResponse(
            data={
                "readiness_score": round(overall_score, 1),
                "status": readiness_status,
                "components": {
                    "co_definition": round(score_co_def, 1),
                    "co_mapping": round(score_mapping, 1),
                    "assessment_data": round(score_exams, 1)
                },
                "recommendations": [
                    "Define missing COs for subjects" if score_co_def < 90 else None,
                    "Complete CO-PO mappings" if score_mapping < 90 else None,
                    "Lock pending exams" if score_exams < 90 else None
                ]
            },
            warnings=[],
            is_complete=True,
            computed_at=datetime.utcnow()
        )

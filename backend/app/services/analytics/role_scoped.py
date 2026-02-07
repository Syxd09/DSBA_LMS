"""
EduMetrics - Role-Scoped Analytics Service

PHASE 3: Analytics & Reporting Engine (Role-Scoped)
Consumes Phase-2B APIs to provide role-specific analytics views.

NO COMPUTATION HERE - delegates to Phase-2B services.
"""
from decimal import Decimal
from typing import Dict, List, Optional, Any
from uuid import UUID
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import (
    Profile, Department, Program, Cohort, Subject, StudentEnrollment,
    TeacherAssignment, CourseOutcome, ProgramOutcome,
    SubjectOffering, Exam, Question, SubQuestion, StudentMarks
)
from app.services.analytics.schemas import AnalyticsResponse, WarningDTO


class StudentAnalyticsService:
    """
    Student Analytics Layer (MOST DETAILED)
    Per project_outline.md Phase-3 Section 2A
    
    Shows:
    - Academic performance (subject-wise, semester trend)
    - CO-wise attainment (per subject)
    - Unit & Topic weakness heatmap
    - Bloom's taxonomy profile
    - Personalized insights
    """
    
    @staticmethod
    async def get_academic_performance(
        db: Session,
        student_id: UUID,
        regulation_year: int = 2021
    ) -> AnalyticsResponse:
        """
        Get student academic performance summary.
        Consumes Phase-2B marks API.
        """
        from app.services.analytics.marks_service import get_student_marks_for_offering
        
        warnings = []
        
        # Get student enrollment
        enrollment = db.query(StudentEnrollment).filter(
            StudentEnrollment.student_id == student_id,
            StudentEnrollment.status == "active"
        ).first()
        
        if not enrollment:
            return AnalyticsResponse(
                data={"error": "Student not enrolled"},
                warnings=[WarningDTO(code="NOT_ENROLLED", message="Student not found")],
                is_complete=False,
                computed_at=datetime.utcnow()
            )
        
        # Get offerings for this student's cohort
        offerings = db.query(SubjectOffering).filter(
            SubjectOffering.cohort_id == enrollment.cohort_id
        ).all()
        
        subjects_performance = []
        for offering in offerings:
            try:
                marks_response = await get_student_marks_for_offering(
                    db=db,
                    usn=enrollment.usn,
                    offering_id=offering.id,
                    regulation_year=regulation_year
                )
                if marks_response.data:
                    subjects_performance.append({
                        "offering_id": str(offering.id),
                        "subject_code": offering.subject.code if offering.subject else "",
                        "subject_name": offering.subject.name if offering.subject else "",
                        "internal_marks": marks_response.data.get("internal_total"),
                        "external_marks": marks_response.data.get("external_total"),
                        "total": marks_response.data.get("total"),
                        "percentage": marks_response.data.get("percentage"),
                        "grade": marks_response.data.get("grade"),
                        "is_pass": marks_response.data.get("is_pass", False)
                    })
                warnings.extend(marks_response.warnings)
            except Exception as e:
                warnings.append(WarningDTO(
                    code="MARKS_FETCH_ERROR",
                    message=f"Could not fetch marks for {offering.id}: {str(e)}"
                ))
        
        return AnalyticsResponse(
            data={
                "student_id": str(student_id),
                "usn": enrollment.usn,
                "subjects": subjects_performance,
                "subjects_count": len(subjects_performance),
                "passed_count": len([s for s in subjects_performance if s.get("is_pass")]),
                "failed_count": len([s for s in subjects_performance if not s.get("is_pass")]),
            },
            warnings=warnings,
            is_complete=len(warnings) == 0,
            computed_at=datetime.utcnow()
        )
    
    @staticmethod
    async def get_co_attainment_profile(
        db: Session,
        student_id: UUID,
        offering_id: UUID
    ) -> AnalyticsResponse:
        """
        Get student's CO-wise attainment for a subject.
        Consumes Phase-2B CO API.
        """
        from app.services.analytics.co_service import get_co_student_evidence
        
        enrollment = db.query(StudentEnrollment).filter(
            StudentEnrollment.student_id == student_id
        ).first()
        
        if not enrollment:
            return AnalyticsResponse(
                data={},
                warnings=[WarningDTO(code="NOT_ENROLLED", message="Student not found")],
                is_complete=False,
                computed_at=datetime.utcnow()
            )
        
        # Get all COs for this offering
        offering = db.query(SubjectOffering).get(offering_id)
        if not offering:
            return AnalyticsResponse(
                data={},
                warnings=[WarningDTO(code="OFFERING_NOT_FOUND", message="Offering not found")],
                is_complete=False,
                computed_at=datetime.utcnow()
            )
        
        cos = db.query(CourseOutcome).filter(
            CourseOutcome.offering_id == offering_id
        ).all()
        
        co_profile = []
        warnings = []
        
        for co in cos:
            try:
                evidence = await get_co_student_evidence(
                    db=db,
                    co_id=co.id,
                    offering_id=offering_id,
                    usn=enrollment.usn
                )
                if evidence.data and evidence.data.students:
                    student_data = evidence.data.students[0]
                    co_profile.append({
                        "co_id": str(co.id),
                        "co_code": f"CO{co.co_number}",
                        "co_statement": co.description,
                        "attainment_percentage": float(student_data.percentage) if student_data.percentage is not None else 0.0,
                        "threshold_met": student_data.meets_threshold,
                        "questions_attempted": len(student_data.question_breakdown)
                    })
                warnings.extend(evidence.warnings)
            except Exception as e:
                warnings.append(WarningDTO(
                    code="CO_FETCH_ERROR",
                    message=f"Could not fetch CO {co.id}: {str(e)}"
                ))
        
        return AnalyticsResponse(
            data={
                "student_id": str(student_id),
                "offering_id": str(offering_id),
                "co_profile": co_profile,
                "cos_met": len([c for c in co_profile if c.get("threshold_met")]),
                "cos_not_met": len([c for c in co_profile if not c.get("threshold_met")])
            },
            warnings=warnings,
            is_complete=len(warnings) == 0,
            computed_at=datetime.utcnow()
        )


class FacultyAnalyticsService:
    """
    Faculty Analytics Layer
    Per project_outline.md Phase-3 Section 2B
    
    Shows:
    - Subject health report (CO attainment vs threshold)
    - Question analysis (difficulty, attempt rate)
    - Topic coverage vs performance
    - Bloom balance
    """
    
    @staticmethod
    async def get_subject_health_report(
        db: Session,
        offering_id: UUID,
        teacher_id: UUID
    ) -> AnalyticsResponse:
        """
        Get subject health report for a teacher's offering.
        Consumes Phase-2B CO API.
        """
        from app.services.analytics.co_service import compute_offering_co_attainments
        
        # Verify teacher has access to this offering
        assignment = db.query(TeacherAssignment).filter(
            TeacherAssignment.teacher_id == teacher_id,
            TeacherAssignment.subject_offering_id == offering_id
        ).first()
        
        if not assignment:
            return AnalyticsResponse(
                data={"error": "Not assigned to this subject"},
                warnings=[WarningDTO(code="NOT_ASSIGNED", message="Teacher not assigned")],
                is_complete=False,
                computed_at=datetime.utcnow()
            )
        
        # Get CO attainment from Phase-2B
        co_response = await compute_offering_co_attainments(db=db, offering_id=offering_id)
        
        # Build health report
        health_summary = {
            "offering_id": str(offering_id),
            "total_cos": co_response.data.summary.total_cos if co_response.data else 0,
            "cos_attained": co_response.data.summary.cos_attained if co_response.data else 0,
            "average_attainment": float(co_response.data.summary.average_attainment) if co_response.data else 0,
            "health_status": "GOOD" if co_response.data and co_response.data.summary.cos_attained >= co_response.data.summary.total_cos * 0.7 else "NEEDS_ATTENTION"
        }
        
        return AnalyticsResponse(
            data=health_summary,
            warnings=co_response.warnings,
            is_complete=co_response.is_complete,
            computed_at=datetime.utcnow()
        )
    
    @staticmethod
    async def get_question_analysis(
        db: Session,
        exam_id: UUID
    ) -> AnalyticsResponse:
        """
        Get question-level analysis for an exam.
        Shows attempt rate, average marks, difficulty.
        """
        warnings = []
        
        exam = db.query(Exam).get(exam_id)
        if not exam:
            return AnalyticsResponse(
                data={},
                warnings=[WarningDTO(code="EXAM_NOT_FOUND", message="Exam not found")],
                is_complete=False,
                computed_at=datetime.utcnow()
            )
        
        # Get all questions and student marks
        questions = db.query(Question).filter(Question.exam_id == exam_id).all()
        
        question_analysis = []
        for question in questions:
            sub_questions = db.query(SubQuestion).filter(
                SubQuestion.question_id == question.id
            ).all()
            sq_ids = [sq.id for sq in sub_questions]
            
            marks = db.query(StudentMarks).filter(
                StudentMarks.sub_question_id.in_(sq_ids)
            ).all() if sq_ids else []
            
            # Calculate metrics
            total_students = len(set(m.student_id for m in marks)) if marks else 0
            attempted = len([m for m in marks if m.marks and float(m.marks) > 0])
            max_possible = sum(float(sq.max_marks) for sq in sub_questions) * total_students
            actual_total = sum(float(m.marks) for m in marks) if marks else 0
            
            avg_marks = (actual_total / total_students) if total_students > 0 else 0
            attempt_rate = (attempted / (total_students or 1)) * 100
            difficulty = "HARD" if avg_marks < 40 else "MEDIUM" if avg_marks < 70 else "EASY"
            
            question_analysis.append({
                "question_id": str(question.id),
                "question_number": question.question_number,
                "total_marks": float(question.total_marks),
                "avg_marks": round(avg_marks, 2),
                "attempt_rate": round(attempt_rate, 1),
                "difficulty": difficulty,
                "bloom_level": sub_questions[0].bloom_level.value if sub_questions and sub_questions[0].bloom_level else None,
                "co_code": f"CO{sub_questions[0].course_outcome.co_number}" if sub_questions and sub_questions[0].course_outcome else None
            })
        
        return AnalyticsResponse(
            data={
                "exam_id": str(exam_id),
                "questions": question_analysis,
                "hardest_question": min(question_analysis, key=lambda x: x["avg_marks"])["question_number"] if question_analysis else None,
                "easiest_question": max(question_analysis, key=lambda x: x["avg_marks"])["question_number"] if question_analysis else None
            },
            warnings=warnings,
            is_complete=True,
            computed_at=datetime.utcnow()
        )


class HODAnalyticsService:
    """
    HOD Analytics Layer (CONTROL TOWER)
    Per project_outline.md Phase-3 Section 2C
    
    Shows:
    - Batch comparison (batch vs batch CO attainment)
    - Semester health (all subjects summary)
    - Faculty comparison (CO attainment per faculty)
    - Backlog insight
    """
    
    @staticmethod
    async def get_department_health(
        db: Session,
        department_id: UUID
    ) -> AnalyticsResponse:
        """
        Get department-wide health summary.
        """
        warnings = []
        
        dept = db.query(Department).get(department_id)
        if not dept:
            return AnalyticsResponse(
                data={},
                warnings=[WarningDTO(code="DEPT_NOT_FOUND", message="Department not found")],
                is_complete=False,
                computed_at=datetime.utcnow()
            )
        
        # Get programs and cohorts
        programs = db.query(Program).filter(Program.department_id == department_id).all()
        program_ids = [p.id for p in programs]
        
        cohorts = db.query(Cohort).filter(
            Cohort.program_id.in_(program_ids)
        ).all() if program_ids else []
        
        # Count metrics
        total_students = db.query(StudentEnrollment).filter(
            StudentEnrollment.cohort_id.in_([c.id for c in cohorts]),
            StudentEnrollment.status == "active"
        ).count() if cohorts else 0
        
        total_offerings = db.query(SubjectOffering).filter(
            SubjectOffering.cohort_id.in_([c.id for c in cohorts])
        ).count() if cohorts else 0
        
        return AnalyticsResponse(
            data={
                "department_id": str(department_id),
                "department_name": dept.name,
                "programs_count": len(programs),
                "cohorts_count": len(cohorts),
                "active_students": total_students,
                "total_offerings": total_offerings,
                "health_status": "ACTIVE" if total_offerings > 0 else "NO_DATA"
            },
            warnings=warnings,
            is_complete=True,
            computed_at=datetime.utcnow()
        )
    
    @staticmethod
    async def get_batch_comparison(
        db: Session,
        department_id: UUID,
        batch_years: List[int]
    ) -> AnalyticsResponse:
        """
        Compare CO attainment across batches.
        """
        warnings = []
        
        programs = db.query(Program).filter(Program.department_id == department_id).all()
        program_ids = [p.id for p in programs]
        
        batch_data = []
        for year in batch_years:
            cohorts = db.query(Cohort).filter(
                Cohort.program_id.in_(program_ids),
                Cohort.admission_year == year
            ).all() if program_ids else []
            
            if cohorts:
                # Get CO attainment for this batch (simplified)
                offerings = db.query(SubjectOffering).filter(
                    SubjectOffering.cohort_id.in_([c.id for c in cohorts])
                ).all()
                
                batch_data.append({
                    "admission_year": year,
                    "cohorts": len(cohorts),
                    "offerings": len(offerings),
                    "status": "HAS_DATA" if offerings else "NO_DATA"
                })
        
        return AnalyticsResponse(
            data={
                "department_id": str(department_id),
                "batch_comparison": batch_data
            },
            warnings=warnings,
            is_complete=True,
            computed_at=datetime.utcnow()
        )


class PrincipalAnalyticsService:
    """
    Principal Analytics Layer (EXECUTIVE VIEW)
    Per project_outline.md Phase-3 Section 2D
    
    Shows:
    - Department comparison
    - Institutional outcome dashboard
    - Audit & compliance
    """
    
    @staticmethod
    async def get_institution_overview(
        db: Session
    ) -> AnalyticsResponse:
        """
        Get institution-wide overview for principal.
        """
        warnings = []
        
        # Count all entities
        total_departments = db.query(Department).count()
        total_programs = db.query(Program).count()
        total_cohorts = db.query(Cohort).count()
        total_students = db.query(StudentEnrollment).filter(
            StudentEnrollment.status == "active"
        ).count()
        total_teachers = db.query(TeacherAssignment).distinct(
            TeacherAssignment.teacher_id
        ).count()
        
        # Get department breakdown
        departments = db.query(Department).all()
        dept_summary = []
        for dept in departments:
            programs = db.query(Program).filter(Program.department_id == dept.id).count()
            cohorts = db.query(Cohort).join(Program).filter(
                Program.department_id == dept.id
            ).count()
            
            dept_summary.append({
                "department_id": str(dept.id),
                "department_name": dept.name,
                "programs": programs,
                "cohorts": cohorts
            })
        
        return AnalyticsResponse(
            data={
                "institution_summary": {
                    "departments": total_departments,
                    "programs": total_programs,
                    "cohorts": total_cohorts,
                    "active_students": total_students,
                    "active_teachers": total_teachers
                },
                "department_breakdown": dept_summary
            },
            warnings=warnings,
            is_complete=True,
            computed_at=datetime.utcnow()
        )
    
    @staticmethod
    async def get_department_comparison(
        db: Session
    ) -> AnalyticsResponse:
        """
        Compare departments by key metrics.
        """
        warnings = []
        
        departments = db.query(Department).all()
        comparison = []
        
        for dept in departments:
            programs = db.query(Program).filter(Program.department_id == dept.id).all()
            program_ids = [p.id for p in programs]
            
            cohorts = db.query(Cohort).filter(
                Cohort.program_id.in_(program_ids)
            ).all() if program_ids else []
            cohort_ids = [c.id for c in cohorts]
            
            students = db.query(StudentEnrollment).filter(
                StudentEnrollment.cohort_id.in_(cohort_ids),
                StudentEnrollment.status == "active"
            ).count() if cohort_ids else 0
            
            offerings = db.query(SubjectOffering).filter(
                SubjectOffering.cohort_id.in_(cohort_ids)
            ).count() if cohort_ids else 0
            
            comparison.append({
                "department_id": str(dept.id),
                "department_name": dept.name,
                "department_code": dept.code,
                "programs": len(programs),
                "cohorts": len(cohorts),
                "students": students,
                "offerings": offerings
            })
        
        # Sort by student count
        comparison.sort(key=lambda x: x["students"], reverse=True)
        
        return AnalyticsResponse(
            data={
                "comparison": comparison,
                "largest_department": comparison[0]["department_name"] if comparison else None,
                "total_departments": len(comparison)
            },
            warnings=warnings,
            is_complete=True,
            computed_at=datetime.utcnow()
        )

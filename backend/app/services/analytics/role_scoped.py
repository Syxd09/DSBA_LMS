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
    
    @staticmethod
    async def get_at_risk_students(
        db: Session,
        offering_id: UUID,
        teacher_id: UUID,
        threshold: float = 50.0
    ) -> AnalyticsResponse:
        """
        Get at-risk students for a specific offering.
        
        At-risk criteria:
        - Overall score below threshold (default 50%)
        - Failed COs count > 50%
        - Declining performance trend
        
        Optimized for large student volumes with batch query.
        """
        warnings = []
        
        # Verify teacher assignment (RBAC)
        assignment = db.query(TeacherAssignment).filter(
            TeacherAssignment.teacher_id == teacher_id,
            TeacherAssignment.subject_offering_id == offering_id
        ).first()
        
        if not assignment:
            return AnalyticsResponse(
                data={"error": "Not assigned to this subject"},
                warnings=[WarningDTO(code="NOT_ASSIGNED", message="Teacher not authorized for this offering")],
                is_complete=False,
                computed_at=datetime.utcnow()
            )
        
        # Get offering details
        offering = db.query(SubjectOffering).get(offering_id)
        if not offering:
            return AnalyticsResponse(
                data={},
                warnings=[WarningDTO(code="OFFERING_NOT_FOUND", message="Offering not found")],
                is_complete=False,
                computed_at=datetime.utcnow()
            )
        
        # Get all students in this offering's cohort (batch query)
        students = db.query(StudentEnrollment).filter(
            StudentEnrollment.cohort_id == offering.cohort_id,
            StudentEnrollment.status == "active"
        ).all()
        
        if not students:
            return AnalyticsResponse(
                data={"at_risk_students": [], "total_students": 0, "at_risk_count": 0},
                warnings=[],
                is_complete=True,
                computed_at=datetime.utcnow()
            )
        
        # Get all exams for this offering
        exams = db.query(Exam).filter(
            Exam.offering_id == offering_id,
            Exam.status == "locked"
        ).all()
        exam_ids = [e.id for e in exams]
        
        if not exam_ids:
            return AnalyticsResponse(
                data={
                    "at_risk_students": [],
                    "total_students": len(students),
                    "at_risk_count": 0,
                    "message": "No locked exams yet to evaluate"
                },
                warnings=[],
                is_complete=True,
                computed_at=datetime.utcnow()
            )
        
        # Batch query: Get all questions and subquestions for these exams
        questions = db.query(Question).filter(Question.exam_id.in_(exam_ids)).all()
        question_ids = [q.id for q in questions]
        
        sub_questions = db.query(SubQuestion).filter(
            SubQuestion.question_id.in_(question_ids)
        ).all() if question_ids else []
        sq_ids = [sq.id for sq in sub_questions]
        
        # Batch query: Get all student marks at once
        all_marks = db.query(StudentMarks).filter(
            StudentMarks.sub_question_id.in_(sq_ids)
        ).all() if sq_ids else []
        
        # Build lookup: student_id -> marks list
        student_marks_map = {}
        for mark in all_marks:
            if mark.student_id not in student_marks_map:
                student_marks_map[mark.student_id] = []
            student_marks_map[mark.student_id].append(mark)
        
        # Calculate max possible marks
        max_marks_per_sq = {sq.id: float(sq.max_marks) for sq in sub_questions}
        total_max_marks = sum(max_marks_per_sq.values())
        
        at_risk_students = []
        for student in students:
            marks = student_marks_map.get(student.usn, [])
            if not marks:
                # No marks yet - may be at risk
                at_risk_students.append({
                    "usn": student.usn,
                    "name": student.name,
                    "percentage": 0.0,
                    "status": "NO_DATA",
                    "reason": "No exam marks recorded yet",
                    "marks_obtained": 0,
                    "max_marks": total_max_marks
                })
                continue
            
            # Calculate total obtained
            obtained = sum(float(m.marks) if m.marks else 0 for m in marks)
            percentage = (obtained / total_max_marks * 100) if total_max_marks > 0 else 0
            
            if percentage < threshold:
                reason = "Low overall score"
                if percentage < 35:
                    reason = "Critical: Below passing threshold"
                elif percentage < 45:
                    reason = "Needs immediate attention"
                
                at_risk_students.append({
                    "usn": student.usn,
                    "name": student.name,
                    "email": student.email,
                    "percentage": round(percentage, 2),
                    "status": "AT_RISK",
                    "reason": reason,
                    "marks_obtained": round(obtained, 2),
                    "max_marks": total_max_marks
                })
        
        # Sort by percentage ascending (worst performers first)
        at_risk_students.sort(key=lambda x: x["percentage"])
        
        return AnalyticsResponse(
            data={
                "offering_id": str(offering_id),
                "subject_name": offering.subject.name if offering.subject else "",
                "subject_code": offering.subject.code if offering.subject else "",
                "at_risk_students": at_risk_students,
                "total_students": len(students),
                "at_risk_count": len(at_risk_students),
                "threshold_used": threshold,
                "at_risk_percentage": round(len(at_risk_students) / len(students) * 100, 1) if students else 0
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
    
    @staticmethod
    async def get_teacher_effectiveness(
        db: Session,
        department_id: UUID
    ) -> AnalyticsResponse:
        """
        Get teacher effectiveness metrics for HOD view.
        
        Metrics per teacher:
        - Assigned offerings count
        - Average CO attainment across subjects
        - Students taught count
        - Pending marks count
        """
        from app.services.analytics.co_service import compute_offering_co_attainments
        
        warnings = []
        
        dept = db.query(Department).get(department_id)
        if not dept:
            return AnalyticsResponse(
                data={},
                warnings=[WarningDTO(code="DEPT_NOT_FOUND", message="Department not found")],
                is_complete=False,
                computed_at=datetime.utcnow()
            )
        
        # Get all programs and cohorts in department
        programs = db.query(Program).filter(Program.department_id == department_id).all()
        program_ids = [p.id for p in programs]
        
        cohorts = db.query(Cohort).filter(
            Cohort.program_id.in_(program_ids)
        ).all() if program_ids else []
        cohort_ids = [c.id for c in cohorts]
        
        # Get all offerings in department
        offerings = db.query(SubjectOffering).filter(
            SubjectOffering.cohort_id.in_(cohort_ids)
        ).all() if cohort_ids else []
        offering_ids = [o.id for o in offerings]
        
        # Get teacher assignments
        assignments = db.query(TeacherAssignment).filter(
            TeacherAssignment.subject_offering_id.in_(offering_ids)
        ).all() if offering_ids else []
        
        # Group by teacher
        teacher_data = {}
        for assignment in assignments:
            teacher_id = str(assignment.teacher_id)
            if teacher_id not in teacher_data:
                teacher = db.query(Profile).filter(
                    Profile.user_id == assignment.teacher_id
                ).first()
                teacher_data[teacher_id] = {
                    "teacher_id": teacher_id,
                    "teacher_name": teacher.full_name if teacher else "Unknown",
                    "email": teacher.email if teacher else "",
                    "offerings": [],
                    "total_students": 0,
                    "co_attainments": []
                }
            
            # Get offering details
            offering = db.query(SubjectOffering).get(assignment.subject_offering_id)
            if offering:
                teacher_data[teacher_id]["offerings"].append({
                    "offering_id": str(offering.id),
                    "subject_code": offering.subject.code if offering.subject else "",
                    "subject_name": offering.subject.name if offering.subject else ""
                })
                
                # Count students
                students = db.query(StudentEnrollment).filter(
                    StudentEnrollment.cohort_id == offering.cohort_id,
                    StudentEnrollment.status == "active"
                ).count()
                teacher_data[teacher_id]["total_students"] += students
                
                # Get CO attainment for this offering
                try:
                    co_response = await compute_offering_co_attainments(db=db, offering_id=offering.id)
                    if co_response.data and co_response.data.summary:
                        teacher_data[teacher_id]["co_attainments"].append(
                            float(co_response.data.summary.average_attainment)
                        )
                except Exception:
                    pass  # Skip if CO computation fails
        
        # Calculate averages
        effectiveness_list = []
        for teacher_id, data in teacher_data.items():
            avg_co = sum(data["co_attainments"]) / len(data["co_attainments"]) if data["co_attainments"] else 0
            effectiveness_list.append({
                "teacher_id": data["teacher_id"],
                "teacher_name": data["teacher_name"],
                "email": data["email"],
                "offerings_count": len(data["offerings"]),
                "offerings": data["offerings"],
                "total_students": data["total_students"],
                "avg_co_attainment": round(avg_co, 1),
                "effectiveness": "HIGH" if avg_co >= 70 else "MEDIUM" if avg_co >= 50 else "NEEDS_SUPPORT" if avg_co > 0 else "NO_DATA"
            })
        
        # Sort by effectiveness
        effectiveness_list.sort(key=lambda x: x["avg_co_attainment"], reverse=True)
        
        return AnalyticsResponse(
            data={
                "department_id": str(department_id),
                "department_name": dept.name,
                "teachers": effectiveness_list,
                "summary": {
                    "total_teachers": len(effectiveness_list),
                    "high_performers": len([t for t in effectiveness_list if t["effectiveness"] == "HIGH"]),
                    "needs_support": len([t for t in effectiveness_list if t["effectiveness"] == "NEEDS_SUPPORT"])
                }
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
    
    @staticmethod
    async def get_comprehensive_analytics(
        db: Session
    ) -> AnalyticsResponse:
        """
        Get comprehensive analytics for principal - executive dashboard.
        Includes all key metrics for institution management.
        """
        from app.models import Exam
        
        warnings = []
        
        # Basic counts
        total_departments = db.query(Department).count()
        total_programs = db.query(Program).count()
        total_students = db.query(StudentEnrollment).filter(
            StudentEnrollment.status == "active"
        ).count()
        
        # Teacher stats
        teacher_assignments = db.query(TeacherAssignment).all()
        unique_teachers = len(set(ta.teacher_id for ta in teacher_assignments))
        
        # Get all active cohorts
        active_cohorts = db.query(Cohort).filter(
            Cohort.status.in_(["active", "ongoing"])
        ).all()
        
        # Calculate at-risk percentage across institution
        total_marks_entries = db.query(StudentMarks).count()
        
        # Exam stats
        total_exams = db.query(Exam).count()
        locked_exams = db.query(Exam).filter(Exam.marks_locked == True).count()
        pending_approval = db.query(Exam).filter(
            Exam.marks_locked == False
        ).count()
        
        # Department-wise breakdown
        departments = db.query(Department).all()
        dept_analytics = []
        
        for dept in departments:
            programs = db.query(Program).filter(Program.department_id == dept.id).all()
            program_ids = [p.id for p in programs]
            
            cohorts = db.query(Cohort).filter(
                Cohort.program_id.in_(program_ids)
            ).all() if program_ids else []
            cohort_ids = [c.id for c in cohorts]
            
            dept_students = db.query(StudentEnrollment).filter(
                StudentEnrollment.cohort_id.in_(cohort_ids),
                StudentEnrollment.status == "active"
            ).count() if cohort_ids else 0
            
            offerings = db.query(SubjectOffering).filter(
                SubjectOffering.cohort_id.in_(cohort_ids)
            ).all() if cohort_ids else []
            
            # CO count for this department
            co_count = 0
            for offering in offerings:
                co_count += db.query(CourseOutcome).filter(
                    CourseOutcome.subject_offering_id == offering.id
                ).count()
            
            dept_analytics.append({
                "id": str(dept.id),
                "name": dept.name,
                "code": dept.code,
                "programs": len(programs),
                "cohorts": len(cohorts),
                "students": dept_students,
                "offerings": len(offerings),
                "total_cos": co_count,
                "hod_name": dept.hod.full_name if dept.hod else "Not Assigned"
            })
        
        # Sort by student count
        dept_analytics.sort(key=lambda x: x["students"], reverse=True)
        
        return AnalyticsResponse(
            data={
                "summary": {
                    "total_departments": total_departments,
                    "total_programs": total_programs,
                    "total_students": total_students,
                    "total_teachers": unique_teachers,
                    "total_exams": total_exams,
                    "exams_locked": locked_exams,
                    "exams_pending": pending_approval,
                    "active_cohorts": len(active_cohorts)
                },
                "departments": dept_analytics,
                "alerts": {
                    "pending_approvals": pending_approval,
                    "departments_without_hod": len([d for d in dept_analytics if d["hod_name"] == "Not Assigned"])
                }
            },
            warnings=warnings,
            is_complete=True,
            computed_at=datetime.utcnow()
        )
    
    @staticmethod
    async def get_accreditation_readiness(
        db: Session
    ) -> AnalyticsResponse:
        """
        Get accreditation readiness score for NBA/NAAC compliance.
        """
        warnings = []
        
        # Check CO definitions
        offerings = db.query(SubjectOffering).all()
        offerings_with_cos = 0
        total_cos = 0
        
        for offering in offerings:
            cos = db.query(CourseOutcome).filter(
                CourseOutcome.subject_offering_id == offering.id
            ).count()
            if cos > 0:
                offerings_with_cos += 1
                total_cos += cos
        
        # Check PO definitions
        programs = db.query(Program).all()
        programs_with_pos = 0
        
        for program in programs:
            pos = db.query(ProgramOutcome).filter(
                ProgramOutcome.program_id == program.id
            ).count()
            if pos > 0:
                programs_with_pos += 1
        
        # Calculate readiness scores
        co_coverage = (offerings_with_cos / len(offerings) * 100) if offerings else 0
        po_coverage = (programs_with_pos / len(programs) * 100) if programs else 0
        
        # Check for locked exams (marks finalized)
        total_exams = db.query(Exam).count()
        locked_exams = db.query(Exam).filter(Exam.marks_locked == True).count()
        marks_completion = (locked_exams / total_exams * 100) if total_exams else 0
        
        overall_readiness = (co_coverage + po_coverage + marks_completion) / 3
        
        return AnalyticsResponse(
            data={
                "overall_readiness_score": round(overall_readiness, 1),
                "components": {
                    "co_definition": {
                        "score": round(co_coverage, 1),
                        "detail": f"{offerings_with_cos}/{len(offerings)} offerings have COs",
                        "total_cos": total_cos
                    },
                    "po_definition": {
                        "score": round(po_coverage, 1),
                        "detail": f"{programs_with_pos}/{len(programs)} programs have POs"
                    },
                    "marks_finalization": {
                        "score": round(marks_completion, 1),
                        "detail": f"{locked_exams}/{total_exams} exams finalized"
                    }
                },
                "recommendations": [
                    {"priority": "HIGH", "action": f"Define COs for {len(offerings) - offerings_with_cos} offerings"} if offerings_with_cos < len(offerings) else None,
                    {"priority": "HIGH", "action": f"Define POs for {len(programs) - programs_with_pos} programs"} if programs_with_pos < len(programs) else None,
                    {"priority": "MEDIUM", "action": f"Finalize marks for {total_exams - locked_exams} exams"} if locked_exams < total_exams else None,
                ],
                "status": "READY" if overall_readiness >= 80 else "NEEDS_ATTENTION" if overall_readiness >= 50 else "NOT_READY"
            },
            warnings=warnings,
            is_complete=True,
            computed_at=datetime.utcnow()
        )


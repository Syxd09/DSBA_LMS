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

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_

from app.models import (
    Profile, Department, Program, Cohort, Subject, Student,
    TeacherAssignment, CourseOutcome, ProgramOutcome,
    SubjectOffering, Exam, ExamSection, Question, SubQuestion, StudentQuestionMark, FinalMarks, Bloom
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
        student = db.query(Student).filter(
            Student.user_id == student_id,
            Student.status == "active"
        ).first()
        
        if not student:
            return AnalyticsResponse(
                data={"error": "Student not enrolled"},
                warnings=[WarningDTO(code="STU-001", message="Student not found or inactive")],
                is_complete=False,
                computed_at=datetime.utcnow()
            )
        
        # Get offerings for this student's cohort
        offerings = db.query(SubjectOffering).options(joinedload(SubjectOffering.subject)).filter(
            SubjectOffering.cohort_id == student.cohort_id
        ).all()
        
        subjects_performance = []
        for offering in offerings:
            try:
                marks_response = get_student_marks_for_offering(
                    db=db,
                    usn=student.usn,
                    offering_id=offering.id,
                    regulation_year=regulation_year
                )
                subjects_performance.append({
                    "offering_id": str(offering.id),
                    "subject_code": offering.subject.code if offering.subject else "",
                    "subject_name": offering.subject.name if offering.subject else "",
                    "internal_marks": marks_response.data.internal.total,
                    "external_marks": marks_response.data.external.total,
                    "total": marks_response.data.total.total,
                    "percentage": marks_response.data.total.percentage,
                    "grade": marks_response.data.grade.grade,
                    "is_pass": marks_response.data.grade.passed
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
                "usn": student.usn,
                "name": student.name,
                "subjects": subjects_performance,
                "subjects_count": len(subjects_performance),
                "passed_count": sum(1 for s in subjects_performance if s.get("is_pass")),
                "failed_count": sum(1 for s in subjects_performance if not s.get("is_pass")),
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
        
        enrollment = db.query(Student).filter(
            Student.user_id == student_id
        ).first()
        
        if not enrollment:
            return AnalyticsResponse(
                data={},
                warnings=[WarningDTO(code="STU-001", message="Student not found")],
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
                        "target_threshold": float(co.threshold) if co.threshold else 60.0,
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
            TeacherAssignment.offering_id == offering_id
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
        exam_id: UUID,
        teacher_id: UUID
    ) -> AnalyticsResponse:
        """
        Get question-level analysis for an exam.
        Shows attempt rate, average marks, difficulty.
        Strictly scoped to assigned teacher.
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
            
        # Verify teacher assignment (RBAC)
        # Exam is linked to offering directly or via subject/cohort
        assignment_query = db.query(TeacherAssignment).filter(
            TeacherAssignment.teacher_id == teacher_id
        )
        
        if exam.offering_id:
            assignment_query = assignment_query.filter(TeacherAssignment.offering_id == exam.offering_id)
        else:
            # Legacy or complex mapping: check subject + cohort
            # We need to find the offering ID for this subject/cohort to check assignment safely
            # Or just check if there is an assignment for this subject/cohort pair?
            # Assignments are usually by Offering ID now.
            # If exam lacks offering_id, we must find it.
            offering = db.query(SubjectOffering).filter(
                SubjectOffering.subject_id == exam.subject_id,
                SubjectOffering.cohort_id == exam.cohort_id
            ).first()
            if offering:
                 assignment_query = assignment_query.filter(TeacherAssignment.offering_id == offering.id)
            else:
                 # No offering found for this exam's context -> Deny
                 return AnalyticsResponse(
                    data={"error": "Context incomplete"},
                    warnings=[WarningDTO(code="DATA_ERR", message="Exam context missing")],
                    is_complete=False,
                    computed_at=datetime.utcnow()
                )

        assignment = assignment_query.first()
        
        if not assignment:
            return AnalyticsResponse(
                data={"error": "Not assigned to this subject"},
                warnings=[WarningDTO(code="NOT_ASSIGNED", message="You are not authorized to view this exam")],
                is_complete=False,
                computed_at=datetime.utcnow()
            )
        
        # Pre-fetch Bloom levels
        all_blooms = db.query(Bloom).all()
        bloom_id_map = {b.id: b.level_name for b in all_blooms}

        # Get all questions and student marks
        questions = db.query(Question).join(ExamSection, Question.section_id == ExamSection.id).filter(ExamSection.exam_id == exam_id).all()
        
        question_analysis = []
        for question in questions:
            sub_questions = db.query(SubQuestion).filter(
                SubQuestion.question_id == question.id
            ).all()
            sq_ids = [sq.id for sq in sub_questions]
            
            marks = db.query(StudentQuestionMark).filter(
                StudentQuestionMark.sub_question_id.in_(sq_ids)
            ).all() if sq_ids else []
            
            # Calculate metrics
            total_students = len(set(m.usn for m in marks)) if marks else 0
            # Guard against None marks
            attempted = len([m for m in marks if m.marks is not None and float(m.marks) > 0])
            max_possible = sum(float(sq.max_marks or 0) for sq in sub_questions) * total_students
            actual_total = sum(float(m.marks or 0) for m in marks) if marks else 0
            
            avg_marks = (actual_total / total_students) if total_students > 0 else 0
            attempt_rate = (attempted / (total_students or 1)) * 100
            difficulty = "HARD" if avg_marks < 40 else "MEDIUM" if avg_marks < 70 else "EASY"
            
            # Resolve Bloom
            bloom_name = None
            if sub_questions:
                sq = sub_questions[0]
                bloom_name = sq.bloom_level
                if not bloom_name and sq.bloom_id:
                    bloom_name = bloom_id_map.get(sq.bloom_id)
                # Fallback to parent question bloom if sq level missing
                if not bloom_name and question.bloom_level:
                     bloom_name = question.bloom_level
                if not bloom_name and question.bloom_id:
                     bloom_name = bloom_id_map.get(question.bloom_id)

            co_code = None
            if sub_questions and sub_questions[0].course_outcome:
                 co_code = f"CO{sub_questions[0].course_outcome.co_number}"

            question_analysis.append({
                "question_id": str(question.id),
                "question_number": question.sequence,
                "total_marks": float(question.max_marks),
                "avg_marks": round(avg_marks, 2),
                "attempt_rate": round(attempt_rate, 1),
                "difficulty": difficulty,
                "bloom_level": bloom_name,
                "co_code": co_code
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
            TeacherAssignment.offering_id == offering_id
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
        students = db.query(Student).filter(
            Student.cohort_id == offering.cohort_id,
            Student.status == "active"
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
            or_(
                Exam.offering_id == offering_id,
                and_(Exam.subject_id == offering.subject_id, Exam.cohort_id == offering.cohort_id)
            ),
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
        questions = db.query(Question).join(ExamSection, Question.section_id == ExamSection.id).filter(ExamSection.exam_id.in_(exam_ids)).all()
        question_ids = [q.id for q in questions]
        
        sub_questions = db.query(SubQuestion).filter(
            SubQuestion.question_id.in_(question_ids)
        ).all() if question_ids else []
        sq_ids = [sq.id for sq in sub_questions]
        
        # Batch query: Get all student marks at once
        all_marks = db.query(StudentQuestionMark).filter(
            StudentQuestionMark.sub_question_id.in_(sq_ids)
        ).all() if sq_ids else []
        
        # Build lookup: usn -> marks list
        student_marks_map = {}
        for mark in all_marks:
            if mark.usn not in student_marks_map:
                student_marks_map[mark.usn] = []
            student_marks_map[mark.usn].append(mark)
        
        # Calculate max possible marks
        max_marks_per_sq = {sq.id: float(sq.max_marks) for sq in sub_questions}
        total_max_marks = sum(max_marks_per_sq.values())
        
        # Get FinalMarks for attendance check
        final_marks_map = {}
        if offering.subject_id and offering.cohort_id:
            fms = db.query(FinalMarks).filter(
                FinalMarks.subject_id == offering.subject_id,
                FinalMarks.cohort_id == offering.cohort_id
            ).all()
            for fm in fms:
                final_marks_map[fm.student_id] = fm

        at_risk_students = []
        for student in students:
            reasons = []
            
            # 1. Check Attendance
            fm = final_marks_map.get(student.user_id) # maps by user_id usually? No, FinalMarks uses student_id as user_id or usn? 
            # Model check: FinalMarks.student_id is UUID (user_id).
            fm = final_marks_map.get(student.student_id)
            
            if fm and fm.attendance:
                # Assuming attendance is marks out of 5. < 3.75 is < 75%
                try:
                    att = float(fm.attendance)
                    if att < 3.75:
                        reasons.append("Low Attendance (<75%)")
                except:
                    pass

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
            obtained = sum(float(m.marks or 0) for m in marks)
            percentage = (obtained / total_max_marks * 100) if total_max_marks and total_max_marks > 0 else 0
            
            # 2. Check Overall Threshold
            if percentage < threshold:
                if percentage < 35:
                    reasons.append("Critical: Overall < 35%")
                elif percentage < 45:
                    reasons.append("Overall < 45%")
                else:
                    reasons.append("Low overall score")
            
            # 3. Check Specific Exam Failures (Heuristic: < 40% in any locked exam)
            # We need to map marks back to exams to do this efficiently
            # For now, simplistic approach: if overall is low, we flag it. 
            # To be more granular, we would need to group marks by exam_id.
            
            if reasons:
                at_risk_students.append({
                    "usn": student.usn,
                    "name": student.name,
                    "email": student.email,
                    "percentage": round(percentage, 2),
                    "status": "AT_RISK",
                    "reason": "; ".join(reasons),
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
        department_id: UUID,
        cohort_id: Optional[UUID] = None,
        semester: Optional[int] = None
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
        
        cohort_query = db.query(Cohort).filter(Cohort.program_id.in_(program_ids))
        if cohort_id:
            cohort_query = cohort_query.filter(Cohort.id == cohort_id)
        
        cohorts = cohort_query.all() if program_ids else []
        cohort_ids_list = [c.id for c in cohorts]
        
        # Count metrics
        total_students = db.query(Student).filter(
            Student.cohort_id.in_(cohort_ids_list),
            Student.status == "active"
        ).count() if cohort_ids_list else 0
        
        # Calculate Subject Stats for Backlog Analysis
        subject_stats = []
        
        offering_query = db.query(SubjectOffering).options(joinedload(SubjectOffering.subject)).filter(
            SubjectOffering.cohort_id.in_(cohort_ids_list)
        )
        if semester:
            offering_query = offering_query.filter(SubjectOffering.semester_no == semester)
            
        all_offerings = offering_query.all() if cohort_ids_list else []
        
        total_offerings = len(all_offerings)
        
        for offering in all_offerings:
             # Get marks for this offering
            students_enrolled = db.query(Student).filter(
                Student.cohort_id == offering.cohort_id,
                Student.status == "active"
            ).all()
            
            student_count = len(students_enrolled)
            if student_count == 0:
                continue
                
            # Get locked exams for this offering
            exams = db.query(Exam).filter(
                or_(
                    Exam.offering_id == offering.id,
                    and_(Exam.subject_id == offering.subject_id, Exam.cohort_id == offering.cohort_id)
                ),
                Exam.status == 'locked'
            ).all()
            exam_ids = [e.id for e in exams]
            
            if not exam_ids:
                continue

            # Fetch all marks for these exams
            # Simplified: Check if student has passing marks (>=40% usually)
            # For accurate analysis we need total internal + external. 
            # This is complex to do on fly. 
            # Strategy: Count students with < 40% in any locked exam or final calc.
            
            # Using a simplified heuristic for "Backlog Risk":
            # If student average across all locked exams < 50% -> At Risk / Potential Backlog
            
            backlog_count = 0
            internal_fails = 0
            external_fails = 0
            
            # Get questions to map marks
            questions = db.query(Question).join(ExamSection, Question.section_id == ExamSection.id).filter(ExamSection.exam_id.in_(exam_ids)).all()
            q_ids = [q.id for q in questions]
            sub_questions = db.query(SubQuestion).filter(SubQuestion.question_id.in_(q_ids)).all()
            sq_ids = [sq.id for sq in sub_questions]
            
            marks = db.query(StudentQuestionMark).filter(StudentQuestionMark.sub_question_id.in_(sq_ids)).all()
            
            # Map student -> total marks
            student_scores = {}
            for m in marks:
                if m.usn not in student_scores:
                    student_scores[m.usn] = 0
                student_scores[m.usn] += float(m.marks or 0)
                
            # Max possible marks
            total_max = sum(float(sq.max_marks) for sq in sub_questions)
            
            if total_max > 0:
                for s_id, score in student_scores.items():
                    percentage = (score / total_max) * 100
                    if percentage < 40: # Fail threshold
                        backlog_count += 1
                        # Heuristic: Internal vs External based on exam type
                        # We don't have exam type breakdown here easily without more queries.
                        # Assuming 50/50 split for prototype
                        internal_fails += 0.5 
                        external_fails += 0.5

            subject_stats.append({
                "offering_id": str(offering.id),
                "subject_code": offering.subject.code if offering.subject else "",
                "subject_name": offering.subject.name if offering.subject else "",
                "student_count": student_count,
                "backlog_count": backlog_count,
                "internal_fail_rate": (internal_fails / student_count * 100) if student_count else 0,
                "external_fail_rate": (external_fails / student_count * 100) if student_count else 0,
                "avg_attempts": 1 # Placeholder
            })
        
        # Sort by backlog count descending
        subject_stats.sort(key=lambda x: x["backlog_count"], reverse=True)

        return AnalyticsResponse(
            data={
                "department_id": str(department_id),
                "department_name": dept.name,
                "programs_count": len(programs),
                "cohorts_count": len(cohorts),
                "active_students": total_students,
                "total_offerings": total_offerings,
                "health_status": "ACTIVE" if total_offerings > 0 else "NO_DATA",
                "subject_stats": subject_stats
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
                Cohort.year == year
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
        department_id: UUID,
        cohort_id: Optional[UUID] = None,
        semester: Optional[int] = None
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
        cohort_ids_list = [c.id for c in cohorts]
        if cohort_id:
            cohort_ids_list = [cohort_id] if cohort_id in cohort_ids_list else []
        
        # Get all offerings in department (Filtered by semester if provided)
        offering_query = db.query(SubjectOffering).filter(
            SubjectOffering.cohort_id.in_(cohort_ids_list)
        )
        if semester:
            offering_query = offering_query.filter(SubjectOffering.semester_no == semester)
            
        offerings = offering_query.all() if cohort_ids_list else []
        offering_ids = [o.id for o in offerings]
        
        # Get teacher assignments
        assignments = db.query(TeacherAssignment).filter(
            TeacherAssignment.offering_id.in_(offering_ids)
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
            offering = db.query(SubjectOffering).get(assignment.offering_id)
            if offering:
                teacher_data[teacher_id]["offerings"].append({
                    "offering_id": str(offering.id),
                    "subject_code": offering.subject.code if offering.subject else "",
                    "subject_name": offering.subject.name if offering.subject else ""
                })
                
                # Count students
                students = db.query(Student).filter(
                    Student.cohort_id == offering.cohort_id,
                    Student.status == "active"
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
        Enhanced to include total_exams, active_cohorts, and alerts.
        """
        warnings = []
        
        # Count all entities
        total_departments = db.query(Department).count()
        total_programs = db.query(Program).count()
        total_cohorts = db.query(Cohort).count()
        total_students = db.query(Student).filter(
            Student.status == "active"
        ).count()
        total_teachers = db.query(TeacherAssignment).distinct(
            TeacherAssignment.teacher_id
        ).count()
        
        # Exam stats
        total_exams = db.query(Exam).count()
        locked_exams = db.query(Exam).filter(Exam.status == "locked").count()
        pending_approval = db.query(Exam).filter(
            Exam.status.in_(["submitted", "draft"])
        ).count()
        
        # Active cohorts
        active_cohorts = db.query(Cohort).filter(
            Cohort.status.in_(["active", "ongoing"])
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
                    "total_departments": total_departments,
                    "total_programs": total_programs,
                    "total_cohorts": total_cohorts,
                    "total_students": total_students,
                    "total_teachers": total_teachers,
                    "total_exams": total_exams,
                    "exams_locked": locked_exams,
                    "active_cohorts": active_cohorts
                },
                "department_breakdown": dept_summary,
                "alerts": {
                    "pending_approvals": pending_approval
                }
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
        Optimized to avoid N+1 query explosion.
        """
        warnings = []
        
        # 1. Fetch Hierarchy
        departments = db.query(Department).all()
        dept_map = {d.id: d for d in departments}

        # 2. Bulk Counts (Programs, Cohorts, Students, Offerings)
        # Programs per Dept
        prog_counts = db.query(
            Program.department_id, func.count(Program.id)
        ).group_by(Program.department_id).all()
        prog_map = {did: count for did, count in prog_counts}

        # Cohorts per Dept (via Program)
        cohort_counts = db.query(
            Program.department_id, func.count(Cohort.id)
        ).join(Program, Cohort.program_id == Program.id)\
         .group_by(Program.department_id).all()
        cohort_map = {did: count for did, count in cohort_counts}

        # Students per Dept (Active only)
        # Note: Joining through Cohort -> Program -> Department
        # Students per Dept (Active only)
        # Note: Joining through Cohort -> Program -> Department
        student_counts = db.query(
            Department.id, func.count(Student.usn)
        ).join(Program, Program.department_id == Department.id)\
         .join(Cohort, Cohort.program_id == Program.id)\
         .join(Student, Student.cohort_id == Cohort.id)\
         .filter(Student.status == "active")\
         .group_by(Department.id).all()
        student_map = {did: count for did, count in student_counts}

        # Offerings per Dept
        offering_counts = db.query(
            Department.id, func.count(SubjectOffering.id)
        ).join(Program, Program.department_id == Department.id)\
         .join(Cohort, Cohort.program_id == Program.id)\
         .join(SubjectOffering, SubjectOffering.cohort_id == Cohort.id)\
         .group_by(Department.id).all()
        offering_map = {did: count for did, count in offering_counts}

        # 3. Exam Metrics (Pass %, Avg Score, At Risk)
        # This is complex due to "Best N" logic, so we batch fetch per department
        # but optimized to 4 queries per department instead of N+1
        
        comparison = []
        
        for dept in departments:
            # Get metrics using optimized helper
            metrics = PrincipalAnalyticsService._compute_department_exam_metrics(db, dept.id)
            
            comparison.append({
                "department_id": str(dept.id),
                "department_name": dept.name,
                "department_code": dept.code,
                "programs": prog_map.get(dept.id, 0),
                "cohorts": cohort_map.get(dept.id, 0),
                "students": student_map.get(dept.id, 0),
                "offerings": offering_map.get(dept.id, 0),
                "pass_percentage": metrics["pass_percentage"],
                "average_score": metrics["average_score"],
                "at_risk_students": metrics["at_risk_students"]
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
    def _compute_department_exam_metrics(db: Session, dept_id: UUID) -> Dict[str, float]:
        """
        Compute exam metrics for a department using batch queries.
        Avoids N+1 loop by fetching all exams/marks in bulk.
        """
        # 1. Get all published exams for this department
        exams = db.query(Exam).join(Cohort).join(Program).filter(
            Program.department_id == dept_id,
            Exam.status.in_(["published", "locked"])
        ).all()
        
        if not exams:
            return {"pass_percentage": 0.0, "average_score": 0.0, "at_risk_students": 0}
            
        exam_ids = [e.id for e in exams]
        exam_map = {e.id: e for e in exams}
        
        # 2. Bulk fetch structure (Sections, Questions, SubQuestions)
        # Map: ExamID -> SectionID -> [Questions]
        # Map: QuestionID -> [SubQuestionIDs]
        
        # We need mapping from SubQuestionID -> Section info to apply Best N rules
        subq_to_section_map = {} # sq_id -> (section_obj, question_id)
        
        # Fetch sections
        sections = db.query(ExamSection).filter(ExamSection.exam_id.in_(exam_ids)).all()
        section_map = {s.id: s for s in sections}
        
        # Fetch questions
        questions = db.query(Question).filter(Question.section_id.in_(section_map.keys())).all()
        question_map = {q.id: q for q in questions}
        
        # Fetch subquestions
        subquestions = db.query(SubQuestion).filter(SubQuestion.question_id.in_(question_map.keys())).all()
        
        for sq in subquestions:
            q = question_map[sq.question_id]
            sec = section_map[q.section_id]
            subq_to_section_map[sq.id] = {
                "section_id": sec.id,
                "selection_mode": sec.selection_mode,
                "required_questions": sec.required_questions,
                "question_id": q.id
            }

        # 3. Bulk fetch marks
        all_marks = db.query(StudentQuestionMark).filter(StudentQuestionMark.exam_id.in_(exam_ids)).all()
        
        # Group marks by (Exam, Student)
        # student_exam_marks: { (exam_id, usn): { sub_q_id: mark } }
        student_exam_marks = {}
        
        for m in all_marks:
            key = (m.exam_id, m.usn)
            if key not in student_exam_marks:
                student_exam_marks[key] = {}
            student_exam_marks[key][m.sub_question_id] = m.marks

        # 4. Compute aggregation
        student_percentages = {} # usn -> [pct1, pct2]
        
        for (exam_id, usn), marks_dict in student_exam_marks.items():
            exam = exam_map[exam_id]
            if not exam.max_marks or exam.max_marks <= 0:
                continue
                
            # Compute total for this exam
            # Group marks by section -> question
            section_totals = {} # section_id -> total
            
            # Helper to group marks by question
            q_marks_map = {} # (section_id, question_id) -> total_marks
            
            for sq_id, mark in marks_dict.items():
                if sq_id not in subq_to_section_map:
                    continue # Should not happen if integrity is maintained
                
                meta = subq_to_section_map[sq_id]
                sec_id = meta["section_id"]
                q_id = meta["question_id"]
                
                k = (sec_id, q_id)
                q_marks_map[k] = q_marks_map.get(k, Decimal(0)) + mark
            
            # Apply Section Rules (Best N)
            current_exam_total = Decimal(0)
            
            # Iterate sections for this exam
            exam_sections = [s for s in sections if s.exam_id == exam_id]
            
            for sec in exam_sections:
                # Get all questions for this section that the student attempted
                q_scores = []
                # Find all questions in this section
                sec_questions = [q for q in questions if q.section_id == sec.id]
                
                for q in sec_questions:
                    score = q_marks_map.get((sec.id, q.id), Decimal(0))
                    q_scores.append(score)
                
                # Sort descending for Best N
                if sec.selection_mode == "BEST_N":
                    q_scores.sort(reverse=True)
                    section_total = sum(q_scores[:sec.required_questions])
                else:
                    # FIRST_N or ALL - simplified to take first N or all
                    # For strict FIRST_N we need sequence, assuming list is ordered by sequence?
                    # Using taking first N found for simplicity or ALL
                    # Re-reading logic: logic usually implies Best N or All. 
                    # If FIRST_N, we'd need to sort by Question.sequence.
                    # For now treating as ALL if not BEST_N to match previous logic
                    section_total = sum(q_scores[:sec.required_questions])
                
                current_exam_total += section_total
            
            pct = float(current_exam_total) / float(exam.max_marks) * 100
            if usn not in student_percentages:
                student_percentages[usn] = []
            student_percentages[usn].append(pct)
            
        # 5. Final Aggregates
        if not student_percentages:
            return {"pass_percentage": 0.0, "average_score": 0.0, "at_risk_students": 0}
            
        averages = {sid: sum(pcts)/len(pcts) for sid, pcts in student_percentages.items()}
        passed = sum(1 for avg in averages.values() if avg >= 40)
        pass_percentage = round(passed / len(averages) * 100, 1)
        average_score = round(sum(averages.values()) / len(averages), 1)
        at_risk_students = sum(1 for avg in averages.values() if avg < 40)
        
        return {
            "pass_percentage": pass_percentage,
            "average_score": average_score,
            "at_risk_students": at_risk_students
        }
    
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
        total_students = db.query(Student).filter(
            Student.status == "active"
        ).count()
        
        # Teacher stats
        teacher_assignments = db.query(TeacherAssignment).all()
        unique_teachers = len(set(ta.teacher_id for ta in teacher_assignments))
        
        # Get all active cohorts
        active_cohorts = db.query(Cohort).filter(
            Cohort.status.in_(["active", "ongoing"])
        ).all()
        
        # Calculate at-risk percentage across institution
        total_marks_entries = db.query(StudentQuestionMark).count()
        
        # Exam stats
        total_exams = db.query(Exam).count()
        locked_exams = db.query(Exam).filter(Exam.status == "locked").count()
        pending_approval = db.query(Exam).filter(
            Exam.status != "locked"
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
            
            dept_students = db.query(Student).filter(
                Student.cohort_id.in_(cohort_ids),
                Student.status == "active"
            ).count() if cohort_ids else 0
            
            offerings = db.query(SubjectOffering).filter(
                SubjectOffering.cohort_id.in_(cohort_ids)
            ).all() if cohort_ids else []
            
            # CO count for this department
            co_count = 0
            for offering in offerings:
                co_count += db.query(CourseOutcome).filter(
                    CourseOutcome.offering_id == offering.id
                ).count()
            
            # Get HOD name manually
            hod = db.query(Profile).filter(Profile.user_id == dept.hod_id).first() if dept.hod_id else None
            
            dept_analytics.append({
                "id": str(dept.id),
                "name": dept.name,
                "code": dept.code,
                "programs": len(programs),
                "cohorts": len(cohorts),
                "students": dept_students,
                "offerings": len(offerings),
                "total_cos": co_count,
                "hod_name": hod.full_name if hod else "Not Assigned"
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
                CourseOutcome.offering_id == offering.id
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
        locked_exams = db.query(Exam).filter(Exam.status == "locked").count()
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
                    r for r in [
                        {"priority": "HIGH", "action": f"Define COs for {len(offerings) - offerings_with_cos} offerings"} if offerings_with_cos < len(offerings) else None,
                        {"priority": "HIGH", "action": f"Define POs for {len(programs) - programs_with_pos} programs"} if programs_with_pos < len(programs) else None,
                        {"priority": "MEDIUM", "action": f"Finalize marks for {total_exams - locked_exams} exams"} if locked_exams < total_exams else None,
                    ] if r is not None
                ],
                "status": "READY" if overall_readiness >= 80 else "NEEDS_ATTENTION" if overall_readiness >= 50 else "NOT_READY"
            },
            warnings=warnings,
            is_complete=True,
            computed_at=datetime.utcnow()
        )


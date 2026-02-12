"""
EduMetrics Backend - Dashboard Router
Role-specific dashboard data endpoints

PHASE 3: Analytics & Reporting Engine (Role-Scoped)
- Student: Own marks, CO attainment, weakness analysis
- Teacher: Subject health, question analysis
- HOD: Department-wide analytics, faculty comparison
- Principal: Institution-wide metrics

RBAC: DASHBOARD_* permissions required per role.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from typing import List
from uuid import UUID

from app.database import get_db
from app.api.deps import (
    get_current_user, get_user_role, require_authenticated,
    PermissionChecker, Permission
)
from app.models import (
    Profile, UserRole, Department, Program, Cohort, Subject, Student,
    TeacherAssignment, Exam,
    FinalMarks, SemesterResult, CourseOutcome, StudentQuestionMark, SubQuestion, Question, ExamSection,
    SubjectOffering, Bloom
)
from app.core.permissions import AppRole
from app.schemas import (
    PrincipalDashboardData, HODDashboardData, 
    TeacherDashboardData, StudentDashboardData,
    DepartmentStats, COAttainmentData, BloomPerformance,
    PerformanceTrend, BloomDistribution
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


from app.services.analytics import marks_service

# _compute_exam_total_for_student REPLACED by marks_service.compute_exam_marks
# Wrappers below use the service function directly.


def _get_exam_computed_totals(db: Session, exam_id: UUID, exam_max_marks: Decimal) -> List[float]:
    """Get computed percentages for all students in an exam using on-demand computation."""
    # Get unique student USNs for this exam via StudentQuestionMark
    results = db.query(Student.user_id, Student.usn).join(
        StudentQuestionMark, Student.usn == StudentQuestionMark.usn
    ).filter(
        StudentQuestionMark.exam_id == exam_id
    ).distinct().all()
    
    percentages = []
    for student_id, usn in results:
        if not usn:
            continue
            
        total, _ = marks_service.compute_exam_marks(db, exam_id, usn)
        
        if total is not None and exam_max_marks > 0:
            pct = float(total) / float(exam_max_marks) * 100
            percentages.append(pct)
    
    return percentages


def _get_student_exam_averages(db: Session, cohort_ids: List = None) -> dict:
    """
    Compute per-student average percentage across all published/locked exams.
    Returns dict: {student_id: average_percentage}
    
    This replaces the broken FinalMarks-based approach by computing directly
    from StudentMarks (the table that actually gets populated during marks entry).
    """
    # Find all published/locked exams, optionally filtered by cohort
    exam_query = db.query(Exam).filter(
        Exam.status.in_(["published", "locked"])
    )
    if cohort_ids:
        exam_query = exam_query.filter(Exam.cohort_id.in_(cohort_ids))
    
    exams = exam_query.all()
    if not exams:
        return {}
    
    # Collect per-student percentages across all exams
    student_percentages = {}  # student_id -> [pct1, pct2, ...]
    
    for exam in exams:
        if not exam.max_marks or exam.max_marks <= 0:
            continue
        
        # Get unique student USNs with marks in this exam
        results = db.query(Student.user_id, Student.usn).join(
            StudentQuestionMark, Student.usn == StudentQuestionMark.usn
        ).filter(
            StudentQuestionMark.exam_id == exam.id
        ).distinct().all()
        
        for student_id, usn in results:
            if not usn:
                continue
                
            total, _ = marks_service.compute_exam_marks(db, exam.id, usn)
            
            # Total defaults to 0 if no marks, but we know student has marks
            # due to the query above.
            
            pct = float(total) / float(exam.max_marks) * 100
            if student_id not in student_percentages:
                student_percentages[student_id] = []
            student_percentages[student_id].append(pct)
    
    # Average across all exams per student
    return {
        sid: sum(pcts) / len(pcts) 
        for sid, pcts in student_percentages.items() 
        if pcts
    }


def calculate_at_risk_students(db: Session, cohort_ids: List = None) -> int:
    """Calculate at-risk students (those with avg < 40%).
    
    Now computes from actual StudentMarks via exam totals instead of
    the empty FinalMarks table.
    """
    averages = _get_student_exam_averages(db, cohort_ids)
    return sum(1 for avg in averages.values() if avg < 40)


def calculate_pass_rate(db: Session, cohort_ids: List = None) -> float:
    """Calculate pass rate (percentage of students with avg >= 40%).
    
    Now computes from actual StudentMarks via exam totals instead of
    the empty FinalMarks table.
    """
    averages = _get_student_exam_averages(db, cohort_ids)
    if not averages:
        return 0.0
    
    passed = sum(1 for avg in averages.values() if avg >= 40)
    return round(passed / len(averages) * 100, 1)


@router.get(
    "/principal",
    response_model=PrincipalDashboardData,
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_PRINCIPAL))]
)
async def get_principal_dashboard(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get principal dashboard data. RBAC: DASHBOARD_PRINCIPAL."""
    # Total counts
    total_students = db.query(Student).filter(Student.status == "active").count()
    total_teachers = db.query(UserRole).filter(UserRole.role == AppRole.TEACHER).count()
    total_subjects = db.query(Subject).count()
    total_departments = db.query(Department).count()
    
    # Calculate at-risk students
    at_risk_count = calculate_at_risk_students(db)
    
    # Calculate average pass rate
    avg_pass_rate = calculate_pass_rate(db)
    
    # Department stats with real data
    departments = db.query(Department).all()
    dept_stats = []
    
    for dept in departments:
        # Get programs and cohorts for this department
        programs = db.query(Program).filter(Program.department_id == dept.id).all()
        program_ids = [p.id for p in programs]
        
        cohorts = db.query(Cohort).filter(Cohort.program_id.in_(program_ids)).all() if program_ids else []
        cohort_ids = [c.id for c in cohorts]
        
        # Count students
        dept_students = db.query(Student).filter(
            Student.cohort_id.in_(cohort_ids),
            Student.status == "active"
        ).count() if cohort_ids else 0
        
        # Count teachers
        dept_teachers = db.query(TeacherAssignment).filter(
            TeacherAssignment.cohort_id.in_(cohort_ids)
        ).distinct(TeacherAssignment.teacher_id).count() if cohort_ids else 0
        
        # Calculate stats
        pass_rate = calculate_pass_rate(db, cohort_ids) if cohort_ids else 0.0
        at_risk = calculate_at_risk_students(db, cohort_ids) if cohort_ids else 0
        
        # Calculate average score across all exams in department
        dept_avg = 0.0
        if cohort_ids:
            dept_exams = db.query(Exam).filter(
                Exam.cohort_id.in_(cohort_ids),
                Exam.status.in_(["published", "locked"])
            ).all()
            
            all_pcts = []
            for exam in dept_exams:
                all_pcts.extend(_get_exam_computed_totals(db, exam.id, exam.max_marks))
            
            if all_pcts:
                dept_avg = sum(all_pcts) / len(all_pcts)
        
        dept_stats.append(DepartmentStats(
            id=str(dept.id),
            name=dept.name,
            code=dept.code,
            students=dept_students,
            teachers=dept_teachers,
            programs=len(programs),
            average_score=round(dept_avg, 1),
            pass_percentage=pass_rate,
            at_risk_students=at_risk
        ))
    
    # Calculate overall CO attainment
    co_data = []
    all_cos = db.query(CourseOutcome).order_by(CourseOutcome.co_number).limit(10).all()
    for co in all_cos:
        sub_questions = db.query(SubQuestion).filter(SubQuestion.co_id == co.id).all()
        sq_ids = [sq.id for sq in sub_questions]
        
        if sq_ids:
            marks = db.query(StudentQuestionMark).filter(StudentQuestionMark.sub_question_id.in_(sq_ids)).all()
            total_marks = sum(float(m.marks) for m in marks) if marks else 0
            # Calculate max marks based on number of students who attempted
            # Simplification: assuming all marks entries correspond to valid attempts
            # A better approach would be to count unique students per sub-question result
            
            # Correct calculation: max_marks_per_sq * number_of_students_who_attempted
            current_max = 0
            for sq in sub_questions:
                attempt_count = db.query(StudentQuestionMark).filter(StudentQuestionMark.sub_question_id == sq.id).count()
                current_max += float(sq.max_marks) * attempt_count
            
            attainment = (total_marks / current_max * 100) if current_max > 0 else 0
            
            co_data.append(COAttainmentData(
                co=f"CO{co.co_number}",
                co_number=co.co_number,
                description=co.description,
                attainment=round(attainment, 1),
                target=float(co.threshold) if co.threshold else 60.0,
                achieved=attainment >= (float(co.threshold) if co.threshold else 60.0)
            ))
            
    # Simple performance trend (mocked for pilot as we lack historical data)
    performance_trend = [
        PerformanceTrend(name="Previous Sem", average=0.0), # Placeholder
        PerformanceTrend(name="Current Sem", average=avg_pass_rate)
    ]
    
    return PrincipalDashboardData(
        total_students=total_students,
        total_teachers=total_teachers,
        total_subjects=total_subjects,
        total_departments=total_departments,
        at_risk_students=at_risk_count,
        avg_pass_rate=avg_pass_rate,
        co_attainment=co_data,
        department_stats=dept_stats,
        performance_trend=performance_trend
    )


@router.get(
    "/hod",
    response_model=HODDashboardData,
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_HOD))]
)
async def get_hod_dashboard(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get HOD dashboard data. RBAC: DASHBOARD_HOD."""
    # Get HOD's department - lookup via Department.hod_id
    dept = db.query(Department).filter(
        Department.hod_id == current_user.user_id
    ).first()
    
    # Get cohort IDs for the department
    cohort_ids = []
    if dept:
        programs = db.query(Program).filter(Program.department_id == dept.id).all()
        program_ids = [p.id for p in programs]
        cohorts = db.query(Cohort).filter(Cohort.program_id.in_(program_ids)).all() if program_ids else []
        cohort_ids = [c.id for c in cohorts]
    
    # Department students and teachers
    dept_students = db.query(Student).filter(
        Student.cohort_id.in_(cohort_ids),
        Student.status == "active"
    ).count() if cohort_ids else 0
    
    dept_teachers = db.query(TeacherAssignment).filter(
        TeacherAssignment.cohort_id.in_(cohort_ids)
    ).distinct(TeacherAssignment.teacher_id).count() if cohort_ids else 0
    
    # Calculate pass rate and at-risk for department
    pass_rate = calculate_pass_rate(db, cohort_ids) if cohort_ids else 0
    at_risk = calculate_at_risk_students(db, cohort_ids) if cohort_ids else 0
    
    # Subject performance
    subject_performance = []
    # Bloom distribution accumulator
    bloom_levels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']
    bloom_stats = {level: {"scored": 0.0, "max": 0.0, "count": 0} for level in bloom_levels}
    
    # Pre-fetch Bloom levels for resolution
    all_blooms = db.query(Bloom).all()
    bloom_id_map = {b.id: b.level_name for b in all_blooms}

    if cohort_ids:
        # Fetch exams
        exams = db.query(Exam).filter(
            Exam.cohort_id.in_(cohort_ids),
            Exam.status.in_(["published", "locked"])
        ).all()
        
        subject_stats = {}
        for exam in exams:
            # 1. Subject Stats
            subject = None
            if exam.subject_id:
                subject = db.query(Subject).filter(Subject.id == exam.subject_id).first()
            elif exam.offering_id:
                  # Fallback: Resolve via Offering
                 offering = db.query(SubjectOffering).filter(SubjectOffering.id == exam.offering_id).first()
                 if offering:
                     subject = db.query(Subject).filter(Subject.id == offering.subject_id).first()
            
            if subject:
                marks_list = _get_exam_computed_totals(db, exam.id, exam.max_marks)
                if marks_list:
                    if subject.id not in subject_stats:
                        subject_stats[subject.id] = {"subject": subject, "marks": []}
                    subject_stats[subject.id]["marks"].extend(marks_list)
            
            # 2. Bloom Stats (Aggregated)
            # Fetch all marks for this exam
            exam_marks = db.query(StudentQuestionMark).filter(StudentQuestionMark.exam_id == exam.id).all()
            if exam_marks:
                sq_ids = list(set(m.sub_question_id for m in exam_marks))
                sub_questions = db.query(SubQuestion).filter(SubQuestion.id.in_(sq_ids)).all()
                sq_map = {sq.id: sq for sq in sub_questions}
                
                # Pre-fetch parent questions for bloom level fallback
                q_ids = list(set(sq.question_id for sq in sub_questions if sq.question_id))
                questions = db.query(Question).filter(Question.id.in_(q_ids)).all()
                q_map = {q.id: q for q in questions}
                
                for mark in exam_marks:
                    sq = sq_map.get(mark.sub_question_id)
                    if sq:
                        # Improved Bloom Resolution: Legacy string -> Bloom ID
                        bloom = sq.bloom_level
                        if not bloom and sq.bloom_id:
                            bloom = bloom_id_map.get(sq.bloom_id)
                        
                        if not bloom and sq.question_id:
                            parent = q_map.get(sq.question_id)
                            if parent:
                                bloom = parent.bloom_level
                                if not bloom and parent.bloom_id:
                                    bloom = bloom_id_map.get(parent.bloom_id)
                        
                        if bloom and bloom in bloom_stats:
                            bloom_stats[bloom]["scored"] += float(mark.marks)
                            bloom_stats[bloom]["max"] += float(sq.max_marks)
                            bloom_stats[bloom]["count"] += 1

        for data in subject_stats.values():
            marks = data["marks"]
            subject = data["subject"]
            if marks:
                avg = sum(marks) / len(marks)
                passed = len([m for m in marks if m >= 40])
                subject_performance.append({
                    "subject_id": str(subject.id),
                    "subject_name": subject.name,
                    "subject_code": subject.code,
                    "average": round(avg, 1),
                    "highest": round(max(marks), 1),
                    "lowest": round(min(marks), 1),
                    "pass_rate": round(passed / len(marks) * 100, 1),
                    "total_students": len(marks)
                })
    
    # Calculate Bloom Distribution list
    bloom_distribution = []
    for level in bloom_levels:
        stats = bloom_stats[level]
        pct = 0.0
        if stats["max"] > 0:
            pct = (stats["scored"] / stats["max"]) * 100
        
        bloom_distribution.append(BloomDistribution(
            level=level,
            count=stats["count"],
            percentage=round(pct, 1)
        ))

    # CO attainment for department (Aggregated)
    co_attainment = []
    if cohort_ids:
        # Get all sub-questions for exams in this department
        # We need to link marks -> sub_question -> co -> co_number
        exam_ids = [e.id for e in exams] # already filtered by status
        
        # 1. Get all COs used in these exams
        # Join: CourseOutcome -> SubQuestion -> Question -> Exam
        # Easier: Get all SubQuestions for these exams, then group by CO
        
        if exam_ids:
            # 2. Bulk fetch structure
            # SubQuestions -> Questions -> Sections -> Exams
            # We need SubQuestions because they hold the CO mapping and marks
            
            # SubQuestions with COs
            sub_questions = db.query(SubQuestion).join(Question).join(ExamSection).filter(
                ExamSection.exam_id.in_(exam_ids),
                SubQuestion.co_id.isnot(None)
            ).all()
            
            sq_ids = [sq.id for sq in sub_questions]
            sq_co_map = {sq.id: sq.co_id for sq in sub_questions}
            sq_max_map = {sq.id: float(sq.max_marks) for sq in sub_questions}
            
            # 3. Bulk fetch marks for these sub-questions
            if sq_ids:
                all_marks = db.query(StudentQuestionMark).filter(
                    StudentQuestionMark.sub_question_id.in_(sq_ids)
                ).all()
                
                # 4. Aggregate by CO
                co_stats = {} # co_id -> {scored, max, target}
                
                # Pre-fetch COs for details
                co_ids = set(sq.co_id for sq in sub_questions)
                cos = db.query(CourseOutcome).filter(CourseOutcome.id.in_(co_ids)).all()
                co_map = {c.id: c for c in cos}
                
                for mark in all_marks:
                    sq_id = mark.sub_question_id
                    co_id = sq_co_map.get(sq_id)
                    
                    if co_id and co_id in co_map:
                        if co_id not in co_stats:
                            co_obj = co_map[co_id]
                            co_stats[co_id] = {
                                "co_obj": co_obj,
                                "scored": 0.0,
                                "max": 0.0
                            }
                        
                        co_stats[co_id]["scored"] += float(mark.marks)
                        # Max marks for this specific attempt
                        co_stats[co_id]["max"] += sq_max_map.get(sq_id, 0.0)
                
                # 5. Calculate attainment
                for co_id, stats in co_stats.items():
                    co = stats["co_obj"]
                    pct = 0.0
                    if stats["max"] > 0:
                        pct = (stats["scored"] / stats["max"]) * 100
                    
                    target = float(co.threshold) if co.threshold else 60.0
                    
                    co_attainment.append(COAttainmentData(
                        co=f"CO{co.co_number}",
                        co_number=co.co_number,
                        description=co.description or f"Course Outcome {co.co_number}",
                        attainment=round(pct, 1),
                        target=target,
                        achieved=pct >= target
                    ))
                
                # Sort by CO Number
                co_attainment.sort(key=lambda x: x.co_number)
    
    return HODDashboardData(
        department_students=dept_students,
        department_teachers=dept_teachers,
        pass_rate=pass_rate,
        at_risk_students=at_risk,
        subject_performance=subject_performance,
        co_attainment=co_attainment,
        bloom_distribution=bloom_distribution,
        programs=[{
            "id": str(p.id),
            "name": p.name,
            "code": p.code
        } for p in (programs if dept and 'programs' in locals() else [])]
    )


@router.get(
    "/teacher",
    response_model=TeacherDashboardData,
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_TEACHER))]
)
async def get_teacher_dashboard(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get teacher dashboard data. RBAC: DASHBOARD_TEACHER."""
    # Get teacher's assignments
    assignments = db.query(TeacherAssignment).filter(
        TeacherAssignment.teacher_id == current_user.user_id
    ).all()
    
    assigned_subjects = len(set(a.subject_id for a in assignments))
    
    # Get total students
    cohort_ids = [a.cohort_id for a in assignments]
    total_students = db.query(Student).filter(
        Student.cohort_id.in_(cohort_ids),
        Student.status == "active"
    ).count() if cohort_ids else 0
    
    # Pending evaluations (draft exams)
    pending = db.query(Exam).filter(
        Exam.teacher_id == current_user.user_id,
        Exam.status == "draft"
    ).count()
    
    # Calculate class average from computed marks
    subject_ids = [a.subject_id for a in assignments]
    class_average = 0.0
    if subject_ids and cohort_ids:
        exams = db.query(Exam).filter(
            Exam.subject_id.in_(subject_ids),
            Exam.cohort_id.in_(cohort_ids),
            Exam.status.in_(["published", "locked"])
        ).all()
        
        all_percentages = []
        for exam in exams:
            exam_percentages = _get_exam_computed_totals(db, exam.id, exam.max_marks)
            all_percentages.extend(exam_percentages)
        
        if all_percentages:
            class_average = round(sum(all_percentages) / len(all_percentages), 1)
    
    # Get subject details with exam stats and averages
    subjects_data = []
    for assignment in assignments:
        subject = None
        if assignment.subject_id:
            subject = db.query(Subject).filter(Subject.id == assignment.subject_id).first()
        elif assignment.offering_id:
             # Fallback: Resolve via Offering
             offering = db.query(SubjectOffering).filter(SubjectOffering.id == assignment.offering_id).first()
             if offering:
                 subject = db.query(Subject).filter(Subject.id == offering.subject_id).first()
        
        if subject:
            # Use offering_id from assignment, or derive from existing Offering if needed
            offering_id = assignment.offering_id
            
            # Filter exams by offering if available (more precise), else subject+cohort
            if offering_id:
                 exams = db.query(Exam).filter(
                    Exam.offering_id == offering_id,
                    Exam.status.in_(["published", "locked"])
                ).all()
            else:
                exams = db.query(Exam).filter(
                    Exam.subject_id == subject.id,
                    Exam.cohort_id == assignment.cohort_id,
                     Exam.status.in_(["published", "locked"])
                ).all()
            
            # Calculate subject average
            subject_avg = 0.0
            # ... (rest of logic same) ...
            for exam in exams:
                percentages = _get_exam_computed_totals(db, exam.id, exam.max_marks)
                if percentages:
                    subject_avg = round(sum(percentages) / len(percentages), 1)
                    # Don't break, average across ALL exams for this subject
            
            # Correct average calculation if multiple exams exist
            if exams:
                 # Re-calculate average across all exams
                 all_subject_pcts = []
                 for exam in exams:
                     all_subject_pcts.extend(_get_exam_computed_totals(db, exam.id, exam.max_marks))
                 if all_subject_pcts:
                     subject_avg = round(sum(all_subject_pcts) / len(all_subject_pcts), 1)

            subjects_data.append({
                "id": str(subject.id),
                "name": subject.name,
                "code": subject.code,
                "cohort_id": str(assignment.cohort_id),
                "exams_count": len(exams),
                "average": subject_avg,
                "offering_id": str(offering_id) if offering_id else None
            })
    
    return TeacherDashboardData(
        assigned_subjects=assigned_subjects,
        total_students=total_students,
        pending_evaluations=pending,
        class_average=class_average,
        subjects=subjects_data
    )


@router.get(
    "/student",
    response_model=StudentDashboardData,
    dependencies=[Depends(PermissionChecker(Permission.DASHBOARD_STUDENT))]
)
async def get_student_dashboard(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get student dashboard data. RBAC: DASHBOARD_STUDENT."""
    # Get student details (USN and cohort)
    student = db.query(Student).filter(Student.user_id == current_user.user_id).first()
    usn = student.usn if student else ""
    cohort_id = student.cohort_id if student else None

    effective_cohort_id = cohort_id
    
    # Count subjects enrolled via SubjectOffering for this cohort
    subjects_enrolled = 0
    if effective_cohort_id:
        subjects_enrolled = db.query(SubjectOffering).filter(
            SubjectOffering.cohort_id == effective_cohort_id
        ).count()
    
    # ---- COMPUTE RESULTS FROM StudentQuestionMark (the table that IS populated) ----
    # Get all marks for this student using USN
    student_marks = []
    if usn:
        student_marks = db.query(StudentQuestionMark).filter(
            StudentQuestionMark.usn == usn
        ).all()
    
    # Group marks by exam_id to compute per-exam totals
    exam_ids = list(set(m.exam_id for m in student_marks))
    
    # Get exam details
    exams = db.query(Exam).filter(
        Exam.id.in_(exam_ids),
        Exam.status.in_(["published", "locked"])
    ).all() if exam_ids else []
    
    # Compute per-subject results
    subject_results = {}  # subject_id -> {totals, max, exams}
    exam_map = {e.id: e for e in exams}
    
    for exam in exams:
        subject_id = exam.subject_id
        
        if not subject_id and exam.offering_id:
             # Fallback: Resolve via Offering
             offering = db.query(SubjectOffering).filter(SubjectOffering.id == exam.offering_id).first()
             if offering:
                 subject_id = offering.subject_id

        if not subject_id:
            continue
            
        total, _ = marks_service.compute_exam_marks(db, exam.id, usn)
        
        # We assume intent to display if exam is in the list derived from student_marks
        # marks_service returns 0 if no marks found.

        
        if subject_id not in subject_results:
            subject_results[subject_id] = {
                "exam_totals": [],
                "exam_max": [],
                "exam_types": []
            }
        subject_results[subject_id]["exam_totals"].append(float(total))
        subject_results[subject_id]["exam_max"].append(float(exam.max_marks))
        subject_results[subject_id]["exam_types"].append(exam.exam_type)
    
    # Build results list
    results = []
    percentages = []
    
    for subject_id, data in subject_results.items():
        subject = db.query(Subject).filter(Subject.id == subject_id).first()
        if not subject:
            continue
        
        total_marks = sum(data["exam_totals"])
        max_marks = sum(data["exam_max"])
        pct = (total_marks / max_marks * 100) if max_marks > 0 else 0
        percentages.append(pct)
        
        # Find offering for CO attainment chart
        offering_id = None
        if effective_cohort_id:
            offering = db.query(SubjectOffering).filter(
                SubjectOffering.subject_id == subject_id,
                SubjectOffering.cohort_id == effective_cohort_id
            ).first()
            if offering:
                offering_id = str(offering.id)
        
        results.append({
            "subject_id": str(subject_id),
            "subject_name": subject.name,
            "subject_code": subject.code,
            "offering_id": offering_id,
            "total_marks": round(total_marks, 1),
            "max_marks": round(max_marks, 1),
            "grade": "N/A",  # Grade is computed on demand
            "percentage": round(pct, 1)
        })
    
    # Calculate overall average from actual exam percentages
    overall_avg = sum(percentages) / len(percentages) if percentages else 0
    
    # Get semester result for SGPA/CGPA (if populated)
    semester_result = db.query(SemesterResult).filter(
        SemesterResult.student_id == current_user.user_id
    ).order_by(SemesterResult.semester.desc()).first()
    
    sgpa = float(semester_result.sgpa) if semester_result and semester_result.sgpa else 0.0
    cgpa = float(semester_result.cgpa) if semester_result and semester_result.cgpa else 0.0
    
    # ---- BLOOM PERFORMANCE (already uses StudentMarks correctly) ----
    bloom_performance = []
    bloom_levels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']
    
    # Pre-fetch Bloom levels for resolution
    all_blooms = db.query(Bloom).all()
    bloom_id_map = {b.id: b.level_name for b in all_blooms}
    
    if student_marks:
        sq_ids = [m.sub_question_id for m in student_marks]
        sub_questions = db.query(SubQuestion).filter(SubQuestion.id.in_(sq_ids)).all()
        sq_map = {sq.id: sq for sq in sub_questions}
        
        # Also get parent questions for bloom level
        question_ids = [sq.question_id for sq in sub_questions]
        questions = db.query(Question).filter(Question.id.in_(question_ids)).all()
        q_map = {q.id: q for q in questions}
        
        bloom_stats = {level: {"scored": 0, "max": 0, "count": 0} for level in bloom_levels}
        
        for mark in student_marks:
            sq = sq_map.get(mark.sub_question_id)
            if sq:
                # Improved Bloom Resolution: Legacy string -> Bloom ID
                bloom = sq.bloom_level
                if not bloom and sq.bloom_id:
                     bloom = bloom_id_map.get(sq.bloom_id)

                if not bloom and sq.question_id:
                    parent = q_map.get(sq.question_id)
                    if parent:
                        bloom = parent.bloom_level
                        if not bloom and parent.bloom_id:
                            bloom = bloom_id_map.get(parent.bloom_id)
                
                if bloom and bloom in bloom_stats:
                    bloom_stats[bloom]["scored"] += float(mark.marks)
                    bloom_stats[bloom]["max"] += float(sq.max_marks)
                    bloom_stats[bloom]["count"] += 1
        
        for level in bloom_levels:
            stats = bloom_stats[level]
            if stats["max"] > 0:
                percentage = (stats["scored"] / stats["max"]) * 100
                bloom_performance.append(BloomPerformance(
                    level=level,
                    percentage=round(percentage, 1),
                    questions_attempted=stats["count"],
                    total_questions=stats["count"]
                ))
    
    return StudentDashboardData(
        usn=usn,
        overall_average=round(overall_avg, 1),
        sgpa=sgpa,
        cgpa=cgpa,
        subjects_enrolled=subjects_enrolled,
        results=results,
        bloom_performance=bloom_performance
    )

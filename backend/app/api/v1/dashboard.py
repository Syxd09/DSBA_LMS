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
    StudentEnrollment, TeacherAssignment, Exam,
    FinalMarks, SemesterResult, CourseOutcome, StudentMarks, SubQuestion, Question, ExamSection,
    SubjectOffering
)
from app.core.permissions import AppRole
from app.schemas import (
    PrincipalDashboardData, HODDashboardData, 
    TeacherDashboardData, StudentDashboardData,
    DepartmentStats, COAttainmentData, BloomPerformance,
    PerformanceTrend, BloomDistribution
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _compute_exam_total_for_student(
    db: Session,
    exam_id: UUID,
    student_id: UUID
) -> Decimal:
    """
    Compute exam total for a student on-demand.
    This replaces the stored MarksComputed table.
    """
    sections = db.query(ExamSection).filter(ExamSection.exam_id == exam_id).all()
    student_marks = db.query(StudentMarks).filter(
        StudentMarks.exam_id == exam_id,
        StudentMarks.student_id == student_id
    ).all()
    
    if not student_marks:
        return None
    
    total = Decimal(0)
    
    for section in sections:
        section_questions = db.query(Question).filter(Question.section_id == section.id).all()
        
        if section.selection_mode == "BEST_N":
            question_totals = []
            for question in section_questions:
                sub_questions = db.query(SubQuestion).filter(SubQuestion.question_id == question.id).all()
                sq_ids = [sq.id for sq in sub_questions]
                q_marks = sum(m.marks for m in student_marks if m.sub_question_id in sq_ids)
                question_totals.append(q_marks)
            
            question_totals.sort(reverse=True)
            best = question_totals[:section.required_questions]
            total += sum(best)
        else:
            for question in section_questions[:section.required_questions]:
                sub_questions = db.query(SubQuestion).filter(SubQuestion.question_id == question.id).all()
                sq_ids = [sq.id for sq in sub_questions]
                q_marks = sum(m.marks for m in student_marks if m.sub_question_id in sq_ids)
                total += q_marks
    
    return total


def _get_exam_computed_totals(db: Session, exam_id: UUID, exam_max_marks: Decimal) -> List[float]:
    """Get computed percentages for all students in an exam."""
    # Get unique student IDs for this exam
    student_ids = db.query(StudentMarks.student_id).filter(
        StudentMarks.exam_id == exam_id
    ).distinct().all()
    
    percentages = []
    for (student_id,) in student_ids:
        total = _compute_exam_total_for_student(db, exam_id, student_id)
        if total is not None and exam_max_marks > 0:
            pct = float(total) / float(exam_max_marks) * 100
            percentages.append(pct)
    
    return percentages


def calculate_at_risk_students(db: Session, cohort_ids: List = None) -> int:
    """Calculate at-risk students (those with avg < 40%)."""
    query = db.query(FinalMarks)
    if cohort_ids:
        # Filter by cohort through student enrollment
        # Filter by cohort through Student table
        student_usns = db.query(Student.usn).filter(
            Student.cohort_id.in_(cohort_ids),
            Student.status == "active"
        ).subquery()
        query = query.filter(FinalMarks.usn.in_(student_usns))
    
    all_marks = query.all()
    at_risk = 0
    for fm in all_marks:
        # Compute total
        total = float(fm.internal_1 or 0) + float(fm.internal_2 or 0) + \
                float(fm.assignment_1 or 0) + float(fm.assignment_2 or 0) + \
                float(fm.attendance or 0) + float(fm.activity or 0) + \
                float(fm.external_marks or 0)
        # Assuming max marks 100
        if total < 40:
            at_risk += 1
            
    return at_risk


def calculate_pass_rate(db: Session, cohort_ids: List = None) -> float:
    """Calculate pass rate (percentage of students with avg >= 40%)."""
    query = db.query(FinalMarks)
    if cohort_ids:
        student_usns = db.query(Student.usn).filter(
            Student.cohort_id.in_(cohort_ids),
            Student.status == "active"
        ).subquery()
        query = query.filter(FinalMarks.usn.in_(student_usns))
    
    all_marks = query.all()
    if not all_marks:
        return 0.0
    
    passed = 0
    for fm in all_marks:
        total = float(fm.internal_1 or 0) + float(fm.internal_2 or 0) + \
                float(fm.assignment_1 or 0) + float(fm.assignment_2 or 0) + \
                float(fm.attendance or 0) + float(fm.activity or 0) + \
                float(fm.external_marks or 0)
        if total >= 40:
            passed += 1

    return round(passed / len(all_marks) * 100, 1)


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
            marks = db.query(StudentMarks).filter(StudentMarks.sub_question_id.in_(sq_ids)).all()
            total_marks = sum(float(m.marks) for m in marks) if marks else 0
            # Calculate max marks based on number of students who attempted
            # Simplification: assuming all marks entries correspond to valid attempts
            # A better approach would be to count unique students per sub-question result
            
            # Correct calculation: max_marks_per_sq * number_of_students_who_attempted
            current_max = 0
            for sq in sub_questions:
                attempt_count = db.query(StudentMarks).filter(StudentMarks.sub_question_id == sq.id).count()
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
    
    if cohort_ids:
        # Fetch exams
        exams = db.query(Exam).filter(
            Exam.cohort_id.in_(cohort_ids),
            Exam.status.in_(["published", "locked"])
        ).all()
        
        subject_stats = {}
        for exam in exams:
            # 1. Subject Stats
            subject = db.query(Subject).filter(Subject.id == exam.subject_id).first()
            if subject:
                marks_list = _get_exam_computed_totals(db, exam.id, exam.max_marks)
                if marks_list:
                    if subject.id not in subject_stats:
                        subject_stats[subject.id] = {"subject": subject, "marks": []}
                    subject_stats[subject.id]["marks"].extend(marks_list)
            
            # 2. Bloom Stats (Aggregated)
            # Fetch all marks for this exam
            exam_marks = db.query(StudentMarks).filter(StudentMarks.exam_id == exam.id).all()
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
                        bloom = sq.bloom_level
                        if not bloom and sq.question_id:
                            parent = q_map.get(sq.question_id)
                            if parent:
                                bloom = parent.bloom_level
                        
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

    # CO attainment for department (Placeholder/Aggregated)
    co_attainment = []
    
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
        subject = db.query(Subject).filter(Subject.id == assignment.subject_id).first()
        if subject:
            exams = db.query(Exam).filter(
                Exam.subject_id == subject.id,
                Exam.cohort_id == assignment.cohort_id
            ).all()
            
            # Calculate subject average
            subject_avg = 0.0
            for exam in exams:
                percentages = _get_exam_computed_totals(db, exam.id, exam.max_marks)
                if percentages:
                    subject_avg = round(sum(percentages) / len(percentages), 1)
                    break  # Use latest exam
            
            subjects_data.append({
                "id": str(subject.id),
                "name": subject.name,
                "code": subject.code,
                "cohort_id": str(assignment.cohort_id),
                "exams_count": len(exams),
                "average": subject_avg,
                "offering_id": str(assignment.offering_id) if assignment.offering_id else None
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
    # Get student details (USN)
    student = db.query(Student).filter(Student.user_id == current_user.user_id).first()
    usn = student.usn if student else ""

    # Get student enrollment
    enrollment = db.query(StudentEnrollment).filter(
        StudentEnrollment.student_id == current_user.user_id,
        StudentEnrollment.status == "active"
    ).first()
    
    subjects_enrolled = 0
    if enrollment:
        # Get subjects for the cohort
        cohort = db.query(Cohort).filter(Cohort.id == enrollment.cohort_id).first()
        if cohort:
            subjects_enrolled = db.query(Subject).filter(
                Subject.semester <= cohort.current_semester
            ).count()
    
    # Get final marks
    final_marks = db.query(FinalMarks).filter(
        FinalMarks.student_id == current_user.user_id
    ).all()
    
    # Calculate averages
    # Calculate averages
    percentages = []
    if final_marks:
        for fm in final_marks:
            total = float(fm.internal_1 or 0) + float(fm.internal_2 or 0) + \
                    float(fm.assignment_1 or 0) + float(fm.assignment_2 or 0) + \
                    float(fm.attendance or 0) + float(fm.activity or 0) + \
                    float(fm.external_marks or 0)
            # Assuming max marks is 100 for now
            percentages.append(total)
            
        overall_avg = sum(percentages) / len(percentages) if percentages else 0
    else:
        overall_avg = 0
    
    # Get semester result
    semester_result = db.query(SemesterResult).filter(
        SemesterResult.student_id == current_user.user_id
    ).order_by(SemesterResult.semester.desc()).first()
    
    sgpa = float(semester_result.sgpa) if semester_result and semester_result.sgpa else 0.0
    cgpa = float(semester_result.cgpa) if semester_result and semester_result.cgpa else 0.0
    
    # Build results data
    results = []
    for fm in final_marks:
        subject = db.query(Subject).filter(Subject.id == fm.subject_id).first()
        if subject:
            # Find the offering for this student's cohort
            offering_id = None
            if enrollment:
                offering = db.query(SubjectOffering).filter(
                    SubjectOffering.subject_id == subject.id,
                    SubjectOffering.cohort_id == enrollment.cohort_id
                ).first()
                if offering:
                    offering_id = str(offering.id)

            results.append({
                "subject_id": str(subject.id),
                "subject_name": subject.name,
                "subject_code": subject.code,
                "offering_id": offering_id,
                "internal_1": float(fm.internal_1) if fm.internal_1 else None,
                "internal_2": float(fm.internal_2) if fm.internal_2 else None,
                "total_marks": float(fm.internal_1 or 0) + float(fm.internal_2 or 0) + float(fm.external_marks or 0),
                "max_marks": 100,  # Assuming 100 max
                "grade": "N/A", # Grade is computed on demand, not stored
                "percentage": float(fm.internal_1 or 0) + float(fm.internal_2 or 0) + float(fm.external_marks or 0) # Simplified
            })
    
    # Calculate real Bloom performance from student's marks
    bloom_performance = []
    bloom_levels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']
    
    student_marks = db.query(StudentMarks).filter(
        StudentMarks.student_id == current_user.user_id
    ).all()
    
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
                # Get bloom level from sub-question or parent question
                bloom = sq.bloom_level
                if not bloom and sq.question_id:
                    parent = q_map.get(sq.question_id)
                    if parent:
                        bloom = parent.bloom_level
                
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

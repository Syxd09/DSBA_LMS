"""
EduMetrics Backend - Dashboard Router
Role-specific dashboard data endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from typing import List

from app.database import get_db
from app.api.deps import get_current_user, get_user_role, require_authenticated
from app.models import (
    Profile, UserRole, Department, Program, Cohort, Subject,
    StudentEnrollment, TeacherAssignment, Exam, MarksComputed,
    FinalMarks, SemesterResult, CourseOutcome, StudentMarks, SubQuestion, Question, ExamSection
)
from app.core.permissions import AppRole
from app.schemas import (
    PrincipalDashboardData, HODDashboardData, 
    TeacherDashboardData, StudentDashboardData,
    DepartmentStats, COAttainmentData, BloomPerformance
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def calculate_at_risk_students(db: Session, cohort_ids: List = None) -> int:
    """Calculate at-risk students (those with avg < 40%)."""
    query = db.query(FinalMarks).filter(FinalMarks.percentage < 40)
    if cohort_ids:
        # Filter by cohort through student enrollment
        student_ids = db.query(StudentEnrollment.student_id).filter(
            StudentEnrollment.cohort_id.in_(cohort_ids),
            StudentEnrollment.status == "active"
        ).subquery()
        query = query.filter(FinalMarks.student_id.in_(student_ids))
    return query.distinct(FinalMarks.student_id).count()


def calculate_pass_rate(db: Session, cohort_ids: List = None) -> float:
    """Calculate pass rate (percentage of students with avg >= 40%)."""
    query = db.query(FinalMarks)
    if cohort_ids:
        student_ids = db.query(StudentEnrollment.student_id).filter(
            StudentEnrollment.cohort_id.in_(cohort_ids),
            StudentEnrollment.status == "active"
        ).subquery()
        query = query.filter(FinalMarks.student_id.in_(student_ids))
    
    all_marks = query.all()
    if not all_marks:
        return 0.0
    
    passed = len([m for m in all_marks if m.percentage and float(m.percentage) >= 40])
    return round(passed / len(all_marks) * 100, 1)


@router.get("/principal", response_model=PrincipalDashboardData)
async def get_principal_dashboard(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get principal dashboard data."""
    # Total counts
    total_students = db.query(StudentEnrollment).filter(StudentEnrollment.status == "active").count()
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
        dept_students = db.query(StudentEnrollment).filter(
            StudentEnrollment.cohort_id.in_(cohort_ids),
            StudentEnrollment.status == "active"
        ).count() if cohort_ids else 0
        
        # Count teachers (unique teachers assigned to subjects in this department)
        dept_teachers = db.query(TeacherAssignment).filter(
            TeacherAssignment.cohort_id.in_(cohort_ids)
        ).distinct(TeacherAssignment.teacher_id).count() if cohort_ids else 0
        
        dept_stats.append(DepartmentStats(
            id=str(dept.id),
            name=dept.name,
            code=dept.code,
            students=dept_students,
            teachers=dept_teachers,
            programs=len(programs)
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
            max_marks = sum(float(sq.max_marks) * len(set(m.student_id for m in marks if m.sub_question_id == sq.id)) for sq in sub_questions)
            attainment = (total_marks / max_marks * 100) if max_marks > 0 else 0
            
            co_data.append(COAttainmentData(
                co=f"CO{co.co_number}",
                co_number=co.co_number,
                description=co.description,
                attainment=round(attainment, 1),
                target=70.0,
                achieved=attainment >= 70
            ))
    
    return PrincipalDashboardData(
        total_students=total_students,
        total_teachers=total_teachers,
        total_subjects=total_subjects,
        total_departments=total_departments,
        at_risk_students=at_risk_count,
        avg_pass_rate=avg_pass_rate,
        co_attainment=co_data,
        department_stats=dept_stats
    )


@router.get("/hod", response_model=HODDashboardData)
async def get_hod_dashboard(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get HOD dashboard data."""
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
    dept_students = db.query(StudentEnrollment).filter(
        StudentEnrollment.cohort_id.in_(cohort_ids),
        StudentEnrollment.status == "active"
    ).count() if cohort_ids else 0
    
    dept_teachers = db.query(TeacherAssignment).filter(
        TeacherAssignment.cohort_id.in_(cohort_ids)
    ).distinct(TeacherAssignment.teacher_id).count() if cohort_ids else 0
    
    # Calculate pass rate and at-risk for department
    pass_rate = calculate_pass_rate(db, cohort_ids) if cohort_ids else 0
    at_risk = calculate_at_risk_students(db, cohort_ids) if cohort_ids else 0
    
    # Subject performance
    subject_performance = []
    if cohort_ids:
        exams = db.query(Exam).filter(
            Exam.cohort_id.in_(cohort_ids),
            Exam.status.in_(["published", "locked"])
        ).all()
        
        subject_stats = {}
        for exam in exams:
            subject = db.query(Subject).filter(Subject.id == exam.subject_id).first()
            if not subject:
                continue
            
            computed = db.query(MarksComputed).filter(MarksComputed.exam_id == exam.id).all()
            if computed:
                marks_list = []
                for c in computed:
                    if c.total_marks and exam.max_marks:
                        pct = float(c.total_marks) / float(exam.max_marks) * 100
                        marks_list.append(pct)
                if subject.id not in subject_stats:
                    subject_stats[subject.id] = {"subject": subject, "marks": []}
                subject_stats[subject.id]["marks"].extend(marks_list)
        
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
    
    # CO attainment for department
    co_attainment = []
    
    return HODDashboardData(
        department_students=dept_students,
        department_teachers=dept_teachers,
        pass_rate=pass_rate,
        at_risk_students=at_risk,
        subject_performance=subject_performance,
        co_attainment=co_attainment
    )


@router.get("/teacher", response_model=TeacherDashboardData)
async def get_teacher_dashboard(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get teacher dashboard data."""
    # Get teacher's assignments
    assignments = db.query(TeacherAssignment).filter(
        TeacherAssignment.teacher_id == current_user.user_id
    ).all()
    
    assigned_subjects = len(set(a.subject_id for a in assignments))
    
    # Get total students
    cohort_ids = [a.cohort_id for a in assignments]
    total_students = db.query(StudentEnrollment).filter(
        StudentEnrollment.cohort_id.in_(cohort_ids),
        StudentEnrollment.status == "active"
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
            computed = db.query(MarksComputed).filter(MarksComputed.exam_id == exam.id).all()
            for c in computed:
                if c.total_marks and exam.max_marks:
                    pct = float(c.total_marks) / float(exam.max_marks) * 100
                    all_percentages.append(pct)
        
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
                computed = db.query(MarksComputed).filter(MarksComputed.exam_id == exam.id).all()
                if computed:
                    percentages = []
                    for c in computed:
                        if c.total_marks and exam.max_marks:
                            percentages.append(float(c.total_marks) / float(exam.max_marks) * 100)
                    if percentages:
                        subject_avg = round(sum(percentages) / len(percentages), 1)
                        break  # Use latest exam
            
            subjects_data.append({
                "id": str(subject.id),
                "name": subject.name,
                "code": subject.code,
                "cohort_id": str(assignment.cohort_id),
                "exams_count": len(exams),
                "average": subject_avg
            })
    
    return TeacherDashboardData(
        assigned_subjects=assigned_subjects,
        total_students=total_students,
        pending_evaluations=pending,
        class_average=class_average,
        subjects=subjects_data
    )


@router.get("/student", response_model=StudentDashboardData)
async def get_student_dashboard(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get student dashboard data."""
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
    if final_marks:
        percentages = [float(fm.percentage) for fm in final_marks if fm.percentage]
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
            results.append({
                "subject_id": str(subject.id),
                "subject_name": subject.name,
                "subject_code": subject.code,
                "internal_1": float(fm.internal_1) if fm.internal_1 else None,
                "internal_2": float(fm.internal_2) if fm.internal_2 else None,
                "total_marks": float(fm.internal_1 or 0) + float(fm.internal_2 or 0),
                "max_marks": 100,  # Assuming 100 max
                "grade": fm.grade,
                "percentage": float(fm.percentage) if fm.percentage else None
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
        overall_average=round(overall_avg, 1),
        sgpa=sgpa,
        cgpa=cgpa,
        subjects_enrolled=subjects_enrolled,
        results=results,
        bloom_performance=bloom_performance
    )

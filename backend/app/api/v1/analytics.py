"""
EduMetrics Backend - Analytics Router
Analytics and reporting endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
from decimal import Decimal

from app.database import get_db
from app.api.deps import require_teacher_or_above, require_hod_or_above
from app.models import (
    Profile, Exam, StudentMarks, SubQuestion, Question, ExamSection,
    CourseOutcome, Subject, StudentEnrollment, Cohort, Department, Program
)
from app.schemas import (
    COAttainmentData, BloomDistribution, SubjectPerformance, 
    DepartmentStats, AtRiskStudent
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/co-attainment/{subject_id}", response_model=List[COAttainmentData])
async def get_co_attainment(
    subject_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Get CO attainment data for a subject."""
    # Get all COs for the subject
    cos = db.query(CourseOutcome).filter(CourseOutcome.subject_id == subject_id).order_by(CourseOutcome.co_number).all()
    
    if not cos:
        return []
    
    # Get all exams for this subject
    exams = db.query(Exam).filter(
        Exam.subject_id == subject_id,
        Exam.status.in_(["published", "locked"])
    ).all()
    
    results = []
    target = 70.0  # Default target
    
    for co in cos:
        # Get all sub-questions mapped to this CO
        sub_questions = db.query(SubQuestion).filter(SubQuestion.co_id == co.id).all()
        questions = db.query(Question).filter(Question.co_id == co.id).all()
        
        sq_ids = [sq.id for sq in sub_questions]
        
        # Get marks for these sub-questions
        total_marks = Decimal(0)
        max_marks = Decimal(0)
        
        if sq_ids:
            marks = db.query(StudentMarks).filter(StudentMarks.sub_question_id.in_(sq_ids)).all()
            total_marks = sum(m.marks for m in marks) if marks else Decimal(0)
            
            # Calculate max possible marks
            for sq in sub_questions:
                student_count = len(set(m.student_id for m in marks if m.sub_question_id == sq.id))
                max_marks += Decimal(sq.max_marks) * student_count
        
        attainment = float(total_marks / max_marks * 100) if max_marks > 0 else 0.0
        
        results.append(COAttainmentData(
            co=f"CO{co.co_number}",
            co_number=co.co_number,
            description=co.description,
            attainment=round(attainment, 1),
            target=target,
            achieved=attainment >= target
        ))
    
    return results


@router.get("/bloom/{exam_id}", response_model=List[BloomDistribution])
async def get_bloom_distribution(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_teacher_or_above)
):
    """Get Bloom's taxonomy distribution for an exam."""
    bloom_levels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']
    
    # Get all questions for this exam
    sections = db.query(ExamSection).filter(ExamSection.exam_id == exam_id).all()
    section_ids = [s.id for s in sections]
    
    questions = db.query(Question).filter(Question.section_id.in_(section_ids)).all()
    sub_questions = db.query(SubQuestion).filter(
        SubQuestion.question_id.in_([q.id for q in questions])
    ).all()
    
    # Count by bloom level (case-insensitive)
    level_counts = {level.upper(): 0 for level in bloom_levels}
    total = len(questions) + len(sub_questions)
    
    for q in questions:
        if q.bloom_level and q.bloom_level.upper() in level_counts:
            level_counts[q.bloom_level.upper()] += 1
    
    for sq in sub_questions:
        if sq.bloom_level and sq.bloom_level.upper() in level_counts:
            level_counts[sq.bloom_level.upper()] += 1
    
    results = []
    for level in bloom_levels:
        count = level_counts[level.upper()]
        percentage = (count / total * 100) if total > 0 else 0
        results.append(BloomDistribution(
            level=level,
            count=count,
            percentage=round(percentage, 1)
        ))
    
    return results


@router.get("/subject-performance/{cohort_id}", response_model=List[SubjectPerformance])
async def get_subject_performance(
    cohort_id: UUID,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Get subject-wise performance for a cohort."""
    # Get all exams for this cohort
    exams = db.query(Exam).filter(
        Exam.cohort_id == cohort_id,
        Exam.status.in_(["published", "locked"])
    ).all()
    
    subject_stats = {}
    
    for exam in exams:
        subject = db.query(Subject).filter(Subject.id == exam.subject_id).first()
        if not subject:
            continue
        
        # Get computed marks for this exam
        from app.models import MarksComputed
        computed = db.query(MarksComputed).filter(MarksComputed.exam_id == exam.id).all()
        
        if not computed:
            continue
        
        marks_list = [float(c.total_marks) for c in computed]
        
        if subject.id not in subject_stats:
            subject_stats[subject.id] = {
                "subject": subject,
                "marks": [],
                "max_marks": exam.max_marks
            }
        
        subject_stats[subject.id]["marks"].extend(marks_list)
    
    results = []
    for subject_id, data in subject_stats.items():
        marks = data["marks"]
        max_marks = data["max_marks"]
        subject = data["subject"]
        
        if not marks:
            continue
        
        avg = sum(marks) / len(marks)
        pass_threshold = max_marks * 0.4  # 40% pass
        passed = len([m for m in marks if m >= pass_threshold])
        
        results.append(SubjectPerformance(
            subject_id=str(subject.id),
            subject_name=subject.name,
            subject_code=subject.code,
            average=round(avg, 1),
            highest=max(marks),
            lowest=min(marks),
            pass_rate=round(passed / len(marks) * 100, 1),
            total_students=len(marks)
        ))
    
    return results


@router.get("/department-stats", response_model=List[DepartmentStats])
async def get_department_stats(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Get statistics for all departments."""
    departments = db.query(Department).all()
    
    results = []
    for dept in departments:
        # Count programs
        programs = db.query(Program).filter(Program.department_id == dept.id).all()
        program_ids = [p.id for p in programs]
        
        # Count cohorts and students
        cohorts = db.query(Cohort).filter(Cohort.program_id.in_(program_ids)).all() if program_ids else []
        cohort_ids = [c.id for c in cohorts]
        
        students = db.query(StudentEnrollment).filter(
            StudentEnrollment.cohort_id.in_(cohort_ids),
            StudentEnrollment.status == "active"
        ).count() if cohort_ids else 0
        
        # TODO: Get actual teacher count from teacher_assignments
        teachers = 0
        
        results.append(DepartmentStats(
            id=str(dept.id),
            name=dept.name,
            code=dept.code,
            students=students,
            teachers=teachers,
            programs=len(programs)
        ))
    
    return results

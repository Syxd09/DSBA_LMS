"""
EduMetrics Analytics API - General Statistics Endpoints

Contains:
- Department Statistics
- Subject Performance
- Bloom Distribution
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import require_teacher_or_above, require_hod_or_above, require_authenticated
from app.models import (
    Exam, Question, SubQuestion, ExamSection, Subject,
    Department, Program, Cohort, Student, StudentQuestionMark
)
from app.schemas import (
    BloomDistribution, SubjectPerformance, DepartmentStats
)

router = APIRouter(prefix="/analytics", tags=["Analytics - General Stats"])


@router.get("/department-stats", response_model=List[DepartmentStats])
async def get_department_stats(
    db: Session = Depends(get_db),
    current_user = Depends(require_hod_or_above)
):
    """Get statistics for all departments."""
    departments = db.query(Department).all()
    
    results = []
    for dept in departments:
        # Count programs
        programs = db.query(Program).filter(Program.department_id == dept.id).all()
        program_ids = [p.id for p in programs]
        
        # Count cohorts and students (using Student model, not legacy StudentEnrollment)
        cohorts = db.query(Cohort).filter(Cohort.program_id.in_(program_ids)).all() if program_ids else []
        cohort_ids = [c.id for c in cohorts]
        
        students = db.query(Student).filter(
            Student.cohort_id.in_(cohort_ids),
            Student.status == "active"
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


@router.get("/subject-performance/{cohort_id}", response_model=List[SubjectPerformance])
async def get_subject_performance(
    cohort_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_hod_or_above)
):
    """Get subject-wise performance for a cohort."""
    from app.services.analytics import marks_service
    
    # Get all locked/published exams for this cohort
    exams = db.query(Exam).filter(
        Exam.cohort_id == cohort_id,
        Exam.status.in_(["published", "locked"])
    ).all()
    
    subject_stats = {}
    
    for exam in exams:
        subject = None
        if exam.subject_id:
             subject = db.query(Subject).filter(Subject.id == exam.subject_id).first()
        elif exam.offering_id:
             # Fallback: Resolve via Offering
             offering = db.query(SubjectOffering).filter(SubjectOffering.id == exam.offering_id).first()
             if offering:
                 subject = db.query(Subject).filter(Subject.id == offering.subject_id).first()

        if not subject:
            continue
        
        # Get unique student USNs for this exam
        student_usns = db.query(StudentQuestionMark.usn).filter(
            StudentQuestionMark.exam_id == exam.id
        ).distinct().all()
        
        if not student_usns:
            continue
        
        # Compute marks on-demand for each student
        marks_list = []
        for (usn,) in student_usns:
            total, _ = marks_service.compute_exam_marks(db, exam.id, usn)
            if total is not None:
                marks_list.append(float(total))
        
        if not marks_list:
            continue
        
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


@router.get("/bloom/{exam_id}", response_model=List[BloomDistribution])
async def get_bloom_distribution(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_teacher_or_above)
):
    """Get Bloom's taxonomy distribution for an exam."""
    bloom_levels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']
    
    # Get all sub-questions for this exam (sub-questions are the evaluable unit)
    sections = db.query(ExamSection).filter(ExamSection.exam_id == exam_id).all()
    if not sections:
        return [BloomDistribution(level=l, count=0, percentage=0.0) for l in bloom_levels]
    
    section_ids = [s.id for s in sections]
    questions = db.query(Question).filter(Question.section_id.in_(section_ids)).all()
    q_ids = [q.id for q in questions]
    q_bloom_map = {q.id: q.bloom_level for q in questions}  # fallback bloom from parent
    
    sub_questions = db.query(SubQuestion).filter(
        SubQuestion.question_id.in_(q_ids)
    ).all()
    
    # Count sub-questions by bloom level and sum max marks
    level_counts = {level.upper(): 0 for level in bloom_levels}
    level_max_marks = {level.upper(): 0 for level in bloom_levels}
    level_sq_ids = {level.upper(): [] for level in bloom_levels}
    
    for sq in sub_questions:
        # Priority: SubQuestion.bloom_level > parent Question.bloom_level
        bl = sq.bloom_level or q_bloom_map.get(sq.question_id)
        if bl and bl.upper() in level_counts:
            key = bl.upper()
            level_counts[key] += 1
            level_max_marks[key] += sq.max_marks or 0
            level_sq_ids[key].append(sq.id)
    
    total_questions = sum(level_counts.values()) or 1  # avoid division by zero
    
    results = []
    for level in bloom_levels:
        key = level.upper()
        count = level_counts[key]
        percentage = round((count / total_questions * 100), 1)
        results.append(BloomDistribution(
            level=level,
            count=count,
            percentage=percentage
        ))
    
    return results

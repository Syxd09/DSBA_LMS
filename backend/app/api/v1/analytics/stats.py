"""
EduMetrics Analytics API - General Statistics Endpoints

Migrated from legacy analytics.py.
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
    Department, Program, Cohort, StudentEnrollment
)
# We need schema definitions. Assuming they are in app.schemas or local.
# analytics.py imported from app.schemas.
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


@router.get("/subject-performance/{cohort_id}", response_model=List[SubjectPerformance])
async def get_subject_performance(
    cohort_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_hod_or_above)
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
        # Importing MarksComputed locally to avoid circular imports if any
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


@router.get("/bloom/{exam_id}", response_model=List[BloomDistribution])
async def get_bloom_distribution(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_teacher_or_above)
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

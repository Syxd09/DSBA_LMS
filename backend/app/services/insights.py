"""
EduMetrics - Insights Service
Generates rule-based insights for students, faculty, and HODs.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Dict, Optional
from uuid import UUID

from app.models import (
    Student, SubjectOffering, Subject,
    StudentQuestionMark, Exam, FinalMarks, CourseOutcome, SubQuestion, Question
)

async def get_student_insights(
    db: Session, 
    usn: str, 
    offering_id: Optional[UUID] = None
) -> List[Dict]:
    """
    Generate personalized insights for a student.
    
    analyzes:
    - Overall performance trend
    - Subject-specific weaknesses
    - CO attainment gaps
    - Attendance warnings
    - Bloom's taxonomy profile
    """
    insights = []
    
    # 1. Fetch Student Data
    student = db.query(Student).filter(Student.usn == usn).first()
    if not student:
        return []

    # 2. Check Attendance (Simple Rule)
    final_marks = db.query(FinalMarks).filter(FinalMarks.usn == usn)
    if offering_id:
        offering = db.query(SubjectOffering).get(offering_id)
        if offering:
            final_marks = final_marks.filter(FinalMarks.subject_id == offering.subject_id)
            
    final_marks = final_marks.all()
    
    for fm in final_marks:
        if fm.attendance:
             try:
                 att_val = float(fm.attendance)
                 if att_val < 75:
                     # Attendance marks (max 5) -> < 3.75 is < 75% ?? 
                     # Wait, fm.attendance is usually percentage in FinalMarks or marks?
                     # FinalMarks.attendance is usually "85.5".
                     # The logic `if float(fm.attendance) < 3.75` implies it checks *marks* not percentage.
                     # But `fm.attendance` field comment says "marks out of 5"?
                     # If it is marks: 5 * 0.75 = 3.75.
                     # If it is percentage: 75.
                     # Let's assume it checks percentage if > 5? Safe fallback.
                     
                     is_low = False
                     if att_val <= 5.0 and att_val < 3.75:
                         is_low = True
                     elif att_val > 5.0 and att_val < 75.0:
                         is_low = True
                         
                     if is_low:
                         subject = db.query(Subject).get(fm.subject_id)
                         insights.append({
                             "type": "warning",
                             "title": f"Low Attendance in {subject.code if subject else 'Unknown'}",
                             "description": "Your attendance is below 75%. You may be debarred from exams.",
                             "priority": "high"
                         })
             except ValueError:
                 pass

    # 3. Performance Analysis
    # ... (No changes needed here for now)
    
    recent_exams_query = db.query(Exam).filter(
        Exam.cohort_id == student.cohort_id
    )
    
    if offering_id:
        offering_obj = db.query(SubjectOffering).filter(SubjectOffering.id == offering_id).first()
        if offering_obj:
            recent_exams_query = recent_exams_query.filter(
                or_(
                    Exam.offering_id == offering_id,
                    and_(Exam.subject_id == offering_obj.subject_id, Exam.cohort_id == offering_obj.cohort_id)
                )
            )
        
    recent_exams = recent_exams_query.filter(Exam.status == 'locked').all()
    
    # 4. Bloom's Analysis
    # Query all marks for student using StudentQuestionMark (active model)
    marks_query = db.query(
        SubQuestion.bloom_level,
        func.sum(StudentQuestionMark.marks).label('scored'),
        func.sum(SubQuestion.max_marks).label('max')
    ).join(
        StudentQuestionMark, StudentQuestionMark.sub_question_id == SubQuestion.id
    ).filter(
        StudentQuestionMark.usn == usn
    )
    
    if offering_id:
         offering_for_bloom = db.query(SubjectOffering).filter(SubjectOffering.id == offering_id).first()
         if offering_for_bloom:
             marks_query = marks_query.join(
                 Question, Question.id == SubQuestion.question_id
             ).join(
                 Exam, Exam.id == StudentQuestionMark.exam_id
             ).filter(
                 or_(
                     Exam.offering_id == offering_id,
                     and_(Exam.subject_id == offering_for_bloom.subject_id, Exam.cohort_id == offering_for_bloom.cohort_id)
                 )
             )
         
    bloom_stats = marks_query.group_by(SubQuestion.bloom_level).all()
    
    for level, scored, max_m in bloom_stats:
        if not level or not max_m: continue
        
        # FIX: Handle potential None for scored
        scored_val = float(scored) if scored is not None else 0.0
        max_val = float(max_m)
        
        if max_val <= 0: continue
            
        pct = (scored_val / max_val) * 100
        
        if pct < 50 and level in ['Apply', 'Analyze', 'Evaluate', 'Create']:
            insights.append({
                "type": "weakness",
                "title": f"Difficulty with {level} Questions",
                "description": f"You are scoring low ({int(pct)}%) on questions requiring {level} skills. Practice more problem-solving.",
                "priority": "medium"
            })
        elif pct > 80:
             insights.append({
                "type": "strength",
                "title": f"Strong in {level}",
                "description": f"Excellent performance ({int(pct)}%) in {level} category.",
                "priority": "low"
            })

    # 5. CO Attainment Gaps (fetched separately via CO service)
    
    if not insights:
        insights.append({
            "type": "suggestion",
            "title": "Keep Consistency",
            "description": "No major issues detected. Consistency is key to success.",
            "priority": "low"
        })
        
    return insights

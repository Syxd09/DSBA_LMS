import sys
import os
from uuid import UUID
from sqlalchemy import func

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import SessionLocal
from app.models.subject_offering import SubjectOffering
from app.models.student import Student
from app.models.exam import Exam, Question, SubQuestion, ExamSection
from app.models.marks import StudentQuestionMark

BOLD = "\033[1m"
RED = "\033[91m"
GREEN = "\033[92m"
RESET = "\033[0m"

from app.models.outcomes import CourseOutcome

def diagnose():
    db = SessionLocal()
    print(f"{BOLD}=== DIAGNOSTIC REPORT (v5) ==={RESET}")

    # 1. Check Offerings
    offerings = db.query(SubjectOffering).all()
    print(f"\n{BOLD}1. Subject Offerings ({len(offerings)}){RESET}")
    offering_id = None
    if offerings:
        offering_id = offerings[0].id
    
    for off in offerings:
        print(f"  - ID: {off.id} | Subject: {off.subject_id} | Cohort: {off.cohort_id}")
        
    # 2. Check COs for first offering
    if offering_id:
        cos = db.query(CourseOutcome).filter(CourseOutcome.offering_id == offering_id).all()
        print(f"\n{BOLD}2. Course Outcomes for {offering_id} ({len(cos)}){RESET}")
        if not cos:
             print(f"  {RED}NO COs FOUND! Analytics will fail.{RESET}")
        for co in cos:
            print(f"  - CO: {co.co_code} (ID: {co.id})")

    # 3. Check Exams
    exams = db.query(Exam).all()
    print(f"\n{BOLD}3. Exams ({len(exams)}){RESET}")
    if not exams:
        print(f"  {RED}NO EXAMS FOUND{RESET}")
    
    for ex in exams:
        # Count marks
        mark_count = db.query(func.count(StudentQuestionMark.id)).filter(
            StudentQuestionMark.exam_id == ex.id
        ).scalar()
        
        # Check Question Mapping
        questions = db.query(Question).join(ExamSection).filter(ExamSection.exam_id == ex.id).all()
        mapped_questions = [q for q in questions if q.co_id is not None]
        
        status_color = GREEN if ex.status in ['PUBLISHED', 'LOCKED'] else RED
        print(f"  - Exam: {ex.exam_type}")
        print(f"    ID: {ex.id}")
        print(f"    Status: {status_color}{ex.status}{RESET}")
        print(f"    Marks: {mark_count}")
        print(f"    Questions: {len(questions)} (Mapped to CO: {len(mapped_questions)})")
        
        if mark_count > 0 and ex.status not in ['PUBLISHED', 'LOCKED']:
             print(f"    {RED}WARNING: Marks exist but Exam is not PUBLISHED/LOCKED.{RESET}")

    # 4. Student Marks Sample
    print(f"\n{BOLD}4. Student Marks Sample{RESET}")
    marks = db.query(StudentQuestionMark).limit(5).all()
    if not marks:
        print(f"  {RED}NO MARKS FOUND IN ENTIRE SYSTEM{RESET}")
    else:
        for m in marks:
            print(f"  - Student: {m.usn} | Q: {m.sub_question_id} | Mark: {m.marks}")

    db.close()

if __name__ == "__main__":
    diagnose()

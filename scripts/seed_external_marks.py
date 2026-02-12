
import sys
import os
import random
from decimal import Decimal

sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import SessionLocal
from app.models.exam import Exam, Question, SubQuestion, ExamSection
from app.models.student import Student
from app.models.marks import StudentQuestionMark

def seed_ext_marks():
    db = SessionLocal()
    print("=== SEEDING EXTERNAL MARKS ===")
    
    # 1. Get EXT Exam
    ext_exam_id = "44444444-4444-4444-4444-444444444444"
    exam = db.query(Exam).get(ext_exam_id)
    
    if not exam:
        print("EXT exam not found.")
        return
        
    print(f"Exam: {exam.exam_type} ({exam.id})")
    
    # 2. Check for Sections/Questions
    # Join to ensure we get questions linked to this exam's sections
    sqs = db.query(SubQuestion).join(Question).join(Question.section).filter(
        Question.section.has(exam_id=exam.id)
    ).all()
    
    if not sqs:
        print("  No questions found. Creating structure...")
        from app.models.outcomes import CourseOutcome
        import uuid
        
        # Get COs
        cos = db.query(CourseOutcome).filter(CourseOutcome.offering_id == exam.offering_id).all()
        if not cos:
            print("  No COs found! Cannot create questions.")
            return
            
        # Create Section A (Short Answers)
        # 10 questions x 2 marks = 20 marks
        sec_a = ExamSection(
            id=uuid.uuid4(),
            exam_id=exam.id,
            name="Part A",
            sequence=1,
            max_questions=10,
            required_questions=10,
            selection_mode="ALL",
            max_marks=20,
            marks_per_question=2
        )
        db.add(sec_a)
        
        # Create Section B (Long Answers)
        # 5 questions x 8 marks = 40 marks
        sec_b = ExamSection(
            id=uuid.uuid4(),
            exam_id=exam.id,
            name="Part B",
            sequence=2,
            max_questions=5,
            required_questions=5,
            selection_mode="ALL",
            max_marks=40,
            marks_per_question=8
        )
        db.add(sec_b)
        
        db.commit() # Commit sections to get IDs (though we have UUIDs)
        
        # Create Questions for Section A
        for i in range(1, 11):
            q = Question(
                id=uuid.uuid4(),
                section_id=sec_a.id,
                sequence=i,
                max_marks=2,
                co_id=cos[(i-1) % len(cos)].id
            )
            db.add(q)
            sq = SubQuestion(
                id=uuid.uuid4(),
                question_id=q.id,
                label="a",
                max_marks=2,
                co_id=q.co_id
            )
            db.add(sq)
            
        # Create Questions for Section B
        for i in range(1, 6):
            q = Question(
                id=uuid.uuid4(),
                section_id=sec_b.id,
                sequence=i,
                max_marks=8,
                co_id=cos[(i-1) % len(cos)].id
            )
            db.add(q)
            sq = SubQuestion(
                id=uuid.uuid4(),
                question_id=q.id,
                label="a",
                max_marks=8,
                co_id=q.co_id
            )
            db.add(sq)
            
        db.commit()
        print("  ✓ Created exam structure (Part A: 10x2, Part B: 5x8)")
        
        # Reload SQS
        sqs = db.query(SubQuestion).join(Question).join(Question.section).filter(
            Question.section.has(exam_id=exam.id)
        ).all()
    
    print(f"Found {len(sqs)} sub-questions.")
    if not sqs:
         print("No questions found even after creation attempts!")
         return

    # 3. Get Students
    students = db.query(Student).all()
    print(f"Found {len(students)} students.")
    
    count = 0
    for student in students:
        # Check if marks exist
        existing = db.query(StudentQuestionMark).filter(
            StudentQuestionMark.exam_id == exam.id,
            StudentQuestionMark.usn == student.usn
        ).count()
        
        if existing > 0:
            # Check if incomplete? No, assume done.
            # But earlier loop skipped.
            pass
        
        # If partial, maybe delete? 
        # For simplicity, if count > 0, skip.
        if existing > 0:
             print(f"  Skipping {student.usn} (already has marks)")
             continue
             
        print(f"  Seeding for {student.usn}...")
        
        for sq in sqs:
            # Seed passing marks (60-90%)
            max_m = float(sq.max_marks)
            obtained = round(random.uniform(0.6 * max_m, 0.95 * max_m), 1)
            
            sqm = StudentQuestionMark(
                exam_id=exam.id,
                usn=student.usn,
                sub_question_id=sq.id,
                marks=Decimal(str(obtained))
            )
            db.add(sqm)
            count += 1
            
    # 4. Lock Exam
    exam.status = "locked"
    db.commit()
    print(f"Seeded {count} marks and LOCKED the exam.")
    db.close()

if __name__ == "__main__":
    seed_ext_marks()

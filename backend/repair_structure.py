import sys
import os
import uuid
from sqlalchemy import text
from app.database import SessionLocal
from app.models import Exam, ExamSection, Question, SubQuestion

def repair_structure(exam_id_str):
    db = SessionLocal()
    try:
        print(f"Repairing Structure for Exam: {exam_id_str}")
        exam = db.query(Exam).filter(text(f"id = '{exam_id_str}'")).first()
        if not exam:
            print("Exam not found!")
            return

        sections = db.query(ExamSection).filter(ExamSection.exam_id == exam.id).all()
        print(f"Found {len(sections)} sections.")
        
        repaired_count = 0
        
        for section in sections:
            questions = db.query(Question).filter(Question.section_id == section.id).all()
            for q in questions:
                sub_qs_count = db.query(SubQuestion).filter(SubQuestion.question_id == q.id).count()
                
                if sub_qs_count == 0:
                    print(f" - Question Q{q.sequence} (ID: {q.id}) has NO sub-questions. Creating default 'a'.")
                    
                    default_sq = SubQuestion(
                        id=uuid.uuid4(),
                        question_id=q.id,
                        label="a",
                        max_marks=q.max_marks, # Inherit from question
                        bloom_level=q.bloom_level,
                        co_id=q.co_id
                    )
                    db.add(default_sq)
                    repaired_count += 1
        
        if repaired_count > 0:
            db.commit()
            print(f"SUCCESS: Created {repaired_count} default sub-questions.")
        else:
            print("No repairs needed. All questions have sub-questions.")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        exam_id = sys.argv[1]
    else:
        exam_id = "b54eca99-497d-42c2-81bb-edaa25d3df10"
    repair_structure(exam_id)

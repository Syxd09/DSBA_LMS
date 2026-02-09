import sys
import os
from sqlalchemy import text
from app.database import SessionLocal
from app.models import Exam, ExamSection, Question, SubQuestion

def debug_structure(exam_id_str):
    db = SessionLocal()
    try:
        print(f"Checking Structure for Exam: {exam_id_str}")
        exam = db.query(Exam).filter(text(f"id = '{exam_id_str}'")).first()
        if not exam:
            print("Exam not found!")
            return

        print(f"Exam Status: {exam.status}")
        
        sections = db.query(ExamSection).filter(ExamSection.exam_id == exam.id).order_by(ExamSection.sequence).all()
        print(f"Total Sections: {len(sections)}")
        
        if not sections:
            print("WARNING: No sections found!")
            return

        total_questions = 0
        total_sub_questions = 0

        for section in sections:
            print(f"Section {section.name} (ID: {section.id}):")
            questions = db.query(Question).filter(Question.section_id == section.id).order_by(Question.sequence).all()
            print(f"  Questions: {len(questions)}")
            total_questions += len(questions)
            
            for q in questions:
                sub_qs = db.query(SubQuestion).filter(SubQuestion.question_id == q.id).all()
                print(f"    Q{q.sequence} (ID: {q.id}) has {len(sub_qs)} sub-questions")
                total_sub_questions += len(sub_qs)
                for sq in sub_qs:
                     print(f"      - {sq.label} (Max: {sq.max_marks})")

        print(f"Summary: {len(sections)} Sections, {total_questions} Questions, {total_sub_questions} SubQuestions")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        exam_id = sys.argv[1]
    else:
        exam_id = "b54eca99-497d-42c2-81bb-edaa25d3df10"
    debug_structure(exam_id)

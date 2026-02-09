import sys
import os
from sqlalchemy import text

# No need for sys.path hacks if running from /app
from app.database import SessionLocal
from app.models import Exam, Student, Cohort

def debug_students(exam_id_str):
    db = SessionLocal()
    try:
        print(f"Checking Exam: {exam_id_str}")
        exam = db.query(Exam).filter(text(f"id = '{exam_id_str}'")).first()
        if not exam:
            print("Exam not found!")
            return

        print(f"Exam Cohort ID: {exam.cohort_id}")
        cohort = db.query(Cohort).filter(Cohort.id == exam.cohort_id).first()
        print(f"Cohort Name: {cohort.name if cohort else 'Unknown'}")
        
        # Check raw count
        students_count = db.query(Student).filter(Student.cohort_id == exam.cohort_id).count()
        print(f"Total Students in Cohort: {students_count}")
        
        if students_count > 0:
            print("First 5 Student USNs:")
            students = db.query(Student).filter(Student.cohort_id == exam.cohort_id).limit(5).all()
            for s in students:
                print(f" - {s.usn}")
        else:
            print("No students found in this cohort!")
            
            # Check total students
            total = db.query(Student).count()
            print(f"Total Students in DB: {total}")
            
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
    debug_students(exam_id)

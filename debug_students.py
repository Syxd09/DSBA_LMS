import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add parent dir to path to import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

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
        
        students = db.query(Student).filter(Student.cohort_id == exam.cohort_id).all()
        print(f"Total Students in Cohort: {len(students)}")
        
        if len(students) > 0:
            print("First 5 Students:")
            for s in students[:5]:
                print(f" - {s.usn} ({s.name})")
        else:
            print("No students found in this cohort!")
            
            # Check if any students exist globally
            total_students = db.query(Student).count()
            print(f"Total Students in DB: {total_students}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_students("b54eca99-497d-42c2-81bb-edaa25d3df10")

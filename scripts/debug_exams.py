import sys
import os
from uuid import UUID

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import SessionLocal
from app.models import Exam

def debug_exams():
    db = SessionLocal()
    offering_id = "bd0f957b-286b-4cdc-a525-31ff63130bcf"
    
    print(f"Checking Exams for Offering: {offering_id}")
    
    exams = db.query(Exam).filter(Exam.offering_id == UUID(offering_id)).all()
    
    if not exams:
        print("No exams found for this offering.")
    else:
        for ex in exams:
            print(f"Exam ID: {ex.id}")
            print(f"  Type: {ex.exam_type}")
            print(f"  Name: {ex.name}")
            print(f"  Status: {ex.status}")
            print(f"  Total Marks: {ex.total_marks}")
            print("-" * 30)

    db.close()

if __name__ == "__main__":
    debug_exams()

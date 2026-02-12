
import sys
import os
from uuid import UUID

sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import SessionLocal
from app.models.exam import Exam
from app.models.subject_offering import SubjectOffering
from app.models.marks import StudentQuestionMark

def diagnose_exams():
    db = SessionLocal()
    print("=== EXAM DIAGNOSTIC ===")
    
    # 1. Get Offering
    offering_id = "bd0f957b-286b-4cdc-a525-31ff63130bcf" # Known offering ID from previous logs
    # Or find it dynamically
    if not offering_id:
        off = db.query(SubjectOffering).first()
        offering_id = str(off.id)
    
    print(f"Offering ID: {offering_id}")
    
    # 2. List Exams
    exams = db.query(Exam).filter(Exam.offering_id == offering_id).all()
    print(f"Found {len(exams)} exams:")
    for e in exams:
        print(f"  - {e.exam_type} ({e.id}) Status: {e.status}")
        
        # Count marks for this exam
        count = db.query(StudentQuestionMark).filter(StudentQuestionMark.exam_id == e.id).count()
        print(f"    Marks Entires: {count}")
        
    db.close()

if __name__ == "__main__":
    diagnose_exams()

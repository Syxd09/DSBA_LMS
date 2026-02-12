import sys
import os
from uuid import UUID

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import SessionLocal
from app.models.exam import Exam
from app.models.marks import StudentQuestionMark
from sqlalchemy import func

BOLD = "\033[1m"
RED = "\033[91m"
GREEN = "\033[92m"
RESET = "\033[0m"

def fix_exam_status():
    db = SessionLocal()
    print(f"{BOLD}=== EXAM STATUS FIX TOOL ==={RESET}")
    
    exams = db.query(Exam).all()
    count = 0
    
    for ex in exams:
        # Check marks
        mark_count = db.query(func.count(StudentQuestionMark.id)).filter(
            StudentQuestionMark.exam_id == ex.id
        ).scalar()
        
        print(f"Checking Exam {ex.exam_type} (ID: {ex.id}) - Status: {ex.status} - Marks: {mark_count}")
        
        # Logic: If marks exist and status is not LOCKED, update it.
        # Also fix casing if 'published' -> 'PUBLISHED' (or LOCKED if marks exist)
        
        new_status = None
        
        if mark_count > 0:
            if ex.status.lower() != "locked":
                new_status = "locked"  # Use lowercase based on role_scoped.py check: Exam.status == 'locked'
        elif ex.status == "published":
             new_status = "PUBLISHED" # Fix casing validation for empty exams
             
        if new_status:
            print(f"  {GREEN}-> Updating status to '{new_status}'{RESET}")
            ex.status = new_status
            count += 1
            
    if count > 0:
        db.commit()
        print(f"\n{GREEN}Successfully updated {count} exams.{RESET}")
    else:
        print(f"\n{GREEN}No exams needed updating.{RESET}")
        
    db.close()

if __name__ == "__main__":
    fix_exam_status()

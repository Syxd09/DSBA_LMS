
import sys
import os
from uuid import UUID

sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import SessionLocal
from app.models.student import Student
from app.models.marks import SemesterResult, FinalMarks

def diagnose_sgpa():
    db = SessionLocal()
    print("=== SGPA/CGPA DIAGNOSTIC ===")
    
    # 1. Get Student
    usn = "1PI23CS002"
    student = db.query(Student).filter(Student.usn == usn).first()
    
    if not student:
        print(f"Student {usn} not found!")
        return
        
    print(f"Student: {student.name} ({student.usn})")
    
    # 2. Check Semester Results
    results = db.query(SemesterResult).filter(
        SemesterResult.usn == usn
    ).order_by(SemesterResult.semester).all()
    
    print(f"\nFound {len(results)} SemesterResult records:")
    if not results:
        print("  [WARNING] No SemesterResult records found! This is why SGPA is empty.")
    
    for r in results:
        print(f"  Sem {r.semester}: SGPA={r.sgpa}, CGPA={r.cgpa}, Status={r.status}")
        
    # 3. Check Final Marks (Source Data)
    marks = db.query(FinalMarks).filter(FinalMarks.usn == usn).all()
    print(f"\nFound {len(marks)} FinalMarks records (Source for SGPA):")
    for m in marks:
        print(f"  Subject/Offering: {m.offering_id or m.subject_id}")
        
    # 4. Check Raw Question Marks
    from app.models.marks import StudentQuestionMark
    raw_marks = db.query(StudentQuestionMark).filter(StudentQuestionMark.usn == usn).count()
    print(f"\nFound {raw_marks} StudentQuestionMark records (Raw Data).")
        
    db.close()

if __name__ == "__main__":
    diagnose_sgpa()

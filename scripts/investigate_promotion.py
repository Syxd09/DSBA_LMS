from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models import Student, Cohort, SemesterPromotion, StudentSemesterStatus

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def investigate_promotion_state():
    print("--- INVESTIGATING PROMOTION STATE ---")
    
    # 1. Check Cohort vs Student Semester Alignment
    students = db.query(Student).all()
    print(f"Total Students: {len(students)}")
    
    misaligned_count = 0
    for s in students:
        if s.cohort:
            # Student model doesn't even HAVE a current_semester field!
            # It relies entirely on Cohort.
            pass
            
    print("- Confirmed: Student model relies on Cohort.current_semester.")
    
    # 2. Check recent promotions
    promotions = db.query(SemesterPromotion).order_by(SemesterPromotion.created_at.desc()).limit(5).all()
    print(f"\nRecent Promotions: {len(promotions)}")
    
    for p in promotions:
        print(f"IDs: {p.id} | Cohort: {p.cohort_id} | {p.from_semester} -> {p.to_semester} | Status: {p.status}")
        
        # Check student statuses for this promotion
        statuses = db.query(StudentSemesterStatus).filter(StudentSemesterStatus.promotion_id == p.id).all()
        print(f"  - Student Status Records: {len(statuses)}")
        
        promoted = [s for s in statuses if s.status == "PROMOTED"]
        detained = [s for s in statuses if s.status == "DETAINED"]
        print(f"  - Promoted: {len(promoted)} | Detained: {len(detained)}")
        
        # KEY CHECK: Do detained students have their ACTIVE status updated?
        for d in detained:
            student = db.query(Student).filter(Student.usn == d.student_usn).first()
            print(f"    - Detained Student {d.student_usn}: Current Status = '{student.status}'")
            if student.status != "detained":
                print(f"      ❌ MISMATCH: Student status is '{student.status}', expected 'detained'")

if __name__ == "__main__":
    investigate_promotion_state()

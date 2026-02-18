from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models import Cohort, Student, SemesterPromotion, StudentSemesterStatus, StudentSemesterEnrollment

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def revert_last_promotion():
    print("--- REVERTING LAST PROMOTION ---")
    
    # 1. Find last promotion
    promotion = db.query(SemesterPromotion).order_by(SemesterPromotion.created_at.desc()).first()
    if not promotion:
        print("No promotion found.")
        return
        
    print(f"Reverting Promotion ID: {promotion.id} ({promotion.from_semester} -> {promotion.to_semester})")
    
    # 2. Revert Cohort
    cohort = db.query(Cohort).filter(Cohort.id == promotion.cohort_id).first()
    if cohort:
        print(f"Reverting Cohort {cohort.name} from Sem {cohort.current_semester} to {promotion.from_semester}")
        cohort.current_semester = promotion.from_semester
        
    # 3. Revert Students
    students = db.query(Student).filter(Student.cohort_id == promotion.cohort_id).all()
    for s in students:
        s.current_semester = promotion.from_semester
    print(f"Reverted {len(students)} students to Sem {promotion.from_semester}")
    
    # 4. Delete StudentSemesterStatus
    db.query(StudentSemesterStatus).filter(StudentSemesterStatus.promotion_id == promotion.id).delete()
    
    # 5. Delete StudentSemesterEnrollment (Snapshot)
    # We delete enrollments for the 'from_semester' that were created during this promotion
    try:
        count = db.query(StudentSemesterEnrollment).filter(
            StudentSemesterEnrollment.cohort_id == promotion.cohort_id,
            StudentSemesterEnrollment.semester == promotion.from_semester
        ).delete()
        print(f"Deleted {count} enrollment snapshots.")
    except Exception as e:
        print(f"Error deleting enrollments: {e}")

    # 6. Delete Promotion Record
    db.delete(promotion)
    
    db.commit()
    print("✅ REVERT COMPLETE")

if __name__ == "__main__":
    revert_last_promotion()

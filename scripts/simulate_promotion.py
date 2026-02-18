import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models import Student, Cohort, Profile, UserRole
from app.core.permissions import AppRole
from app.api.v1.promotions import preview_promotion, promote_cohort
from app.schemas.promotion import PromotionRequest
from uuid import UUID

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

async def simulate_promotion():
    print("--- SIMULATING PROMOTION ---")
    
    # 1. Find a target cohort (Sem < 8)
    cohort = db.query(Cohort).filter(Cohort.current_semester < 8).first()
    if not cohort:
        print("❌ No eligible cohort found.")
        return

    print(f"Target Cohort: {cohort.name} (Sem {cohort.current_semester})")
    
    # 2. Find HOD user for context
    hod = db.query(Profile).join(UserRole).filter(UserRole.role == AppRole.HOD).first()
    if not hod:
        print("❌ No HOD found.")
        return
        
    print(f"Approver: {hod.full_name}")
    
    # 3. Preview
    print("\n--- Running Preview ---")
    try:
        preview = await preview_promotion(cohort.id, db, hod)
        print(f"Eligible: {preview.eligible_count} | Detained: {preview.detained_count}")
        
        for s in preview.students:
            print(f" - {s.student_name}: {s.status}")
            
    except Exception as e:
        print(f"❌ Preview Failed: {e}")
        return

    # 4. Promote (ACTUAL EXECUTION)
    print("\n--- Executing Promotion (REAL) ---")
    promotion_request = PromotionRequest(
        confirm=True,
        approval_notes="Simulation Promotion"
    )
    
    try:
        result = await promote_cohort(cohort.id, promotion_request, db, hod)
        print(f"✅ Promotion Executed! ID: {result.promotion_id}")
        
        # 5. VERIFY FIXES
        print("\n--- VERIFYING FIXES ---")
        
        # A. Check Student Semester Enrollment (Snapshot) for PREVIOUS semester
        # Need to import model dynamically or locally to avoid scope issues in script
        from app.models import StudentSemesterEnrollment, SubjectOffering
        
        chk_enrollments = db.query(StudentSemesterEnrollment).filter(
            StudentSemesterEnrollment.cohort_id == cohort.id,
            StudentSemesterEnrollment.semester == preview.from_semester
        ).all()
        print(f"1. Snapshots Created: {len(chk_enrollments)} (Expected {preview.total_students})")
        if len(chk_enrollments) > 0:
            print(f"   Sample: {chk_enrollments[0]}")
        else:
            print("   ❌ NO DETAILS SNAPSHOT FOUND!")

        # B. Check Student Current Semester
        student = db.query(Student).filter(Student.cohort_id == cohort.id).first()
        print(f"2. Student Current Semester: {student.current_semester} (Expected {preview.to_semester})")
        
        # C. Check Subject Offerings
        offerings = db.query(SubjectOffering).filter(
            SubjectOffering.cohort_id == cohort.id,
            SubjectOffering.semester_no == preview.to_semester
        ).all()
        print(f"3. New Subject Offerings: {len(offerings)}")
        for off in offerings:
            print(f"   - {off.subject_id} (Sem {off.semester_no})")
            
        if len(offerings) == 0:
            print("   ⚠️ No offerings created. Ensure CurriculumVersion exists and has subjects.")

        # 6. ROLLBACK (Optional, to keep DB clean)
        # from app.api.v1.promotions import rollback_promotion
        # ...
        
    except Exception as e:
        print(f"❌ Promotion Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import asyncio
    asyncio.run(simulate_promotion())

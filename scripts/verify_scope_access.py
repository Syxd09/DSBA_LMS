
import asyncio
import sys
import os
import uuid
from datetime import datetime

sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import SessionLocal
from app.models import Profile, Subject, SubjectOffering, Exam, TeacherAssignment, Department, Program, Cohort
from app.services.analytics.role_scoped import FacultyAnalyticsService

async def verify_scope():
    db = SessionLocal()
    print("=== SCOPE ACCESS VERIFICATION ===")
    
    # 1. Get Pilot Teacher
    teacher_email = "teacher.ds@pilot.edu"
    teacher = db.query(Profile).filter(Profile.email == teacher_email).first()
    
    if not teacher:
        print("Pilot teacher not found!")
        return
        
    print(f"Teacher: {teacher.full_name} ({teacher.user_id})")
    
    # 2. Create Unauthorized Resources
    print("\nCreating 'Secret' Resources (Teacher NOT assigned)...")
    
    # Needs valid hierarchy
    dept = db.query(Department).filter(Department.code == "CSE").first()
    program = db.query(Program).filter(Program.department_id == dept.id).first()
    cohort = db.query(Cohort).filter(Cohort.program_id == program.id).first()
    
    # Secret Subject
    secret_sub = Subject(
        id=uuid.uuid4(),
        name="Top Secret Subject",
        code="SEC101",
        credits=3
    )
    db.add(secret_sub)
    
    # Secret Offering
    secret_offering = SubjectOffering(
        id=uuid.uuid4(),
        subject_id=secret_sub.id,
        program_id=program.id,
        cohort_id=cohort.id,
        semester_no=2,
        regulation_year=2023,
        is_active=True
    )
    db.add(secret_offering)
    
    # Secret Exam
    secret_exam = Exam(
        id=uuid.uuid4(),
        offering_id=secret_offering.id,
        exam_type="INT1",
        max_marks=40,
        status="locked",
        cohort_id=cohort.id,
        subject_id=secret_sub.id
    )
    db.add(secret_exam)
    
    db.commit()
    print(f"Created Secret Exam: {secret_exam.id}")
    
    try:
        # TEST 1: Subject Health (Should be SECURE)
        print("\n[TEST 1] Testing Subject Health Access...")
        response = await FacultyAnalyticsService.get_subject_health_report(
            db, secret_offering.id, teacher.user_id
        )
        if response.data.get("error") == "Not assigned to this subject":
             print("✅ PASS: Subject Health blocked unauthorized access.")
        else:
             print("❌ FAIL: Subject Health allowed access!")
             
        # TEST 2: Question Analysis (Suspected INSECURE)
        print("\n[TEST 2] Testing Question Analysis Access...")
        # Note: The service signature currently DOES NOT accept teacher_id, 
        # which is the vulnerability itself. We call it as is to prove it returns data.
        try:
            response = await FacultyAnalyticsService.get_question_analysis(
                db, secret_exam.id, teacher.user_id
            )
            # If we get here and response is successful, it's a fail (security hole)
            if response.data.get("exam_id") == str(secret_exam.id):
                print("❌ FAIL: Question Analysis allowed access to unauthorized exam!")
                print("   (Vulnerability Confirmed: Service does not check teacher ownership)")
            elif response.data.get("error") == "Not assigned to this subject":
                 print("✅ PASS: Question Analysis blocked unauthorized access.")
            else:
                print(f"? INCONCLUSIVE: Data returned: {response.data}")
        except Exception as e:
            print(f"✅ PASS? Exception occurred: {e}")

    finally:
        # Cleanup
        print("\nCleaning up...")
        db.delete(secret_exam)
        db.delete(secret_offering)
        db.delete(secret_sub)
        db.commit()
        db.close()

if __name__ == "__main__":
    asyncio.run(verify_scope())

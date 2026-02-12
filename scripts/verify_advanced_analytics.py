
import asyncio
import sys
import os
from uuid import UUID

sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import SessionLocal
from app.models import Profile, Exam, SubjectOffering, Student, TeacherAssignment, Department, Program, SubQuestion, Question, ExamSection
from app.services.analytics.advanced_analytics import AdvancedAnalyticsService

async def verify_analytics():
    db = SessionLocal()
    print("=== ADVANCED ANALYTICS VERIFICATION ===")
    
    # 1. Setup Context
    teacher_email = "teacher.ds@pilot.edu"
    teacher = db.query(Profile).filter(Profile.email == teacher_email).first()
    
    if not teacher:
        print("Pilot teacher not found!")
        return
        
    print(f"Teacher: {teacher.full_name}")
    
    # Get an assigned offering
    assignment = db.query(TeacherAssignment).filter(TeacherAssignment.teacher_id == teacher.user_id).first()
    if not assignment:
        print("No assignment found for teacher.")
        return
        
    offering_id = assignment.offering_id
    print(f"Offering ID: {offering_id}")
    
    # Get an exam for this offering
    # Try to find one with questions first
    exam = db.query(Exam).join(SubjectOffering).filter(SubjectOffering.id == offering_id).first()
    
    # Check if this exam has questions, if not find any exam with questions for this teacher's subject
    questions_count = db.query(SubQuestion).join(Question).join(Question.section).filter(Question.section.has(exam_id=exam.id)).count() if exam else 0
    
    if questions_count == 0:
        print("Selected exam has no questions, searching for one with questions...")
        # Search for any exam with questions linked to this offering or subject
        exam = db.query(Exam).join(ExamSection).join(Question).filter(Exam.offering_id == offering_id).first()

    if exam:
        print(f"Exam ID: {exam.id} ({exam.exam_type})")
        
        # TEST 1: QPQI
        print("\n[TEST 1] QPQI Calculation...")
        try:
            resp = await AdvancedAnalyticsService.get_qpqi(db, exam.id)
            print("Response:", resp.data)
        except Exception as e:
            print(f"ERROR: {e}")
    else:
        print("No exam found for offering.")

    # Get a student
    student = db.query(Student).join(Student.cohort).join(SubjectOffering, SubjectOffering.cohort_id == Student.cohort_id).filter(
        SubjectOffering.id == offering_id
    ).first()
    
    if student:
        print(f"\nStudent: {student.name} ({student.usn})")
        
        # TEST 2: Consistency
        print("\n[TEST 2] Student Consistency...")
        try:
            resp = await AdvancedAnalyticsService.get_student_consistency(db, student.user_id, offering_id)
            print("Response:", resp.data)
        except Exception as e:
            print(f"ERROR: {e}")
    else:
        print("No student found.")
        
    # TEST 3: Course Attainment Gap (HOD)
    print("\n[TEST 3] Course Attainment Gap...")
    try:
        resp = await AdvancedAnalyticsService.get_course_attainment_gap(db, offering_id)
        if resp.data:
            print("Gap Analysis:", resp.data.get('average_gap'), "Critical COs:", resp.data.get('critical_cos'))
        else:
            print("No data returned")
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

    # TEST 4: Accreditation Readiness
    print("\n[TEST 4] Accreditation Readiness (Principal)...")
    try:
        resp = await AdvancedAnalyticsService.get_accreditation_readiness(db)
        print("Response:", resp.data)
    except Exception as e:
        print(f"ERROR: {e}")

    db.close()

if __name__ == "__main__":
    asyncio.run(verify_analytics())

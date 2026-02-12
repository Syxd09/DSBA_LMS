
import asyncio
import sys
import os
from uuid import UUID

# Add updated path to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database import SessionLocal
from app.services.analytics.role_scoped import (
    HODAnalyticsService, 
    FacultyAnalyticsService, 
    PrincipalAnalyticsService
)
from app.services.analytics.advanced_analytics import AdvancedAnalyticsService
from app.models import Profile, UserRole, Department, TeacherAssignment, Exam

async def verify_e2e_analytics():
    db = SessionLocal()
    print("🚀 Starting End-to-End Analytics Verification...\n")

    try:
        # ==========================================
        # 1. PRINCIPAL FLOW
        # ==========================================
        print("🔍 [1/3] Verifying Principal Flow (Accreditation)")
        # Principal needs no specific input, just global access
        readiness = await AdvancedAnalyticsService.get_accreditation_readiness(db)
        
        if readiness.data and "readiness_score" in readiness.data:
            print(f"   ✅ Accreditation Score Available: {readiness.data['readiness_score']}%")
            print(f"   ✅ Components Verified: {list(readiness.data.get('components', {}).keys())}")
        else:
            print("   ❌ Accreditation Score Missing")

        # ==========================================
        # 2. HOD FLOW
        # ==========================================
        print("\n🔍 [2/3] Verifying HOD Flow (Department Health -> Gap Analysis)")
        # Find a department
        dept = db.query(Department).first()
        if not dept:
            print("   ⚠️ No departments found, skipping HOD check")
        else:
            print(f"   ℹ️ Testing with Department: {dept.name}")
            health = await HODAnalyticsService.get_department_health(db, dept.id)
            
            subject_stats = health.data.get("subject_stats", [])
            offering_id = None
            
            if subject_stats:
                # Find an offering with ID
                for stat in subject_stats:
                    if stat.get("offering_id"):
                        offering_id = stat.get("offering_id")
                        print(f"   ✅ Found Offering ID in Health Stats: {offering_id}")
                        break
                
                if offering_id:
                    # Verify Gap Analysis
                    gap_analysis = await AdvancedAnalyticsService.get_course_attainment_gap(db, UUID(offering_id))
                    if gap_analysis.data and "co_gaps" in gap_analysis.data:
                        gaps = gap_analysis.data["co_gaps"]
                        print(f"   ✅ Gap Analysis Successful: {len(gaps)} COs analyzed")
                    else:
                        print("   ❌ Gap Analysis Data Missing")
                else:
                    print("   ❌ No Offering ID found in Subject Stats")
            else:
                print("   ⚠️ No subject stats available for department")

        # ==========================================
        # 3. TEACHER FLOW
        # ==========================================
        print("\n🔍 [3/3] Verifying Teacher Flow (Subject Health -> QPQI -> Consistency)")
        # Find an assigned offering and teacher
        assignment = db.query(TeacherAssignment).first()
        if not assignment:
            print("   ⚠️ No teacher assignments found, skipping Teacher check")
        else:
            teacher_id = assignment.teacher_id
            offering_id = assignment.offering_id
            print(f"   ℹ️ Testing with Teacher ID: {teacher_id}")
            print(f"   ℹ️ Testing with Offering ID: {offering_id}")

            # A. QPQI Check
            # Find an exam for this offering
            exam = db.query(Exam).filter(Exam.offering_id == offering_id).first()
            if exam:
                qpqi = await AdvancedAnalyticsService.get_qpqi(db, exam.id)
                if qpqi.data and "qpqi_score" in qpqi.data:
                    print(f"   ✅ QPQI Score Available: {qpqi.data['qpqi_score']}")
                else:
                    print("   ❌ QPQI Score Missing")
            else:
                print("   ⚠️ No exams found for this offering")

            # B. Student Consistency Check
            # Find a student in this offering
            # Need to find cohort from offering, then student from cohort
            from app.models import SubjectOffering, Student
            offering = db.query(SubjectOffering).get(offering_id)
            if offering:
                student = db.query(Student).filter(Student.cohort_id == offering.cohort_id).first()
                if student:
                    consistency = await AdvancedAnalyticsService.get_student_consistency(db, student.user_id, offering_id)
                    if consistency.data and "consistency_score" in consistency.data:
                         print(f"   ✅ Student Consistency Score Available: {consistency.data['consistency_score']}")
                    else:
                         print("   ❌ Consistency Score Missing")
                else:
                     print("   ⚠️ No students found in cohort")
            else:
                 print("   ❌ Offering not found")

    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
        print("\nDone.")

if __name__ == "__main__":
    asyncio.run(verify_e2e_analytics())

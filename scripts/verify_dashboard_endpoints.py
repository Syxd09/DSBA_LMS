
import sys
import os
import asyncio
from uuid import UUID

sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import SessionLocal
from app.models.user import Profile, UserRole
from app.api.v1.dashboard import (
    get_teacher_dashboard, 
    get_student_dashboard, 
    get_hod_dashboard, 
    get_principal_dashboard
)
from app.core.permissions import AppRole

BOLD = "\033[1m"
RED = "\033[91m"
GREEN = "\033[92m"
RESET = "\033[0m"

async def verify_dashboards():
    db = SessionLocal()
    print(f"{BOLD}=== DASHBOARD ENDPOINT VERIFICATION ==={RESET}")

    # 1. Verify Teacher Dashboard
    print(f"\n{BOLD}1. Teacher Dashboard (teacher.ds@pilot.edu){RESET}")
    teacher = db.query(Profile).filter(Profile.email == "teacher.ds@pilot.edu").first()
    if teacher:
        try:
            data = await get_teacher_dashboard(db=db, current_user=teacher)
            print(f"  {GREEN}SUCCESS{RESET}")
            print(f"  - Assigned Subjects: {data.assigned_subjects}")
            print(f"  - Total Students: {data.total_students}")
            print(f"  - Class Average: {data.class_average}%")
            print(f"  - Subjects Data: {len(data.subjects)}")
            for s in data.subjects:
                # Handle Pydantic model vs dict
                name = s.name if hasattr(s, 'name') else s['name']
                code = s.code if hasattr(s, 'code') else s['code']
                avg = s.average if hasattr(s, 'average') else s['average']
                print(f"    * {name} ({code}): Avg {avg}%")
        except Exception as e:
            print(f"  {RED}FAILED: {e}{RESET}")
            import traceback
            traceback.print_exc()
    else:
        print(f"  {RED}Teacher profile not found{RESET}")

    # 2. Verify Student Dashboard
    print(f"\n{BOLD}2. Student Dashboard (student1@pilot.edu){RESET}")
    student = db.query(Profile).filter(Profile.email == "student1@pilot.edu").first()
    if student:
        try:
            data = await get_student_dashboard(db=db, current_user=student)
            print(f"  {GREEN}SUCCESS{RESET}")
            print(f"  - Overall Average: {data.overall_average}%")
            print(f"  - Subjects Enrolled: {data.subjects_enrolled}")
            print(f"  - Results: {len(data.results)}")
            for r in data.results:
                name = r.subject_name if hasattr(r, 'subject_name') else r['subject_name']
                pct = r.percentage if hasattr(r, 'percentage') else r['percentage']
                print(f"    * {name}: {pct}%")
            
            # Student Bloom Verification
            print(f"  - Bloom Performance: {len(data.bloom_performance)} levels")
            for b in data.bloom_performance:
                lvl = b.level if hasattr(b, 'level') else b['level']
                pct = b.percentage if hasattr(b, 'percentage') else b['percentage']
                print(f"    * {lvl}: {pct}%")
            
            # Verify Student CO Analytics (Service Layer)
            if data.results:
                 # Fetch Student record
                 from app.models import SubjectOffering, Student
                 student_rec = db.query(Student).filter(Student.user_id == student.user_id).first()
                 
                 if student_rec:
                     offering = db.query(SubjectOffering).filter(SubjectOffering.cohort_id == student_rec.cohort_id).first()
                     
                     if offering:
                         print(f"  - Verifying CO Analytics for Offering {offering.id}...")
                         from app.services.analytics.role_scoped import StudentAnalyticsService
                         
                         try:
                            co_data = await StudentAnalyticsService.get_co_attainment_profile(db, student.user_id, offering.id)
                            print(f"    * CO Profile Status: {'Complete' if co_data.is_complete else 'Incomplete'}")
                            if co_data.data and 'co_profile' in co_data.data:
                                 profiles = co_data.data['co_profile']
                                 print(f"    * COs Found: {len(profiles)}")
                                 for p in profiles:
                                     print(f"      - {p['co_code']}: {p['attainment_percentage']}% (Met: {p['threshold_met']})")
                            else:
                                 print(f"    * {RED}NO CO DATA RETURNED{RESET}")
                         except Exception as e:
                             print(f"    * {RED}CO Service Failed: {e}{RESET}")
                 else:
                     print(f"  - {RED}No offering found for student cohort{RESET}")
        except Exception as e:
            print(f"  {RED}FAILED: {e}{RESET}")
            import traceback
            traceback.print_exc()
    else:
        print(f"  {RED}Student profile not found{RESET}")

    # 3. Verify HOD Dashboard
    print(f"\n{BOLD}3. HOD Dashboard (hod.cse@pilot.edu){RESET}")
    hod = db.query(Profile).filter(Profile.email == "hod.cse@pilot.edu").first()
    if hod:
        try:
            data = await get_hod_dashboard(db=db, current_user=hod)
            print(f"  {GREEN}SUCCESS{RESET}")
            print(f"  - Dept Students: {data.department_students}")
            print(f"  - Pass Rate: {data.pass_rate}%")
            print(f"  - Subject Performance: {len(data.subject_performance)}")
            
            # Bloom's Verification
            print(f"  - Bloom Distribution: {len(data.bloom_distribution)} levels")
            for b in data.bloom_distribution:
                print(f"    * {b.level}: {b.percentage}% ({b.count})")
                
            # CO Verification
            print(f"  - CO Attainment: {len(data.co_attainment)} COs")
            for c in data.co_attainment:
                print(f"    * {c.co}: {c.attainment}% (Target: {c.target})")
                
            if len(data.subject_performance) == 0:
                 print(f"  {RED}WARNING: HOD Subject Performance is empty.{RESET}")
                 # Debug: Check cohorts and exams
                 # Fixed: Import Department correctly or fetch user linkage
                 hod_param = db.query(Profile).filter(Profile.email == "hod.cse@pilot.edu").first()
                 # We can't easily query Department here without importing it, but we know the HOD exists.
        except Exception as e:
            print(f"  {RED}FAILED: {e}{RESET}")
            import traceback
            traceback.print_exc()
    else:
        print(f"  {RED}HOD profile not found{RESET}")
        
    db.close()

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(verify_dashboards())

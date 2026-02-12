
import asyncio
import sys
import os
from uuid import UUID
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import SessionLocal
from app.models import Student, UserRole, SubjectOffering, Exam, Department, Profile, TeacherAssignment
from app.core.permissions import AppRole
from app.services.analytics.role_scoped import (
    StudentAnalyticsService,
    FacultyAnalyticsService,
    HODAnalyticsService,
    PrincipalAnalyticsService
)
from app.services.insights.rule_engine import get_student_insights
from app.services.analytics.topic_coverage import get_topic_coverage, get_student_topic_heatmap
from app.services.analytics.trends import get_year_on_year_trend

# Colors for output
GREEN = "\033[92m"
RED = "\033[91m"
RESET = "\033[0m"
BOLD = "\033[1m"

def print_section(title):
    print(f"\n{BOLD}{'='*60}\n{title}\n{'='*60}{RESET}")

def print_result(name, result):
    if hasattr(result, 'is_complete'):
        status = f"{GREEN}SUCCESS{RESET}" if result.is_complete else f"{RED}WARNINGS{RESET}"
        print(f"[{status}] {name}")
        if result.warnings:
            print(f"  Warnings: {result.warnings}")
        # Print summary data
        if hasattr(result, 'data'):
            data_keys = list(result.data.keys()) if isinstance(result.data, dict) else "List"
            print(f"  Data Keys: {data_keys}")
            # Identify core metrics to print
            if "health_status" in result.data:
                print(f"  Health: {result.data['health_status']}")
            if "status" in result.data:
                print(f"  Status: {result.data['status']}")
    elif isinstance(result, list):
        print(f"[{GREEN}SUCCESS{RESET}] {name}: Found {len(result)} items")
    elif isinstance(result, dict):
         print(f"[{GREEN}SUCCESS{RESET}] {name}: Keys {list(result.keys())}")
    else:
        print(f"[{GREEN}SUCCESS{RESET}] {name}: {result}")

async def main():
    db = SessionLocal()
    print_section("INITIALIZING TEST DATA")
    
    # 1. Fetch IDs
    teacher_id = "8b6cac2d-5e8b-40d8-bce5-e25494a67817"
    hod_id = "3b211b64-6bc0-448f-aea8-554ba8fcf174"
    offering_id = "bd0f957b-286b-4cdc-a525-31ff63130bcf"
    exam_id = "509f79fe-7360-46d8-8290-86f7bf1be383"
    dept_id = "2c43495c-4b71-4f1d-8558-8ece148f9397"
    student_usn = "1PI23CS002"
    
    # Try to find a student with a user_id
    student = db.query(Student).filter(Student.usn == student_usn).first()
    student_id = student.user_id if student else None
    
    if not student_id:
        # Fallback: find any student with user_id
        s = db.query(Student).filter(Student.user_id.isnot(None)).first()
        if s:
            student_id = s.user_id
            student_usn = s.usn
            print(f"Switched to Student: {student_usn} (ID: {student_id})")
        else:
            print(f"{RED}NO VALID STUDENT WITH USER_ID FOUND. SKIPPING SOME STUDENT TESTS.{RESET}")

    # FIX: Find a valid Teacher-Offering pair
    # Check if current teacher is assigned to current offering
    ta = db.query(TeacherAssignment).filter(
        TeacherAssignment.teacher_id == UUID(teacher_id),
        TeacherAssignment.offering_id == UUID(offering_id)
    ).first()
    
    
    if not ta:
        print(f"{RED}Teacher {teacher_id} not assigned to {offering_id}. Creating assignment...{RESET}")
        
        # Need cohort_id from Offering
        offering_obj = db.query(SubjectOffering).filter(SubjectOffering.id == UUID(offering_id)).first()
        if not offering_obj:
             print(f"{RED}Offering not found! Cannot create assignment.{RESET}")
        else:
            try:
                new_ta = TeacherAssignment(
                    id=UUID("11111111-1111-1111-1111-111111111111"), # Deterministic ID for testing
                    teacher_id=UUID(teacher_id),
                    offering_id=UUID(offering_id),
                    cohort_id=offering_obj.cohort_id,
                    academic_year="2023-24", # Dummy, but required
                    created_at=datetime.utcnow()
                )
                db.add(new_ta)
                db.commit()
                print(f"{GREEN}Created temporary TeacherAssignment.{RESET}")
            except Exception as e:
                db.rollback()
                # It might already exist or constraint fail, try to fetch again
                print(f"{RED}Failed to create assignment: {e}{RESET}")
            
    # Re-fetch to confirm
    ta = db.query(TeacherAssignment).filter(
        TeacherAssignment.teacher_id == UUID(teacher_id),
        TeacherAssignment.offering_id == UUID(offering_id)
    ).first()
    
    if ta:
        print(f"{GREEN}Confirmed Teacher Assignment: {ta.teacher_id} -> {ta.offering_id}{RESET}")
    else:
        print(f"{RED}STILL NO VALID TEACHER ASSIGNMENT. Faculty tests will fail.{RESET}")

    print(f"TEACHER: {teacher_id}")
    print(f"HOD: {hod_id}")
    print(f"OFFERING: {offering_id}")
    print(f"EXAM: {exam_id}")
    print(f"DEPT: {dept_id}")
    print(f"STUDENT: {student_usn}")

    # =========================================================================
    # SEED MISSING DATA FOR CLEAN PASS
    # =========================================================================
    print_section("SEEDING MISSING DATA")
    
    from app.models.grading import GradeScale, GradingRule, PassCriteria
    from decimal import Decimal
    
    # 1. Grade Scale & Pass Criteria
    gs_name = "R-2021"
    grade_scale = db.query(GradeScale).filter(GradeScale.name == gs_name).first()
    if not grade_scale:
        print(f"{GREEN}Creating GradeScale {gs_name}...{RESET}")
        grade_scale = GradeScale(
            id=UUID("22222222-2222-2222-2222-222222222222"),
            name=gs_name
        )
        db.add(grade_scale)
        db.flush()
        
        # Add Rules
        rules = [
            ("S", 90, 100, 10), ("A", 80, 89, 9), ("B", 70, 79, 8),
            ("C", 60, 69, 7), ("D", 50, 59, 6), ("E", 40, 49, 5), ("F", 0, 39, 0)
        ]
        for g, mn, mx, gp in rules:
            db.add(GradingRule(
                grade_scale_id=grade_scale.id,
                grade=g, min_percentage=mn, max_percentage=mx, grade_point=gp
            ))
            
        # Add Pass Criteria
        db.add(PassCriteria(
            grade_scale_id=grade_scale.id,
            min_internal=16, min_external=24, min_total=40
        ))
        db.commit()
    else:
        print(f"GradeScale {gs_name} exists.")
        # Ensure PassCriteria exists
        pc = db.query(PassCriteria).filter(PassCriteria.grade_scale_id == grade_scale.id).first()
        if not pc:
             print(f"{GREEN}Creating missing PassCriteria...{RESET}")
             db.add(PassCriteria(
                grade_scale_id=grade_scale.id,
                min_internal=16, min_external=24, min_total=40
            ))
             db.commit()

    # 2. Exams (INT2, EXT)
    from app.models.exam import Exam, Question, SubQuestion
    
    # Needs offering object for cohort_id
    offering_obj = db.query(SubjectOffering).filter(SubjectOffering.id == UUID(offering_id)).first()
    
    if offering_obj:
        # Check INT2
        int2 = db.query(Exam).filter(Exam.offering_id == UUID(offering_id), Exam.exam_type == "INT2").first()
        if not int2:
            print(f"{GREEN}Creating INT2 Exam...{RESET}")
            int2 = Exam(
                id=UUID("33333333-3333-3333-3333-333333333333"),
                offering_id=UUID(offering_id),
                cohort_id=offering_obj.cohort_id,
                exam_type="INT2",
                max_marks=40,
                status="PUBLISHED",
                teacher_id=UUID(teacher_id)
            )
            db.add(int2)
            db.commit()
            
        # Check EXT
        ext = db.query(Exam).filter(Exam.offering_id == UUID(offering_id), Exam.exam_type == "EXT").first()
        if not ext:
            print(f"{GREEN}Creating EXT Exam...{RESET}")
            ext = Exam(
                id=UUID("44444444-4444-4444-4444-444444444444"),
                offering_id=UUID(offering_id),
                cohort_id=offering_obj.cohort_id,
                exam_type="EXT",
                max_marks=60,
                status="PUBLISHED",
                teacher_id=UUID(teacher_id)
            )
            db.add(ext)
            db.commit()
    else:
        print(f"{RED}Offering not found, skipping exam creation.{RESET}")

    # =========================================================================
    # ROLE: FACULTY
    # =========================================================================
    print_section("ROLE: FACULTY ANALYTICS")
    
    try:
        res = await FacultyAnalyticsService.get_subject_health_report(db, UUID(offering_id), UUID(teacher_id))
        print(f"Subject Health Data: {res.data}") # Full dump
    except Exception as e:
        print(f"{RED}Subject Health Failed: {e}{RESET}")

    try:
        res = await FacultyAnalyticsService.get_question_analysis(db, UUID(exam_id))
        print(f"Question Analysis Data (First 2): {res.data[:2] if isinstance(res.data, list) else res.data}")
    except Exception as e:
        print(f"{RED}Question Analysis Failed: {e}{RESET}")

    try:
        res = await FacultyAnalyticsService.get_at_risk_students(db, UUID(offering_id), UUID(teacher_id))
        print(f"At-Risk Data: {res.data}")
    except Exception as e:
        print(f"{RED}At-Risk Students Failed: {e}{RESET}")

    try:
        res = await get_topic_coverage(db, UUID(offering_id))
        if hasattr(res, 'coverage_percentage'):
             print(f"Topic Coverage: {res.coverage_percentage}% Assessed: {res.assessed_topics}/{res.total_topics}")
             print(f"Units: {len(res.units)}")
        else:
             print(f"Topic Coverage Raw: {res}")
    except Exception as e:
        print(f"{RED}Topic Coverage Failed: {e}{RESET}")


    # =========================================================================
    # ROLE: HOD
    # =========================================================================
    print_section("ROLE: HOD ANALYTICS")
    
    try:
        res = await HODAnalyticsService.get_department_health(db, UUID(dept_id))
        print(f"Dept Health Data: {res.data}")
    except Exception as e:
        print(f"{RED}Department Health Failed: {e}{RESET}")

    try:
        res = await HODAnalyticsService.get_batch_comparison(db, UUID(dept_id), [2021, 2022, 2023, 2024, 2025])
        print(f"Batch Comparison Data: {res.data}")
    except Exception as e:
        print(f"{RED}Batch Comparison Failed: {e}{RESET}")
        
    try:
        res = await HODAnalyticsService.get_teacher_effectiveness(db, UUID(dept_id))
        print(f"Teacher Effectiveness Data (Summary): {res.data.get('summary')}")
        print(f"First Teacher: {res.data.get('teachers')[0] if res.data.get('teachers') else 'None'}")
    except Exception as e:
        print(f"{RED}Teacher Effectiveness Failed: {e}{RESET}")


    # =========================================================================
    # ROLE: PRINCIPAL
    # =========================================================================
    print_section("ROLE: PRINCIPAL ANALYTICS")
    
    try:
        res = await PrincipalAnalyticsService.get_institution_overview(db)
        print(f"Institution Overview Data: {res.data}")
    except Exception as e:
        print(f"{RED}Institution Overview Failed: {e}{RESET}")

    try:
        res = await PrincipalAnalyticsService.get_department_comparison(db)
        print(f"Dept Comparison Data: {res.data}")
    except Exception as e:
        print(f"{RED}Department Comparison Failed: {e}{RESET}")

    try:
        res = await PrincipalAnalyticsService.get_accreditation_readiness(db)
        print(f"Accreditation Data: {res.data}")
    except Exception as e:
        print(f"{RED}Accreditation Readiness Failed: {e}{RESET}")
        
    try:
        res = await get_year_on_year_trend(db, department_id=UUID(dept_id))
        print(f"Trend Data: {res.data}")
    except Exception as e:
        print(f"{RED}YOY Trend Failed: {e}{RESET}")


    # =========================================================================
    # ROLE: STUDENT
    # =========================================================================
    print_section("ROLE: STUDENT ANALYTICS")
    
    if student_id:
        try:
            res = await StudentAnalyticsService.get_academic_performance(db, student_id)
            print(f"Academic Performance Warnings: {res.warnings}")
            print(f"Academic Performance Data: {res.data}")
        except Exception as e:
            print(f"{RED}Academic Performance Failed: {e}{RESET}")

        try:
            res = await StudentAnalyticsService.get_co_attainment_profile(db, student_id, UUID(offering_id))
            print(f"CO Profile Data: {res.data}")
        except Exception as e:
            print(f"{RED}CO Attainment Failed: {e}{RESET}")
    else:
        print(f"{RED}Skipping ID-based student tests{RESET}")

    try:
        # Insights uses USN, so safe to run if we have USN
        res = await get_student_insights(db, student_usn, UUID(offering_id))
        print_result("Personalized Insights", res)
        if res:
            print(f"  Insight Count: {len(res)}")
            print(f"  First Insight: {res[0]['title'] if res else 'None'}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"{RED}Student Insights Failed: {e}{RESET}")

    try:
        res = await get_student_topic_heatmap(db, student_usn, UUID(offering_id))
        print_result("Topic Heatmap", res)
    except Exception as e:
        print(f"{RED}Topic Heatmap Failed: {e}{RESET}")

    db.close()

if __name__ == "__main__":
    asyncio.run(main())

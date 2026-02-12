
import asyncio
import sys
import os
from uuid import UUID
from decimal import Decimal

sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import SessionLocal
from app.models.student import Student
from app.models.semester import Semester
from app.models.subject_offering import SubjectOffering
from app.models.marks import FinalMarks, SemesterResult
from app.models.exam import Exam
from app.services.analytics.marks_service import get_student_marks_for_offering
from app.services.computation.sgpa import compute_sgpa, SubjectResult

async def populate_results():
    db = SessionLocal()
    print("=== POPULATING SEMESTER RESULTS ===")
    
    # 1. Get all active students
    students = db.query(Student).all()
    print(f"Found {len(students)} students.")
    
    for student in students:
        print(f"\nProcessing Student: {student.name} ({student.usn})")
        
        # Get active semester (or all semesters)
        # For now, let's assume we are generating for Semester 1
        current_sem = 1 
        
        # Get offerings for this student's cohort
        offerings = db.query(SubjectOffering).filter(
            SubjectOffering.cohort_id == student.cohort_id
        ).all()
        
        if not offerings:
            print("  No offerings found.")
            continue
            
        subject_results = []
        
        for off in offerings:
            print(f"  - Subject: {off.subject_id} (Credits: {off.subject.credits})")
            
            # Compute Marks
            try:
                response = get_student_marks_for_offering(db, student.usn, off.id)
                data = response.data
                
                # Update/Create FinalMarks
                fm = db.query(FinalMarks).filter(
                    FinalMarks.usn == student.usn,
                    FinalMarks.offering_id == off.id
                ).first()
                
                if not fm:
                    fm = FinalMarks(
                        usn=student.usn,
                        student_id=student.user_id,
                        offering_id=off.id,
                        subject_id=off.subject_id, # Legacy
                        cohort_id=student.cohort_id,
                        version=1
                    )
                    db.add(fm)
                
                # Update Raw Values
                fm.internal_1 = data.internal.int1_raw
                fm.internal_2 = data.internal.int2_raw
                fm.assignment_1 = data.internal.assignment_1
                fm.assignment_2 = data.internal.assignment_2
                fm.attendance = data.internal.attendance
                fm.activity = data.internal.activity
                fm.external_marks = data.external.total
                
                # Add to subject results list for SGPA
                print(f"    -> Grade: {data.grade.grade}, Points: {data.grade.grade_point}, Passed: {data.grade.passed}")
                print(f"    -> Total: {data.total.total}, Int: {data.internal.total}, Ext: {data.external.total}")
                
                subject_results.append(SubjectResult(
                    subject_code=str(off.subject_id), # Using ID as code for now
                    credits=Decimal(str(off.subject.credits)),
                    grade=data.grade.grade,
                    grade_point=data.grade.grade_point,
                    passed=data.grade.passed
                ))
                
            except Exception as e:
                print(f"    Error computing marks: {e}")
                continue
        
        db.commit() # Commit FinalMarks
        
        # Compute SGPA
        if subject_results:
            sgpa_res = compute_sgpa(subject_results)
            print(f"  => SGPA: {sgpa_res.sgpa} (Passed: {sgpa_res.subjects_passed}/{len(subject_results)})")
            
            # Update/Create SemesterResult
            sr = db.query(SemesterResult).filter(
                SemesterResult.usn == student.usn,
                SemesterResult.semester == current_sem
            ).first()
            
            if not sr:
                sr = SemesterResult(
                    usn=student.usn,
                    student_id=student.user_id,
                    cohort_id=student.cohort_id,
                    semester=current_sem
                )
                db.add(sr)
            
            sr.total_credits = sgpa_res.total_credits
            sr.sgpa = sgpa_res.sgpa
            # For 1st sem, CGPA = SGPA
            sr.cgpa = sgpa_res.sgpa 
            sr.status = "pass" if sgpa_res.subjects_failed == 0 else "fail"
            
            db.commit()
            
    db.close()
    print("\nDone.")

if __name__ == "__main__":
    asyncio.run(populate_results())

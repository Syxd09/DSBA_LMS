
import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database import Base
from app.models import SubjectOffering, Subject, Cohort, CurriculumVersion

# Setup DB
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/edumetrics"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def verify_outcome():
    cohort_id = 'd3720d0c-9c67-49c2-b757-fbf6fae8a63f'
    target_semester = 5
    
    print(f"--- Verifying Promotion for Cohort {cohort_id} ---")
    
    # 1. Check Cohort Status
    cohort = db.query(Cohort).filter(Cohort.id == cohort_id).first()
    if not cohort:
        print("❌ Cohort not found!")
        return
        
    print(f"Cohort: {cohort.name}")
    print(f"Current Semester: {cohort.current_semester}")
    print(f"Regulation ID: {cohort.regulation_id}")
    
    if cohort.current_semester != target_semester:
        print(f"❌ Mismatch! Expected Sem {target_semester}, got {cohort.current_semester}")
    else:
        print(f"✅ Cohort is in Sem {target_semester}")

    # 2. Check Subject Offerings
    offerings = db.query(SubjectOffering).join(Subject).filter(
        SubjectOffering.cohort_id == cohort_id,
        SubjectOffering.semester_no == target_semester
    ).all()
    
    print(f"\n--- Subject Offerings for Sem {target_semester} ---")
    if not offerings:
        print("❌ NO OFFERINGS FOUND! (Ghost Semester)")
        
        # Diagnostics: Why?
        print("\n--- Diagnostics ---")
        # Check for matching curriculum
        curricula = db.query(CurriculumVersion).filter(
            CurriculumVersion.program_id == cohort.program_id
        ).all()
        print(f"Found {len(curricula)} curricula for Program {cohort.program_id}:")
        for c in curricula:
            print(f"  - ID: {c.id}, RegID: {c.regulation_id}, EffFrom: {c.effective_from}, Active: {c.is_active}")
            
            # Check subjects in this curriculum for sem 5
            subjects = db.query(Subject).filter(
                Subject.curriculum_version_id == c.id,
                Subject.semester == target_semester
            ).all()
            print(f"    - Subjects in Sem {target_semester}: {len(subjects)}")
            
    else:
        print(f"✅ Found {len(offerings)} offerings:")
        for off in offerings:
            print(f"  - {off.subject.code}: {off.subject.name} (Elective: {off.is_elective})")

if __name__ == "__main__":
    verify_outcome()

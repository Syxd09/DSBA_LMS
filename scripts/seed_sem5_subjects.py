
import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database import Base
from app.models import Subject, CurriculumVersion, SubjectOffering, Cohort

# Setup DB
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/edumetrics"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def seed_sem5():
    # Target Cohort
    cohort_id = 'd3720d0c-9c67-49c2-b757-fbf6fae8a63f'
    program_id = '14201276-26a5-4799-9418-1e6a609b3270'
    
    # 1. Get the Fallback Curriculum (EffFrom 2021)
    curriculum = db.query(CurriculumVersion).filter(
        CurriculumVersion.program_id == program_id,
        CurriculumVersion.effective_from == 2021
    ).first()
    
    if not curriculum:
        print("❌ Legacy curriculum not found!")
        return

    print(f"Seeding subjects for Curriculum: {curriculum.version_name} (ID: {curriculum.id})")
    
    # 2. Add Subjects for Sem 5
    subjects_data = [
        {"code": "21CS51", "name": "Management and Entrepreneurship", "credit": 3, "type": "theory"},
        {"code": "21CS52", "name": "Computer Networks", "credit": 4, "type": "theory"},
        {"code": "21CS53", "name": "Database Management Systems", "credit": 4, "type": "theory"},
        {"code": "21CS54", "name": "Automata Theory and Computability", "credit": 3, "type": "theory"},
        {"code": "21CSL55", "name": "Database Management System Laboratory with Mini Project", "credit": 2, "type": "lab"},
        {"code": "21RMI56", "name": "Research Methodology and IPR", "credit": 2, "type": "theory"}
    ]
    
    created_subjects = []
    for s_data in subjects_data:
        # Check if exists
        exists = db.query(Subject).filter(
            Subject.curriculum_version_id == curriculum.id,
            Subject.code == s_data["code"]
        ).first()
        
        if not exists:
            subject = Subject(
                curriculum_version_id=curriculum.id,
                semester=5,
                code=s_data["code"],
                name=s_data["name"],
                credits=s_data["credit"],
                subject_type=s_data["type"]
            )
            db.add(subject)
            created_subjects.append(subject)
            print(f"  + Added Subject: {s_data['code']}")
        else:
            created_subjects.append(exists)
            print(f"  . Exists: {s_data['code']}")
    
    db.commit()
    
    # 3. Create Offerings for the Cohort (Fixing the Ghost Semester)
    print(f"\nCreating Offerings for Cohort {cohort_id}...")
    for sub in created_subjects:
        # Check if offering exists
        offering = db.query(SubjectOffering).filter(
            SubjectOffering.cohort_id == cohort_id,
            SubjectOffering.subject_id == sub.id
        ).first()
        
        if not offering:
            new_offering = SubjectOffering(
                subject_id=sub.id,
                program_id=program_id,
                cohort_id=cohort_id,
                semester_no=5,
                is_elective=False,
                regulation_year=2021, # Fallback
                is_active=True
            )
            db.add(new_offering)
            print(f"  + Created Offering: {sub.code}")
        else:
            print(f"  . Offering exists: {sub.code}")
            
    db.commit()
    print("\n✅ Successfully seeded Sem 5 subjects and offerings!")

if __name__ == "__main__":
    seed_sem5()

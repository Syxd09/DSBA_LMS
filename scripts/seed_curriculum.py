from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models import CurriculumVersion, Cohort, Program, Subject

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def seed_curriculum():
    print("--- SEEDING CURRICULUM ---")
    
    cohort = db.query(Cohort).first()
    if not cohort:
        print("No cohort!")
        return

    program_id = cohort.program_id
    
    # 1. Create Curriculum Version
    cv = CurriculumVersion(
        program_id=program_id,
        version_name="Rev-2021",
        effective_from=2021,
        is_active=True
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)
    print(f"Created Curriculum: {cv.version_name} (ID: {cv.id})")
    
    # 2. Create Subjects for Sem 4
    subjects = [
        {"code": "21CS41", "name": "Mathematical Foundations", "credits": 3, "type": "core"},
        {"code": "21CS42", "name": "Design & Analysis of Algorithms", "credits": 4, "type": "core"},
        {"code": "21CS43", "name": "Operating Systems", "credits": 3, "type": "core"},
        {"code": "21CSL46", "name": "Algorithms Lab", "credits": 1, "type": "lab"},
    ]
    
    for s_data in subjects:
        su = Subject(
            name=s_data["name"],
            code=s_data["code"],
            credits=s_data["credits"],
            subject_type=s_data["type"],
            semester=4, # IMPORTANT: Next sem for current cohort
            curriculum_version_id=cv.id
        )
        db.add(su)
        
    db.commit()
    print(f"Seeded {len(subjects)} subjects for Sem 4.")

if __name__ == "__main__":
    seed_curriculum()

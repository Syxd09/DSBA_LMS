from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models import CurriculumVersion, Cohort, Program

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def debug_curriculum():
    print("--- DEBUG CURRICULUM ---")
    
    # 1. List all CurriculumVersions
    cvs = db.query(CurriculumVersion).all()
    print(f"Total CurriculumVersions: {len(cvs)}")
    for cv in cvs:
        print(f"ID: {cv.id} | Program: {cv.program_id} | Name: {cv.version_name} | Effective: {cv.effective_from}")

    # 2. List target cohort
    cohort = db.query(Cohort).first() # Just pick one
    if cohort:
        print(f"\nCohort: {cohort.name} | ID: {cohort.id}")
        print(f"Program ID: {cohort.program_id}")
        print(f"Year: {cohort.year}")
        
        # 3. Test Query
        match = db.query(CurriculumVersion).filter(
            CurriculumVersion.program_id == cohort.program_id,
            CurriculumVersion.effective_from <= cohort.year
        ).order_by(CurriculumVersion.effective_from.desc()).first()
        
        if match:
             print(f"✅ MATCH FOUND: {match.version_name}")
        else:
             print("❌ NO MATCH FOUND")
    else:
        print("No cohort found")

if __name__ == "__main__":
    debug_curriculum()

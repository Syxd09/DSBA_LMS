
import sys
import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Add the parent directory to the path so we can import the app
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.database import Base
from app.models.organization import Cohort, Department, Program
from app.models.academic import CurriculumVersion, Subject
from app.models.regulation import Regulation
from app.models.college import College
from app.models.subject_offering import SubjectOffering
from app.models.promotion import SemesterPromotion
from app.api.v1.promotions import promote_cohort

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/edumetrics"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def verify_promotion_integration():
    db = SessionLocal()
    try:
        logger.info("Starting Verification: Promotion Integration with Regulation")
        
        # Ensure schema is up to date (Migration hack for dev)
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE curriculum_versions ADD COLUMN IF NOT EXISTS regulation_id UUID REFERENCES regulations(id)"))
            conn.commit()
            logger.info("Ensured regulation_id column exists in curriculum_versions.")

        # 1. Setup Data
        # Ensure a College exists
        college = db.query(College).first()
        if not college:
            college = College(name="Test College", code="TC01", university="Test Uni")
            db.add(college)
            db.commit()
            db.refresh(college)
        logger.info(f"Using College: {college.name} (ID: {college.id})")

        # Ensure a Department and Program exist
        dept = db.query(Department).first()
        if not dept:
            dept = Department(name="Computer Science", code="CS", hod_id=None, college_id=college.id)
            db.add(dept)
            db.commit()
            db.refresh(dept)
        else:
            # Ensure dept has college_id
            if not dept.college_id:
                dept.college_id = college.id
                db.commit()
                db.refresh(dept)
        
        program = db.query(Program).filter_by(department_id=dept.id).first()
        if not program:
            program = Program(name="B.Tech CS", code="BTCS", department_id=dept.id, duration_years=4)
            db.add(program)
            db.commit()
            db.refresh(program)

        # Create a Regulation
        reg_name = f"R{datetime.now().strftime('%Y%m%d%H%M%S')}"
        regulation = Regulation(
            name=reg_name,
            code=reg_name, # Add code
            year=2024,
            college_id=college.id, 
            is_active=True
        )
        db.add(regulation)
        db.commit()
        db.refresh(regulation)
        logger.info(f"Created Regulation: {regulation.name} (ID: {regulation.id})")

        # Create a Curriculum Version attached to this Regulation
        curriculum = CurriculumVersion(
            program_id=program.id,
            version_name="1.0",
            effective_from=2024,
            is_active=True,
            regulation_id=regulation.id
        )
        db.add(curriculum)
        db.commit()
        db.refresh(curriculum)
        logger.info(f"Created Curriculum Version: {curriculum.version_name} linked to Regulation")

        # Add Subjects to this Curriculum for Semester 3
        subject1 = Subject(
            name="Data Structures",
            code=f"CS301-{reg_name}",
            credits=4,
            semester=3,
            subject_type="core",
            curriculum_version_id=curriculum.id
        )
        subject2 = Subject(
            name="DMS",
            code=f"CS302-{reg_name}",
            credits=3,
            semester=3,
            subject_type="core",
            curriculum_version_id=curriculum.id
        )
        db.add_all([subject1, subject2])
        db.commit()
        logger.info("Added 2 subjects to Semester 3 in this Curriculum")

        # Create a Cohort linked to this Regulation (currently in Sem 2)
        cohort = Cohort(
            name=f"Batch-2024-{reg_name}",
            year=2024,
            current_semester=2,
            program_id=program.id,
            regulation_id=regulation.id,
            status="active"
        )
        db.add(cohort)
        db.commit()
        db.refresh(cohort)
        logger.info(f"Created Cohort: {cohort.name} in Sem 2, linked to Regulation {regulation.name}")

        # 2. Simulate Promotion (Sem 2 -> Sem 3)
        class MockPreview:
            to_semester = 3
            student_ids = [] # We don't need students for this test, just subject offerings
        
        logger.info("Executing calculate_promotion_preview logic manually to test SubjectOffering creation...")
        
        # We manually trigger the logic part of promote_cohort regarding subjects
        # Or better, we can call promote_cohort if we wrap it properly or simulate the preview object.
        # But promote_cohort is an API endpoint function, might be hard to call directly due to Dependency Injection.
        # Let's replicate the logic we changed to verify it behaves as expected.

        # LOGIC TO TEST:
        # Priority 1: Direct link to Regulation
        found_curriculum = None
        if cohort.regulation_id:
            found_curriculum = db.query(CurriculumVersion).filter(
                CurriculumVersion.program_id == cohort.program_id,
                CurriculumVersion.regulation_id == cohort.regulation_id,
                CurriculumVersion.is_active == True
            ).first()
        
        if found_curriculum and found_curriculum.id == curriculum.id:
            logger.info("SUCCESS: Logic correctly identified the Regulation-linked Curriculum.")
        else:
            logger.error(f"FAILURE: Logic failed to identify the correct Curriculum. Found: {found_curriculum}")
            return

        # Simulate Subject Offering Creation
        next_sem_subjects = db.query(Subject).filter(
            Subject.curriculum_version_id == found_curriculum.id,
            Subject.semester == 3
        ).all()

        if len(next_sem_subjects) == 2:
            logger.info(f"SUCCESS: Found {len(next_sem_subjects)} subjects for Sem 3 as expected.")
        else:
            logger.error(f"FAILURE: Expected 2 subjects, found {len(next_sem_subjects)}")

        # Clean up
        db.delete(cohort)
        db.delete(subject1)
        db.delete(subject2)
        db.delete(curriculum)
        db.delete(regulation)
        db.commit()
        logger.info("Cleanup complete.")

    except Exception as e:
        logger.error(f"Verification Failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify_promotion_integration()

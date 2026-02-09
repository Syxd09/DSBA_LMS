import sys
import os
import uuid
import logging

# Ensure backend dir is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, SessionLocal, engine
from app.models import *  # Import all models
from app.models.user import Profile, UserRole
from app.core.permissions import AppRole
from app.core.security import get_password_hash

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def reset_db_and_create_principal():
    logger.info("⚠️  RESETTING DATABASE FOR MANUAL TESTING ⚠️")
    
    # Drop and recreate tables
    logger.info("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    logger.info("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        logger.info("Creating Principal Account...")
        
        principal_user_id = uuid.uuid4()
        
        # Create Profile
        principal = Profile(
            id=uuid.uuid4(),
            user_id=principal_user_id,
            email="principal@outcome.edu",
            full_name="System Principal",
            password_hash=get_password_hash("principal"),  # Password: principal
            department="Administration"
        )
        db.add(principal)
        
        # Assign Role
        role = UserRole(
            id=uuid.uuid4(),
            user_id=principal_user_id,
            role=AppRole.PRINCIPAL
        )
        db.add(role)
        
        db.commit()
        
        logger.info("✅ Database Reset Complete")
        logger.info(f"User Created: {principal.email}")
        logger.info("Password: 'principal'")
        
    except Exception as e:
        logger.error(f"Failed to reset DB: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    reset_db_and_create_principal()

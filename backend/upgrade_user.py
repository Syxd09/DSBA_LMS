from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import Profile, UserRole
from app.core.permissions import AppRole
from app.config import settings

# Use the configured URL
print(f"Connecting to: {settings.DATABASE_URL}")
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def upgrade_user(email, role_name):
    print(f"Looking for user: {email}")
    user = db.query(Profile).filter(Profile.email == email).first()
    if not user:
        print(f"User {email} not found")
        return

    print(f"Found user: {user.full_name} ({user.user_id})")
    
    # Check existing role
    role = db.query(UserRole).filter(UserRole.user_id == user.user_id).first()
    if role:
        print(f"Current role: {role.role}")
        role.role = role_name
    else:
        print("No role found, creating...")
        role = UserRole(user_id=user.user_id, role=role_name)
        db.add(role)
    
    db.commit()
    print(f"Updated role to {role_name}")

if __name__ == "__main__":
    upgrade_user("verify_admin@example.com", "principal")

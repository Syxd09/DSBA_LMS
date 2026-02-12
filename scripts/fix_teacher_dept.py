from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models import Profile, UserRole
from app.core.permissions import AppRole

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def fix_teacher_department():
    print("--- FIXING TEACHER DEPARTMENT ---")
    
    # Target Department
    target_dept = "Computer Science & Engineering"
    
    # Find active teachers with no department or wrong department
    teachers = db.query(Profile).join(UserRole, Profile.user_id == UserRole.user_id)\
        .filter(UserRole.role == AppRole.TEACHER).all()
        
    count = 0
    for t in teachers:
        if t.department != target_dept:
            print(f"Fixing teacher {t.full_name} ({t.email}). Old Dept: '{t.department}' -> New: '{target_dept}'")
            t.department = target_dept
            count += 1
            
    if count > 0:
        db.commit()
        print(f"✅ Fixed {count} teachers.")
    else:
        print("✅ All teachers already have correct department.")

if __name__ == "__main__":
    fix_teacher_department()

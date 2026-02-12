from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import Profile, UserRole, Department
from app.config import settings
from app.core.permissions import AppRole

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def debug_hod_view():
    print("--- DEBUGGING HOD USER LIST ---")
    
    # 1. Find an HOD
    hod_role = db.query(UserRole).filter(UserRole.role == AppRole.HOD).first()
    if not hod_role:
        print("❌ No HOD found in UserRole table.")
        return

    hod_user = db.query(Profile).filter(Profile.user_id == hod_role.user_id).first()
    print(f"Found HOD: {hod_user.full_name} ({hod_user.email})")
    
    # 2. Check Department Assignment
    hod_dept = db.query(Department).filter(Department.hod_id == hod_user.user_id).first()
    if not hod_dept:
        print("❌ HOD is NOT assigned to any Department (Department.hod_id linkage missing).")
        print("   -> Result: HOD sees ONLY themselves.")
    else:
        print(f"✅ HOD is assigned to Department: '{hod_dept.name}' (ID: {hod_dept.id})")
        
        # 3. Check Teachers in this Department
        print(f"\nSearching for teachers with Profile.department = '{hod_dept.name}'...")
        
        teachers_query = db.query(Profile).join(UserRole, Profile.user_id == UserRole.user_id)\
            .filter(UserRole.role == AppRole.TEACHER)
        
        all_teachers = teachers_query.all()
        print(f"Total Teachers in DB: {len(all_teachers)}")
        
        matching_teachers = teachers_query.filter(Profile.department == hod_dept.name).all()
        print(f"Teachers matching '{hod_dept.name}': {len(matching_teachers)}")
        
        if len(matching_teachers) == 0:
            print("\n❌ PROBLEM FOUND: No teachers match the HOD's department name.")
            print("Dumping first 5 teachers to check their 'department' field:")
            for t in all_teachers[:5]:
                print(f" - {t.full_name}: '{t.department}'")

if __name__ == "__main__":
    debug_hod_view()

"""
Fix Pilot Data and Passwords
Updates passwords, links HOD to Department, creates Grading Rules, and ensures Student Profiles exist.
"""
import uuid
from decimal import Decimal
from app.database import SessionLocal
from app.models import Profile, UserRole, Student, Department, GradeScale, GradingRule
from app.core.security import get_password_hash
from app.core.permissions import AppRole

def fix_data():
    db = SessionLocal()
    try:
        print("Starting Data Fixes...")
        
        # 1. Fix Staff Passwords
        print("\n1. Fixing Staff Passwords...")
        staff_users = {
            "principal@pilot.edu": "principal123",
            "hod.cse@pilot.edu": "hodcse123",
            "teacher.ds@pilot.edu": "faculty123"
        }
        
        hod_user_id = None
        
        for email, password in staff_users.items():
            user = db.query(Profile).filter(Profile.email == email).first()
            if user:
                user.password_hash = get_password_hash(password)
                print(f"  ✓ Updated password for {email}")
                if "hod" in email:
                    hod_user_id = user.user_id
            else:
                print(f"  ❌ User {email} not found!")

        # 2. Link HOD to Department
        print("\n2. Linking HOD to Department...")
        if hod_user_id:
            dept = db.query(Department).filter(Department.code == "CSE").first()
            if dept:
                dept.hod_id = hod_user_id
                print(f"  ✓ Linked HOD {hod_user_id} to Department {dept.name}")
            else:
                print("  ❌ CSE Department not found")
        else:
            print("  ❌ HOD user not found, skipping link")

        # 3. Seed Grading Rules
        print("\n3. Seeding Grading Rules...")
        scale = db.query(GradeScale).filter(GradeScale.name == "Absolute").first()
        if not scale:
            scale = GradeScale(
                id=uuid.uuid4(),
                name="Absolute",
                description="Standard Absolute Grading"
            )
            db.add(scale)
            db.flush()
            print("  ✓ Created 'Absolute' GradeScale")
            
            rules = [
                ("S", 90, 100, 10.0),
                ("A", 80, 89.99, 9.0),
                ("B", 70, 79.99, 8.0),
                ("C", 60, 69.99, 7.0),
                ("D", 50, 59.99, 6.0),
                ("E", 40, 49.99, 5.0),
                ("F", 0, 39.99, 0.0)
            ]
            
            for grade, min_p, max_p, point in rules:
                rule = GradingRule(
                    id=uuid.uuid4(),
                    grade_scale_id=scale.id,
                    grade=grade,
                    min_percentage=Decimal(str(min_p)),
                    max_percentage=Decimal(str(max_p)),
                    grade_point=Decimal(str(point))
                )
                db.add(rule)
            print(f"  ✓ Created {len(rules)} Grading Rules")
        else:
            print("  → Grading Rules already exist")

        # 4. Create Student Profiles
        print("\n4. Creating Student Profiles...")
        students = db.query(Student).all()
        for student in students:
            student_email = student.email
            profile = db.query(Profile).filter(Profile.email == student_email).first()
            
            if not profile:
                user_id = uuid.uuid4()
                profile = Profile(
                    id=uuid.uuid4(),
                    user_id=user_id,
                    email=student_email,
                    full_name=student.name,
                    password_hash=get_password_hash("student123")
                )
                db.add(profile)
                
                role = UserRole(
                    id=uuid.uuid4(),
                    user_id=user_id,
                    role=AppRole.STUDENT
                )
                db.add(role)
                
                student.user_id = user_id
                print(f"  ✓ Created profile for {student.name}")
            else:
                profile.password_hash = get_password_hash("student123")
                # print(f"  ✓ Updated password for {student.name}")
        
        db.commit()
        print("\n✅ DATA FIX COMPLETED SUCCESSFULLY")
        
    except Exception as e:
        print(f"\n❌ DATA FIX FAILED: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    fix_data()

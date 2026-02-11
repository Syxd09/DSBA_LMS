import sys
import os
import httpx

import uuid
from datetime import date, timedelta

# Add backend directory to sys.path if running locally
if os.path.exists(os.path.join(os.getcwd(), 'backend')):
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
else:
    sys.path.append(os.getcwd())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import Profile, UserRole, Student, SubjectOffering, Subject
from app.core.security import get_password_hash
from app.core.permissions import AppRole
from app.config import settings

# Database Setup
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base URL
BASE_URL = "http://localhost:8000/api/v1"

def setup_test_data():
    print("--- Setting up Test Data ---")
    db = SessionLocal()
    try:
        # 1. Setup Teacher
        teacher_email = "teacher.ds@pilot.edu"
        teacher = db.query(Profile).filter(Profile.email == teacher_email).first()
        if not teacher:
            print(f"❌ Teacher {teacher_email} not found. Run seed_pilot_data.py first.")
            return None
        
        # Set password
        teacher.password_hash = get_password_hash("teacher123")
        db.commit()
        print(f"✅ Teacher password set to 'teacher123'")

        # 2. Setup Student
        student_usn = "1PI23CS001"
        student = db.query(Student).filter(Student.usn == student_usn).first()
        if not student:
            print(f"❌ Student {student_usn} not found. Run seed_pilot_data.py first.")
            return None
        
        # Check/Create Profile
        if not student.user_id:
            print(f"  Creating profile for student {student_usn}...")
            user_id = uuid.uuid4()
            profile = Profile(
                id=uuid.uuid4(),
                user_id=user_id,
                email=student.email,
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
            db.commit()
            print(f"✅ Student profile created with password 'student123'")
        else:
            # Ensure password is set if profile exists
            profile = db.query(Profile).filter(Profile.user_id == student.user_id).first()
            profile.password_hash = get_password_hash("student123")
            db.commit()
            print(f"✅ Student password set to 'student123'")

        # 3. Get Offering ID
        offering = db.query(SubjectOffering).join(Subject).filter(Subject.code == "CS201").first()
        if not offering:
            print("❌ CS201 Offering not found")
            return None
            
        print(f"✅ Found Offering ID: {offering.id}")
        
        return {
            "teacher_email": teacher_email,
            "student_usn": student_usn,
            "offering_id": str(offering.id)
        }
        
    finally:
        db.close()

def login(email, password):
    try:
        response = httpx.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
        if response.status_code == 200:
            return response.json()["access_token"]
        print(f"Login failed for {email}: {response.text}")
        return None
    except Exception as e:
        print(f"Connection failed: {e}")
        return None

def run_tests(data):
    print("\n--- Running API Tests ---")
    
    # 1. Login Teacher
    print("1. Logging in as Teacher...")
    teacher_token = login(data["teacher_email"], "teacher123")
    if not teacher_token: return
    headers_teacher = {"Authorization": f"Bearer {teacher_token}"}
    print("✅ Teacher Logged In")

    # 2. Assign Remedial Action
    print("\n2. Assigning Remedial Action...")
    payload = {
        "student_ids": [data["student_usn"]],
        "offering_id": data["offering_id"],
        "action_type": "ASSIGNMENT",
        "description": "Complete Worksheet 1",
        "deadline": str(date.today() + timedelta(days=7)),
        "remarks": "Focus on array traversal"
    }
    res = httpx.post(f"{BASE_URL}/remedial/assign", json=payload, headers=headers_teacher)
    if res.status_code != 201:
        print(f"❌ Failed to assign: {res.text}")
        return
    action = res.json()[0]
    action_id = action["id"]
    print(f"✅ Assigned Action ID: {action_id}")

    # 3. Login Student
    print("\n3. Logging in as Student...")
    student_token = login(f"student1@pilot.edu", "student123") # Assuming email format from seed
    if not student_token: return
    headers_student = {"Authorization": f"Bearer {student_token}"}
    print("✅ Student Logged In")

    # 4. Student View Actions
    print("\n4. Student fetching actions...")
    res = httpx.get(f"{BASE_URL}/remedial/student/{data['student_usn']}", headers=headers_student)
    if res.status_code != 200:
        print(f"❌ Failed to fetch: {res.text}")
        return
    actions = res.json()
    if not any(a["id"] == action_id for a in actions):
        print("❌ Assigned action not found in student list")
        return
    print(f"✅ Action found in student list (Total: {len(actions)})")

    # 5. Student Updates Action
    print("\n5. Student submitting proof...")
    update_payload = {
        "status": "IN_PROGRESS",
        "proof_url": "http://drive.google.com/file/123"
    }
    res = httpx.patch(f"{BASE_URL}/remedial/{action_id}", json=update_payload, headers=headers_student)
    if res.status_code != 200:
        print(f"❌ Failed to update: {res.text}")
        return
    print("✅ Student updated status to IN_PROGRESS")

    # 6. Teacher Verifies
    print("\n6. Teacher verifying action...")
    verify_payload = {
        "status": "VERIFIED",
        "remarks": "Good job, verified."
    }
    res = httpx.patch(f"{BASE_URL}/remedial/{action_id}", json=verify_payload, headers=headers_teacher)
    if res.status_code != 200:
        print(f"❌ Failed to verify: {res.text}")
        return
    final_action = res.json()
    if final_action["status"] == "VERIFIED":
        print("✅ Action successfully VERIFIED by Teacher")
    else:
        print(f"❌ Status mismatch: {final_action['status']}")

    print("\n🎉 ALL TESTS PASSED")

if __name__ == "__main__":
    data = setup_test_data()
    if data:
        run_tests(data)

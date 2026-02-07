#!/usr/bin/env python3
"""
EduMetrics - Fix Pilot Passwords
Updates pilot users with valid password hashes for login verification.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Profile, UserRole, Student, Subject, SubjectOffering, TeacherAssignment, Cohort
from app.core.permissions import AppRole
from app.core.security import get_password_hash
import uuid

def fix_passwords():
    print("re-hashing pilot user passwords...")
    db = SessionLocal()
    
    # 1. Update Staff Passwords
    users_to_update = {
        "principal@pilot.edu": "admin123",
        "hod.cse@pilot.edu": "secure_password",
        "teacher.ds@pilot.edu": "secure_password",
    }
    
    updated_count = 0
    try:
        # Update Staff
        for email, plain_password in users_to_update.items():
            user = db.query(Profile).filter(Profile.email == email).first()
            if user:
                print(f"  Updating password for {email}...")
                user.password_hash = get_password_hash(plain_password)
                updated_count += 1
            else:
                print(f"  Warning: User {email} not found")
        
        # 2. Create Student Accounts if missing
        print("  Checking Student accounts...")
        students = db.query(Student).all()
        for student in students:
            if not student.email:
                print(f"  Skipping student {student.usn} (no email)")
                continue
                
            # Check if profile exists
            profile = db.query(Profile).filter(Profile.email == student.email).first()
            
            if not profile:
                print(f"  Creating Profile for {student.name} ({student.email})...")
                user_id = uuid.uuid4()
                profile = Profile(
                    id=uuid.uuid4(),
                    user_id=user_id,
                    email=student.email,
                    full_name=student.name,
                    password_hash=get_password_hash("student123")
                )
                db.add(profile)
                
                # Create Role
                role = UserRole(
                    id=uuid.uuid4(),
                    user_id=user_id,
                    role=AppRole.STUDENT
                )
                db.add(role)
                
                updated_count += 1
            else:
                print(f"  Updating password for existing student {student.email}...")
                profile.password_hash = get_password_hash("student123")
                user_id = profile.user_id
                updated_count += 1
            
            # Link Student to Profile
            if student.user_id != user_id:
                print(f"  Linking Student {student.usn} to User {user_id}...")
                student.user_id = user_id

        # 3. Create Teacher Assignment if missing
        print("  Checking Teacher Assignment...")
        teacher = db.query(Profile).filter(Profile.email == "teacher.ds@pilot.edu").first()
        if teacher:
            # Find subject offering (CS201)
            subject = db.query(Subject).filter(Subject.code == "CS201").first()
            if subject:
                offering = db.query(SubjectOffering).filter(SubjectOffering.subject_id == subject.id).first()
                if offering:
                    assignment = db.query(TeacherAssignment).filter(
                        TeacherAssignment.teacher_id == teacher.user_id,
                        TeacherAssignment.offering_id == offering.id
                    ).first()
                    
                    if not assignment:
                        print("  Creating Teacher Assignment for Data Structures...")
                        ta = TeacherAssignment(
                            id=uuid.uuid4(),
                            teacher_id=teacher.user_id,
                            offering_id=offering.id,
                            cohort_id=offering.cohort_id,
                            academic_year="2023-24",
                            subject_id=subject.id
                        )
                        db.add(ta)
                        updated_count += 1
                    else:
                         print("  Teacher Assignment exists.")
                else:
                    print("  Warning: Subject Offering for CS201 not found")
            else:
                print("  Warning: Subject CS201 not found")

        db.commit()
        print(f"✅ Updated/Created {updated_count} user accounts successfully")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Failed to fix data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_passwords()

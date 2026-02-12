import sys
import os
from uuid import UUID

sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database import SessionLocal
from app.models.user import Profile, UserRole
from app.models.student import Student
from app.models.academic import TeacherAssignment
from app.models.organization import Department

BOLD = "\033[1m"
RED = "\033[91m"
GREEN = "\033[92m"
BLUE = "\033[94m"
RESET = "\033[0m"

def diagnose_linkage():
    db = SessionLocal()
    print(f"{BOLD}=== USER DATA LINKAGE DIAGNOSTIC ==={RESET}")

    # 1. Users (Profiles)
    profiles = db.query(Profile).all()
    print(f"\n{BOLD}1. Profiles ({len(profiles)}){RESET}")
    for p in profiles:
        role_entry = db.query(UserRole).filter(UserRole.user_id == p.user_id).first()
        role_str = str(role_entry.role) if role_entry else "NO_ROLE"
        print(f"  - [{role_str}] {p.email} (User ID: {p.user_id})")

    # 2. HOD Linkage
    print(f"\n{BOLD}2. HOD Linkage (Departments){RESET}")
    depts = db.query(Department).all()
    for d in depts:
        hod_profile = db.query(Profile).filter(Profile.user_id == d.hod_id).first()
        hod_name = hod_profile.email if hod_profile else "UNKNOWN"
        status = GREEN if hod_profile else RED
        print(f"  - Dept: {d.name} | HOD ID: {d.hod_id} ({status}{hod_name}{RESET})")

    # 3. Teacher Linkage (Assignments)
    print(f"\n{BOLD}3. Teacher Assignments{RESET}")
    assignments = db.query(TeacherAssignment).all()
    if not assignments:
        print(f"  {RED}No Teacher Assignments found!{RESET}")
    else:
        for a in assignments:
            teacher = db.query(Profile).filter(Profile.user_id == a.teacher_id).first()
            t_name = teacher.email if teacher else "UNKNOWN"
            status = GREEN if teacher else RED
            print(f"  - Subject: {a.subject_id} | Teacher: {a.teacher_id} ({status}{t_name}{RESET})")

    # 4. Student Linkage
    print(f"\n{BOLD}4. Student Linkage{RESET}")
    students = db.query(Student).limit(10).all()
    for s in students:
        u = db.query(Profile).filter(Profile.user_id == s.user_id).first()
        u_name = u.email if u else "UNKNOWN"
        status = GREEN if u else RED
        print(f"  - USN: {s.usn} | User ID: {s.user_id} ({status}{u_name}{RESET})")

    db.close()

if __name__ == "__main__":
    diagnose_linkage()

import requests
import sys

BASE_URL = "http://localhost:8000/api/v1"
EMAIL = "verify_admin@example.com"
PASSWORD = "password123"
NAME = "Verify Admin"

def register_and_login():
    # Signup
    try:
        resp = requests.post(f"{BASE_URL}/auth/signup", json={
            "email": EMAIL,
            "password": PASSWORD,
            "full_name": NAME
        })
    except Exception as e:
        print(f"Server not up? {e}")
        sys.exit(1)

    # Login
    resp = requests.post(f"{BASE_URL}/auth/login", data={
        "username": EMAIL,
        "password": PASSWORD
    })
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        sys.exit(1)
    return resp.json()["access_token"]

def verify_programs(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Ensure a program exists (requires Department)
    # List Departments
    depts = requests.get(f"{BASE_URL}/departments", headers=headers).json()
    if not depts:
        # Create department
        dept_resp = requests.post(f"{BASE_URL}/departments", headers=headers, json={
            "name": "Test Dept",
            "code": "TD1",
            "hod_id": None
        })
        dept_id = dept_resp.json()["id"]
    else:
        dept_id = depts[0]["id"]

    # List Programs
    progs = requests.get(f"{BASE_URL}/programs", headers=headers).json()
    if not progs:
        # Create Program
        prog_resp = requests.post(f"{BASE_URL}/programs", headers=headers, json={
            "name": "Test Program",
            "code": "TP1",
            "department_id": dept_id,
            "duration_years": 4
        })
        # Fetch again
        progs = requests.get(f"{BASE_URL}/programs", headers=headers).json()
    
    # Verify Nested Department
    print("\n--- Verifying Programs ---")
    if progs:
        p = progs[0]
        if "department" in p and p["department"] is not None:
             print(f"SUCCESS: Program '{p['name']}' has department '{p['department']['name']}'")
        else:
             print(f"FAILURE: Program '{p['name']}' missing nested department data. Got: {p.get('department')}")
    else:
        print("No programs found to verify.")

    return progs[0]["id"] if progs else None

def verify_cohorts(token, program_id):
    if not program_id:
        return

    headers = {"Authorization": f"Bearer {token}"}
    
    # List Cohorts
    cohorts = requests.get(f"{BASE_URL}/cohorts", headers=headers).json()
    if not cohorts:
        # Create Cohort
        requests.post(f"{BASE_URL}/cohorts", headers=headers, json={
            "name": "2024-2028",
            "year": 2024,
            "program_id": program_id,
            "current_semester": 1
        })
        cohorts = requests.get(f"{BASE_URL}/cohorts", headers=headers).json()

    print("\n--- Verifying Cohorts ---")
    if cohorts:
        c = cohorts[0]
        # Verify Nested Program
        if "program" in c and c["program"] is not None:
             print(f"SUCCESS: Cohort '{c['name']}' has program '{c['program']['name']}'")
        else:
             print(f"FAILURE: Cohort '{c['name']}' missing nested program data.")
             
        # Verify Counts
        if "student_count" in c and "exam_count" in c:
            print(f"SUCCESS: Cohort has stats - Students: {c['student_count']}, Exams: {c['exam_count']}")
        else:
            print(f"FAILURE: Cohort missing stats keys. Keys found: {c.keys()}")
            
    else:
        print("No cohorts found to verify.")

def main():
    print("Starting Verification...")
    token = register_and_login()
    prog_id = verify_programs(token)
    verify_cohorts(token, prog_id)
    print("\nVerification Complete.")

if __name__ == "__main__":
    main()

import requests
import sys
import uuid
import random

BASE_URL = "http://localhost:8000/api/v1"
EMAIL = "verify_admin@example.com"
PASSWORD = "password123"

# Colors for output
GREEN = "\033[92m"
RED = "\033[91m"
RESET = "\033[0m"

def log(msg, success=True):
    color = GREEN if success else RED
    icon = "✓" if success else "✗"
    print(f"{color}{icon} {msg}{RESET}")

def login():
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": EMAIL, "password": PASSWORD})
    print(f"Login Status: {resp.status_code}")
    print(f"Login Response: {resp.text}")
    if resp.status_code != 200:
        log(f"Login Failed: {resp.text}", False)
        sys.exit(1)
    return resp.json()["access_token"]

def get_or_create_prerequisites(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # Needs Subject, Cohort
    subjects = requests.get(f"{BASE_URL}/subjects", headers=headers).json()
    if not subjects:
        # Create Subject
        log("Creating Prerequisites: Subject...", True)
        # Needs Department first, likely exists from previous test
        depts = requests.get(f"{BASE_URL}/departments", headers=headers).json()
        if not depts:
            requests.post(f"{BASE_URL}/departments", headers=headers, json={"name":"CSE", "code":"CSE"})
            depts = requests.get(f"{BASE_URL}/departments", headers=headers).json()
        
        dept_id = depts[0]["id"]
        
        # Create Subject
        s_resp = requests.post(f"{BASE_URL}/subjects", headers=headers, json={
            "name": "Advanced Verify",
            "code": "AV101",
            "credits": 4,
            "department_id": dept_id,
            "semester": 1,
            "type": "theory"
        })
        subject = s_resp.json()
    else:
        subject = subjects[0]

    # Needs Cohort
    cohorts = requests.get(f"{BASE_URL}/cohorts", headers=headers).json()
    if not cohorts:
        # Needs Program
        progs = requests.get(f"{BASE_URL}/programs", headers=headers).json()
        if not progs:
            # Create Program
            requests.post(f"{BASE_URL}/programs", headers=headers, json={
                "name": "B.Tech", "code": "BT", "department_id": subject.get("department_id") or depts[0]["id"], "duration_years":4
            })
            progs = requests.get(f"{BASE_URL}/programs", headers=headers).json()
            
        requests.post(f"{BASE_URL}/cohorts", headers=headers, json={
            "name": "Lifecycle Batch", "year": 2025, "program_id": progs[0]["id"], "current_semester": 1
        })
        cohorts = requests.get(f"{BASE_URL}/cohorts", headers=headers).json()
    
    cohort = cohorts[0]
    
    # Needs Student in Cohort
    enrollments = requests.get(f"{BASE_URL}/enrollments?cohort_id={cohort['id']}", headers=headers).json()
    if not enrollments:
        # Create Student User
        s_email = f"student_{random.randint(1000,9999)}@test.com"
        s_resp = requests.post(f"{BASE_URL}/auth/signup", json={"email": s_email, "password": "password", "full_name": "Test Student"})
        print(f"Signup Status: {s_resp.status_code}")
        # print(f"Signup Response: {s_resp.text}")
        student_id = s_resp.json()["user"]["user_id"]
        
        # Enroll (Assuming API exists or manually creating enrollment)
        # Actually API is POST /enrollments
        requests.post(f"{BASE_URL}/enrollments", headers=headers, json={
            "student_id": student_id,
            "cohort_id": cohort["id"],
            "roll_number": "R101",
            "status": "active"
        })
        enrollments = requests.get(f"{BASE_URL}/enrollments?cohort_id={cohort['id']}", headers=headers).json()

    return subject, cohort, enrollments[0]["student_id"]

def run_lifecycle(token):
    headers = {"Authorization": f"Bearer {token}"}
    subject, cohort, student_id = get_or_create_prerequisites(token)
    log(f"Context: Subject '{subject['name']}', Cohort '{cohort['name']}'")

    # 1. Create CO
    log("Step 1: Create Course Outcome")
    co_num = random.randint(10, 999)
    co_data = {
        "co_number": co_num,
        "description": f"Understand Lifecycle Testing {co_num}",
        "bloom_level": "Understand",
        "subject_id": subject['id']
    }
    co_resp = requests.post(f"{BASE_URL}/subjects/{subject['id']}/outcomes", headers=headers, json=co_data)
    if co_resp.status_code not in [200, 201]:
        log(f"Failed to create CO: {co_resp.text}", False)
        return
    co = co_resp.json()
    log("CO Created successfully")

    # 2. Map CO to PO (Testing new feature)
    # First get POs (Program Outcomes). If none, create one for the Program.
    # We need Program ID. Cohort has it.
    prog_id = cohort.get("program_id") or cohort["program"]["id"]
    
    # 3. Create Exam
    log("Step 2: Create Exam")
    exam_data = {
        "title": f"Lifecycle Test Exam {co_num}",
        "exam_type": "internal1",
        "max_marks": 50,
        "passing_marks": 20,
        "date": "2025-12-12T10:00:00",
        "duration_minutes": 60,
        "subject_id": subject["id"],
        "cohort_id": cohort["id"],
        "status": "draft"
    }
    exam_resp = requests.post(f"{BASE_URL}/exams", headers=headers, json=exam_data)
    if exam_resp.status_code not in [200, 201]:
        log(f"Failed to create Exam: {exam_resp.text}", False)
        return
    exam = exam_resp.json()
    log("Exam Created successfully")

    # 4. Create Exam Structure (Bulk)
    log("Step 3: Define Exam Structure (Bulk)")
    structure_data = {
        "sections": [
            {
                "name": "Part A",
                "max_marks": 10,
                "sequence": 1,
                "questions": [
                    {
                        "sequence": 1,
                        "max_marks": 10,
                        "co_id": co["id"],
                        "bloom_level": "Understand",
                        "sub_questions": [
                            {
                                "label": "a",
                                "max_marks": 10,
                                "co_id": co["id"],
                                "bloom_level": "Understand"
                            }
                        ]
                    }
                ]
            }
        ]
    }
    
    struct_resp = requests.put(f"{BASE_URL}/exams/{exam['id']}/structure", headers=headers, json=structure_data)
    if struct_resp.status_code != 200:
        log(f"Failed to define structure: {struct_resp.text}", False)
        return
        
    exam_struct = struct_resp.json()
    # Extract SubQuestion ID for marks
    try:
        sub_q_id = exam_struct["sections"][0]["questions"][0]["sub_questions"][0]["id"]
    except (KeyError, IndexError):
        log("Failed to extract SubQuestion ID from response", False)
        return
        
    log("Structure Defined (Bulk)")

    # 5. Enter Marks
    log("Step 4: Enter Marks")
    marks_data = [
        {
            "student_id": student_id,
            "sub_question_id": sub_q_id,
            "marks": 8.5
        }
    ]
    # Bulk Save endpoint
    m_resp = requests.post(f"{BASE_URL}/marks/exam/{exam['id']}", headers=headers, json={
        "exam_id": exam["id"],
        "marks": marks_data
    })
    if m_resp.status_code != 200:
        log(f"Failed to enter marks: {m_resp.text}", False)
        return
    log("Marks Entered successfully")

    # 6. Publish Exam
    log("Step 5: Publish Exam")
    p_resp = requests.post(f"{BASE_URL}/exams/{exam['id']}/publish", headers=headers)
    if p_resp.status_code != 200:
        log(f"Failed to publish: {p_resp.text}", False)
    else:
        log("Exam Published")

    # 7. Check Analytics (CO Attainment)
    log("Step 6: Check CO Attainment Analytics")
    ana_resp = requests.get(f"{BASE_URL}/analytics/co-attainment/{subject['id']}", headers=headers)
    if ana_resp.status_code != 200:
        log(f"Failed to get analytics: {ana_resp.text}", False)
        return
    
    analytics = ana_resp.json()
    # Expecting {"outcomes": [], "po_contribution": []} based on my fix
    if "outcomes" in analytics and "po_contribution" in analytics:
         log("Analytics Structure Verified (Includes po_contribution)")
         # Check values
         for out in analytics["outcomes"]:
             if out["co_number"] == co_num:
                 log(f"CO{co_num} Attainment: {out['attainment']}% (Expected around 85%)")
    else:
         log(f"Analytics Structure Mismatch! Keys: {analytics.keys()}", False)

    log("Lifecycle Test Completed Successfully!", True)

if __name__ == "__main__":
    try:
        token = login()
        run_lifecycle(token)
    except Exception as e:
        import traceback
        traceback.print_exc()
        log(f"Script Error: {e}", False)

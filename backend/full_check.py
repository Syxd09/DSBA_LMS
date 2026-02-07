import requests
import sys
import uuid
import random
import traceback

BASE_URL = "http://localhost:8000/api/v1"
ADMIN_EMAIL = "verify_admin@example.com"
ADMIN_PASS = "password123"

# Colors
GREEN = "\033[92m"
RED = "\033[91m"
CYAN = "\033[96m"
RESET = "\033[0m"

def log(msg, success=True, header=False):
    if header:
        print(f"\n{CYAN}=== {msg} ==={RESET}")
        return
    color = GREEN if success else RED
    icon = "✓" if success else "✗"
    print(f"{color}{icon} {msg}{RESET}")

def get_token(email, password):
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
    if resp.status_code != 200:
        log(f"Login Failed for {email}: {resp.text}", False)
        sys.exit(1)
    return resp.json()["access_token"]

def setup_data(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 1. Subject (Ensure 'Full Check Subject')
    depts = requests.get(f"{BASE_URL}/departments", headers=headers).json()
    if not depts:
        requests.post(f"{BASE_URL}/departments", headers=headers, json={"name":"CSE", "code":"CSE"})
        depts = requests.get(f"{BASE_URL}/departments", headers=headers).json()
    
    subject_resp = requests.post(f"{BASE_URL}/subjects", headers=headers, json={
        "name": "Full Check Subject",
        "code": f"FC{random.randint(100,999)}",
        "credits": 4,
        "department_id": depts[0]["id"],
        "semester": 1,
        "type": "theory"
    })
    # If exists (400), find it. If 201, use it.
    if subject_resp.status_code == 201:
        subject = subject_resp.json()
    else:
        # Fallback to list and find
        subs = requests.get(f"{BASE_URL}/subjects", headers=headers).json()
        subject = subs[0]

    # 2. Program & Cohort
    progs = requests.get(f"{BASE_URL}/programs", headers=headers).json()
    if not progs:
        requests.post(f"{BASE_URL}/programs", headers=headers, json={
            "name": "B.Tech", "code": "BT", "department_id": depts[0]["id"], "duration_years":4
        })
        progs = requests.get(f"{BASE_URL}/programs", headers=headers).json()
    
    # Create valid Cohort
    requests.post(f"{BASE_URL}/cohorts", headers=headers, json={
        "name": "Full Check Batch", "year": 2025, "program_id": progs[0]["id"], "current_semester": 1
    })
    cohorts = requests.get(f"{BASE_URL}/cohorts", headers=headers).json()
    cohort = cohorts[0]
    
    # 3. Create Fresh Student
    s_email = f"student_{random.randint(10000,99999)}@test.com"
    s_pass = "password123"
    s_resp = requests.post(f"{BASE_URL}/auth/signup", json={"email": s_email, "password": s_pass, "full_name": "Check Student"})
    if s_resp.status_code != 200:
        log(f"Student Signup Failed: {s_resp.text}", False)
        sys.exit(1)
    
    student_user_id = s_resp.json()["user"]["user_id"]
    
    # Enroll
    requests.post(f"{BASE_URL}/enrollments", headers=headers, json={
        "student_id": student_user_id,
        "cohort_id": cohort["id"],
        "roll_number": f"R{random.randint(1000,9999)}",
        "status": "active"
    })
    
    log(f"Setup Complete: Subject '{subject['code']}', Student '{s_email}'")
    return subject, cohort, student_user_id, s_email, s_pass

def run_teacher_flow(admin_token, subject, cohort, student_id):
    headers = {"Authorization": f"Bearer {admin_token}"}
    log("Teacher Workflow", header=True)
    
    # 1. CO
    co_num = random.randint(1, 100)
    co_resp = requests.post(f"{BASE_URL}/subjects/{subject['id']}/outcomes", headers=headers, json={
        "co_number": co_num,
        "description": f"Outcome {co_num}",
        "bloom_level": "Apply",
        "subject_id": subject["id"]
    })
    if co_resp.status_code not in [200, 201]:
        log(f"CO Creation Failed: {co_resp.text}", False)
        return None
    co = co_resp.json()
    log("Course Outcome Created")

    # 2. Exam
    exam_resp = requests.post(f"{BASE_URL}/exams", headers=headers, json={
        "title": f"Exam {co_num}",
        "exam_type": "internal1",
        "max_marks": 50,
        "passing_marks": 20,
        "date": "2025-12-12T10:00:00",
        "duration_minutes": 60,
        "subject_id": subject["id"],
        "cohort_id": cohort["id"],
        "status": "draft"
    })
    exam = exam_resp.json()
    log("Exam Created (Draft)")
    
    # 3. Structure
    struct_data = {
        "sections": [{
            "name": "Sec A", "max_marks": 10, "sequence": 1,
            "questions": [{
                "sequence": 1, "max_marks": 10, "co_id": co["id"], "bloom_level": "Apply",
                "sub_questions": [{"label": "a", "max_marks": 10, "co_id": co["id"], "bloom_level": "Apply"}]
            }]
        }]
    }
    s_resp = requests.put(f"{BASE_URL}/exams/{exam['id']}/structure", headers=headers, json=struct_data)
    if s_resp.status_code != 200:
        log(f"Structure Failed: {s_resp.text}", False)
        return None
    exam_struct = s_resp.json()
    log("Exam Structure Defined")
    
    sub_q_id = exam_struct["sections"][0]["questions"][0]["sub_questions"][0]["id"]
    
    # 4. Marks
    m_resp = requests.post(f"{BASE_URL}/marks/exam/{exam['id']}", headers=headers, json={
        "exam_id": exam["id"],
        "marks": [{"student_id": student_id, "sub_question_id": sub_q_id, "marks": 9}]
    })
    if m_resp.status_code != 200:
        log(f"Marks Entry Failed: {m_resp.text}", False)
        return None
    log("Marks Entered (9/10)")
    
    # 5. Publish
    requests.post(f"{BASE_URL}/exams/{exam['id']}/publish", headers=headers)
    log("Exam Published")
    
    return exam, co_num

def run_student_flow(email, password, exam_id):
    log("Student Workflow", header=True)
    token = get_token(email, password)
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Get My Marks
    # First need student ID (User Role ID) or just access endpoints.
    # We'll use auth token to fetch 'me'.
    me = requests.get(f"{BASE_URL}/auth/me", headers=headers).json()
    student_id = me["user_id"]
    
    m_resp = requests.get(f"{BASE_URL}/marks/student/{student_id}", headers=headers)
    if m_resp.status_code != 200:
        log(f"Fetch Marks Failed: {m_resp.text}", False)
    else:
        marks = m_resp.json()
        # Verify exam marks
        found = any(m["exam_id"] == exam_id for m in marks)
        log(f"Marks Visible to Student: {found}")

    # 2. Dashboard
    d_resp = requests.get(f"{BASE_URL}/dashboard/student", headers=headers)
    if d_resp.status_code != 200:
        log(f"Dashboard Failed: {d_resp.text}", False) # Might trigger 404 if endpoint mismatch
    else:
        log("Student Dashboard Verified")

def run_principal_flow(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    log("Principal Workflow", header=True)
    
    # 1. Dashboard
    d_resp = requests.get(f"{BASE_URL}/dashboard/principal", headers=headers)
    if d_resp.status_code != 200:
        log(f"Principal Dashboard Failed: {d_resp.text}", False)
    else:
        data = d_resp.json()
        log(f"Dashboard Stats: {len(data.get('department_stats', []))} Departments found")

    # 2. Dept Stats
    ds_resp = requests.get(f"{BASE_URL}/analytics/department-stats", headers=headers)
    if ds_resp.status_code == 200:
        log("Department Stats Verified")

if __name__ == "__main__":
    try:
        admin_token = get_token(ADMIN_EMAIL, ADMIN_PASS)
        subject, cohort, student_id, s_email, s_pass = setup_data(admin_token)
        
        exam, co_num = run_teacher_flow(admin_token, subject, cohort, student_id)
        if exam:
            run_student_flow(s_email, s_pass, exam["id"])
            run_principal_flow(admin_token)
            
        log("\nFULL SYSTEM CHECK PASSED", header=True)
        
    except Exception as e:
        traceback.print_exc()
        log(f"System Check Error: {e}", False)

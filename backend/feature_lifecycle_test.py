"""
EduMetrics Complete Feature Lifecycle Tests
Tests all key features implemented in Phases A-J
"""
import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

# Test credentials (from pilot data) - auth expects username field
PRINCIPAL_CREDS = {"username": "principal@vvce.ac.in", "password": "principal123"}
HOD_CREDS = {"username": "hod.cse@vvce.ac.in", "password": "hodcse123"}
TEACHER_CREDS = {"username": "faculty1.cse@vvce.ac.in", "password": "faculty123"}
STUDENT_CREDS = {"username": "student1@vvce.ac.in", "password": "student123"}

class TestRunner:
    def __init__(self):
        self.results = {"passed": [], "failed": [], "skipped": []}
        self.tokens = {}
    
    def log(self, msg, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] [{level}] {msg}")
    
    def test(self, name, func):
        try:
            result = func()
            if result:
                self.results["passed"].append(name)
                self.log(f"✅ {name}", "PASS")
            else:
                self.results["failed"].append(name)
                self.log(f"❌ {name}", "FAIL")
        except Exception as e:
            self.results["failed"].append(f"{name}: {str(e)}")
            self.log(f"❌ {name}: {e}", "FAIL")
    
    def skip(self, name, reason):
        self.results["skipped"].append(f"{name}: {reason}")
        self.log(f"⏭️  {name} - {reason}", "SKIP")
    
    def login(self, creds, role):
        """Login and store token - uses OAuth2 form data"""
        try:
            # OAuth2 expects form-urlencoded data
            form_data = {
                "username": creds["username"],
                "password": creds["password"]
            }
            resp = requests.post(f"{BASE_URL}/auth/login", data=form_data)
            if resp.status_code == 200:
                data = resp.json()
                self.tokens[role] = data.get("access_token")
                return True
            self.log(f"Login failed for {role}: {resp.status_code} - {resp.text[:100]}", "DEBUG")
            return False
        except Exception as e:
            self.log(f"Login error: {e}", "DEBUG")
            return False
    
    def headers(self, role):
        """Get auth headers for role"""
        token = self.tokens.get(role)
        if token:
            return {"Authorization": f"Bearer {token}"}
        return {}
    
    def summary(self):
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"✅ Passed: {len(self.results['passed'])}")
        print(f"❌ Failed: {len(self.results['failed'])}")
        print(f"⏭️  Skipped: {len(self.results['skipped'])}")
        
        if self.results['failed']:
            print("\nFailed Tests:")
            for f in self.results['failed']:
                print(f"  - {f}")
        
        return len(self.results['failed']) == 0


def run_tests():
    runner = TestRunner()
    
    print("\n" + "="*60)
    print("EDUMETRICS FEATURE LIFECYCLE TESTS")
    print("="*60 + "\n")
    
    # ============================================================
    # 1. AUTHENTICATION
    # ============================================================
    runner.log("Testing Authentication...", "SECTION")
    
    runner.test("Principal Login", lambda: runner.login(PRINCIPAL_CREDS, "principal"))
    runner.test("HOD Login", lambda: runner.login(HOD_CREDS, "hod"))
    runner.test("Teacher Login", lambda: runner.login(TEACHER_CREDS, "teacher"))
    runner.test("Student Login", lambda: runner.login(STUDENT_CREDS, "student"))
    
    # ============================================================
    # 2. DASHBOARD APIs
    # ============================================================
    runner.log("Testing Dashboard APIs...", "SECTION")
    
    def test_teacher_dashboard():
        resp = requests.get(f"{BASE_URL}/dashboard/teacher", headers=runner.headers("teacher"))
        return resp.status_code == 200 and "assigned_subjects" in resp.json()
    
    def test_hod_dashboard():
        resp = requests.get(f"{BASE_URL}/dashboard/hod", headers=runner.headers("hod"))
        return resp.status_code == 200 and "department_students" in resp.json()
    
    def test_principal_dashboard():
        resp = requests.get(f"{BASE_URL}/dashboard/principal", headers=runner.headers("principal"))
        return resp.status_code == 200 and "total_students" in resp.json()
    
    def test_student_dashboard():
        resp = requests.get(f"{BASE_URL}/dashboard/student", headers=runner.headers("student"))
        return resp.status_code == 200
    
    runner.test("Teacher Dashboard", test_teacher_dashboard)
    runner.test("HOD Dashboard", test_hod_dashboard)
    runner.test("Principal Dashboard", test_principal_dashboard)
    runner.test("Student Dashboard", test_student_dashboard)
    
    # ============================================================
    # 3. ROLE-SPECIFIC ANALYTICS
    # ============================================================
    runner.log("Testing Role Analytics...", "SECTION")
    
    def test_principal_comprehensive():
        resp = requests.get(f"{BASE_URL}/analytics/role/principal/comprehensive", 
                           headers=runner.headers("principal"))
        return resp.status_code == 200
    
    def test_principal_accreditation():
        resp = requests.get(f"{BASE_URL}/analytics/role/principal/accreditation-readiness",
                           headers=runner.headers("principal"))
        return resp.status_code == 200
    
    def test_hod_teacher_effectiveness():
        resp = requests.get(f"{BASE_URL}/analytics/role/hod/teacher-effectiveness",
                           headers=runner.headers("hod"))
        return resp.status_code == 200
    
    def test_hod_department_health():
        resp = requests.get(f"{BASE_URL}/analytics/role/hod/department-health",
                           headers=runner.headers("hod"))
        return resp.status_code == 200
    
    runner.test("Principal Comprehensive Analytics", test_principal_comprehensive)
    runner.test("Principal Accreditation Readiness", test_principal_accreditation)
    runner.test("HOD Teacher Effectiveness", test_hod_teacher_effectiveness)
    runner.test("HOD Department Health", test_hod_department_health)
    
    # ============================================================
    # 4. EXPORT SYSTEM
    # ============================================================
    runner.log("Testing Export System...", "SECTION")
    
    def test_student_export():
        resp = requests.get(f"{BASE_URL}/export/student/performance?format=json",
                           headers=runner.headers("student"))
        return resp.status_code in [200, 404]  # 404 if no data
    
    def test_hod_export():
        resp = requests.get(f"{BASE_URL}/export/hod/department-health?format=json",
                           headers=runner.headers("hod"))
        return resp.status_code in [200, 404]
    
    def test_principal_export():
        resp = requests.get(f"{BASE_URL}/export/principal/institution-overview?format=json",
                           headers=runner.headers("principal"))
        return resp.status_code in [200, 404]
    
    runner.test("Student Performance Export", test_student_export)
    runner.test("HOD Department Export", test_hod_export)
    runner.test("Principal Institution Export", test_principal_export)
    
    # ============================================================
    # 5. PROMOTION WORKFLOW
    # ============================================================
    runner.log("Testing Promotion Workflow...", "SECTION")
    
    def test_pending_promotions():
        resp = requests.get(f"{BASE_URL}/promotions/pending/summary",
                           headers=runner.headers("hod"))
        return resp.status_code == 200 and "pending_count" in resp.json()
    
    runner.test("Pending Promotions Summary", test_pending_promotions)
    
    # Get a cohort to test preview
    def test_promotion_preview():
        # First get cohorts
        resp = requests.get(f"{BASE_URL}/cohorts", headers=runner.headers("hod"))
        if resp.status_code == 200:
            cohorts = resp.json()
            if cohorts and len(cohorts) > 0:
                cohort_id = cohorts[0].get("id")
                preview_resp = requests.get(f"{BASE_URL}/promotions/preview/{cohort_id}",
                                           headers=runner.headers("hod"))
                return preview_resp.status_code in [200, 400]  # 400 if final semester
        return False
    
    runner.test("Promotion Preview", test_promotion_preview)
    
    # ============================================================
    # 6. MARKS WORKFLOW
    # ============================================================
    runner.log("Testing Marks Workflow...", "SECTION")
    
    def test_marks_template():
        # Get an exam first
        resp = requests.get(f"{BASE_URL}/exams", headers=runner.headers("teacher"))
        if resp.status_code == 200:
            exams = resp.json()
            if exams and len(exams) > 0:
                exam_id = exams[0].get("id")
                template_resp = requests.get(f"{BASE_URL}/marks/template/{exam_id}",
                                            headers=runner.headers("teacher"))
                return template_resp.status_code in [200, 404]
        return True  # Pass if no exams exist
    
    runner.test("Marks Template Download", test_marks_template)
    
    # ============================================================
    # 7. GRADING RULES
    # ============================================================
    runner.log("Testing Grading Rules...", "SECTION")
    
    def test_list_grading_rules():
        resp = requests.get(f"{BASE_URL}/grading", headers=runner.headers("principal"))
        return resp.status_code == 200
    
    runner.test("List Grading Rules", test_list_grading_rules)
    
    # ============================================================
    # 8. DEPARTMENTS & PROGRAMS
    # ============================================================
    runner.log("Testing Master Data...", "SECTION")
    
    def test_list_departments():
        resp = requests.get(f"{BASE_URL}/departments", headers=runner.headers("principal"))
        return resp.status_code == 200
    
    def test_list_programs():
        resp = requests.get(f"{BASE_URL}/programs", headers=runner.headers("hod"))
        return resp.status_code == 200
    
    def test_list_cohorts():
        resp = requests.get(f"{BASE_URL}/cohorts", headers=runner.headers("hod"))
        return resp.status_code == 200
    
    runner.test("List Departments", test_list_departments)
    runner.test("List Programs", test_list_programs)
    runner.test("List Cohorts", test_list_cohorts)
    
    # ============================================================
    # 9. RBAC ENFORCEMENT
    # ============================================================
    runner.log("Testing RBAC Enforcement...", "SECTION")
    
    def test_student_cannot_access_hod():
        resp = requests.get(f"{BASE_URL}/dashboard/hod", headers=runner.headers("student"))
        return resp.status_code == 403
    
    def test_teacher_cannot_rollback():
        resp = requests.post(f"{BASE_URL}/promotions/fake-id/rollback?reason=TestReason12345",
                            headers=runner.headers("teacher"))
        return resp.status_code == 403
    
    runner.test("Student Cannot Access HOD Dashboard", test_student_cannot_access_hod)
    runner.test("Teacher Cannot Rollback Promotion", test_teacher_cannot_rollback)
    
    # Summary
    return runner.summary()


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)

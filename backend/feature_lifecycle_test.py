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
PRINCIPAL_CREDS = {"username": "principal@pilot.edu", "password": "principal123"}
HOD_CREDS = {"username": "hod.cse@pilot.edu", "password": "hodcse123"}
TEACHER_CREDS = {"username": "teacher.ds@pilot.edu", "password": "faculty123"}
STUDENT_CREDS = {"username": "student1@pilot.edu", "password": "student123"}

class TestRunner:
    def __init__(self):
        self.results = {"passed": [], "failed": [], "skipped": []}
        self.tokens = {}
    
    def log(self, msg, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] [{level}] {msg}")
    
    def check(self, resp, expected_codes=[200]):
        if resp.status_code in expected_codes:
            return True
        self.log(f"FAILED: Expected {expected_codes}, got {resp.status_code}", "ERROR")
        try:
            self.log(f"Response: {resp.json()}", "ERROR")
        except:
            self.log(f"Response: {resp.text[:200]}", "ERROR")
        return False

    def test(self, name, func):
        try:
            print(f"\nrunning {name}...")
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
    
    def login(self, creds, role):
        """Login and store token - uses OAuth2 form data"""
        try:
            form_data = {
                "username": creds["username"],
                "password": creds["password"]
            }
            resp = requests.post(f"{BASE_URL}/auth/login", data=form_data)
            if self.check(resp):
                data = resp.json()
                self.tokens[role] = data.get("access_token")
                return True
            return False
        except Exception as e:
            self.log(f"Login error: {e}", "DEBUG")
            return False
    
    def headers(self, role):
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
    
    # 1. AUTH
    runner.test("Principal Login", lambda: runner.login(PRINCIPAL_CREDS, "principal"))
    runner.test("HOD Login", lambda: runner.login(HOD_CREDS, "hod"))
    runner.test("Teacher Login", lambda: runner.login(TEACHER_CREDS, "teacher"))
    runner.test("Student Login", lambda: runner.login(STUDENT_CREDS, "student"))
    
    # 2. DASHBOARDS
    runner.test("Teacher Dashboard", lambda: runner.check(requests.get(f"{BASE_URL}/dashboard/teacher", headers=runner.headers("teacher"))))
    runner.test("HOD Dashboard", lambda: runner.check(requests.get(f"{BASE_URL}/dashboard/hod", headers=runner.headers("hod"))))
    runner.test("Principal Dashboard", lambda: runner.check(requests.get(f"{BASE_URL}/dashboard/principal", headers=runner.headers("principal"))))
    runner.test("Student Dashboard", lambda: runner.check(requests.get(f"{BASE_URL}/dashboard/student", headers=runner.headers("student"))))
    
    # 3. ANALYTICS
    runner.test("Principal Comprehensive Analytics", lambda: runner.check(requests.get(f"{BASE_URL}/analytics/role/principal/comprehensive", headers=runner.headers("principal"))))
    runner.test("Principal Accreditation Readiness", lambda: runner.check(requests.get(f"{BASE_URL}/analytics/role/principal/accreditation-readiness", headers=runner.headers("principal"))))
    runner.test("HOD Teacher Effectiveness", lambda: runner.check(requests.get(f"{BASE_URL}/analytics/role/hod/teacher-effectiveness", headers=runner.headers("hod"))))
    runner.test("HOD Department Health", lambda: runner.check(requests.get(f"{BASE_URL}/analytics/role/hod/department-health", headers=runner.headers("hod"))))
    
    # 4. EXPORTS
    runner.test("Student Performance Export", lambda: runner.check(requests.get(f"{BASE_URL}/export/student/performance?format=json", headers=runner.headers("student")), [200, 404]))
    runner.test("HOD Department Export", lambda: runner.check(requests.get(f"{BASE_URL}/export/hod/department-health?format=json", headers=runner.headers("hod")), [200, 404]))
    runner.test("Principal Institution Export", lambda: runner.check(requests.get(f"{BASE_URL}/export/principal/institution-overview?format=json", headers=runner.headers("principal")), [200, 404]))
    
    # 5. PROMOTIONS
    runner.test("Pending Promotions Summary", lambda: runner.check(requests.get(f"{BASE_URL}/promotions/pending/summary", headers=runner.headers("hod"))))
    
    def test_promotion_preview():
        resp = requests.get(f"{BASE_URL}/cohorts", headers=runner.headers("hod"))
        if runner.check(resp):
            cohorts = resp.json()
            if cohorts:
                return runner.check(requests.get(f"{BASE_URL}/promotions/preview/{cohorts[0]['id']}", headers=runner.headers("hod")), [200, 400])
        return False
    runner.test("Promotion Preview", test_promotion_preview)
    
    # 6. MARKS
    def test_marks_template():
        resp = requests.get(f"{BASE_URL}/exams", headers=runner.headers("teacher"))
        if runner.check(resp):
            exams = resp.json()
            if exams:
                return runner.check(requests.get(f"{BASE_URL}/marks/template/{exams[0]['id']}", headers=runner.headers("teacher")), [200, 404])
            print("No exams found, skipping template check")
            return True
        return False
    runner.test("Marks Template Download", test_marks_template)
    
    # 7. GRADING & MASTER
    runner.test("List Grading Rules", lambda: runner.check(requests.get(f"{BASE_URL}/grading/rules", headers=runner.headers("principal"))))
    runner.test("List Departments", lambda: runner.check(requests.get(f"{BASE_URL}/departments", headers=runner.headers("principal"))))
    runner.test("List Programs", lambda: runner.check(requests.get(f"{BASE_URL}/programs", headers=runner.headers("hod"))))
    runner.test("List Cohorts", lambda: runner.check(requests.get(f"{BASE_URL}/cohorts", headers=runner.headers("hod"))))
    
    # 8. RBAC
    import uuid
    random_id = str(uuid.uuid4())
    runner.test("Student Cannot Access HOD Dashboard", lambda: runner.check(requests.get(f"{BASE_URL}/dashboard/hod", headers=runner.headers("student")), [403]))
    runner.test("Teacher Cannot Rollback Promotion", lambda: runner.check(requests.post(f"{BASE_URL}/promotions/{random_id}/rollback?reason=TestReason12345", headers=runner.headers("teacher")), [403]))

    return runner.summary()

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)

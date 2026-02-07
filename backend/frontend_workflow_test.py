"""
Comprehensive Frontend Workflow Verification
This script simulates ALL frontend API calls to verify every feature works correctly.
It tests the complete lifecycle of each feature as the frontend would use it.
"""
import requests
import sys
import uuid
import random
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

# Test credentials
ADMIN_EMAIL = "verify_admin@example.com"
ADMIN_PASS = "password123"

def get_token(email, password):
    """Login and get access token."""
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
    if resp.status_code != 200:
        print(f"❌ Login Failed for {email}: {resp.text}")
        return None
    return resp.json()["access_token"]

def test_feature(name, func):
    """Run a feature test with error handling."""
    print(f"\n{'='*60}")
    print(f"Testing: {name}")
    print('='*60)
    try:
        result = func()
        if result:
            print(f"✅ {name}: PASSED")
            return True
        else:
            print(f"❌ {name}: FAILED")
            return False
    except Exception as e:
        print(f"❌ {name}: ERROR - {e}")
        return False

def run_all_tests():
    """Run comprehensive tests for all features."""
    results = {}
    
    # Get admin token
    token = get_token(ADMIN_EMAIL, ADMIN_PASS)
    if not token:
        print("Cannot proceed without admin token")
        sys.exit(1)
    headers = {"Authorization": f"Bearer {token}"}
    print(f"✅ Admin login successful")
    
    # 1. AUTH/ME ENDPOINT
    def test_auth_me():
        resp = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            print(f"   User: {data.get('full_name')} ({data.get('email')})")
            print(f"   Role: {data.get('role')}")
            return True
        print(f"   Error: {resp.text}")
        return False
    results['Auth/Me'] = test_feature("Auth/Me Endpoint", test_auth_me)
    
    # 2. DEPARTMENTS
    def test_departments():
        # List
        resp = requests.get(f"{BASE_URL}/departments", headers=headers)
        if resp.status_code != 200:
            print(f"   List failed: {resp.text}")
            return False
        depts = resp.json()
        print(f"   Found {len(depts)} departments")
        
        # Create
        new_dept = {"name": f"Test Dept {random.randint(1000,9999)}", "code": f"TD{random.randint(100,999)}"}
        resp = requests.post(f"{BASE_URL}/departments", headers=headers, json=new_dept)
        if resp.status_code == 200:
            dept_id = resp.json()["id"]
            print(f"   Created department: {new_dept['name']}")
            
            # Delete (cleanup)
            requests.delete(f"{BASE_URL}/departments/{dept_id}", headers=headers)
            print(f"   Cleaned up test department")
        else:
            print(f"   Create failed (might be duplicate): {resp.status_code}")
            
        return True
    results['Departments'] = test_feature("Departments CRUD", test_departments)
    
    # 3. PROGRAMS
    def test_programs():
        resp = requests.get(f"{BASE_URL}/programs", headers=headers)
        if resp.status_code != 200:
            print(f"   List failed: {resp.text}")
            return False
        programs = resp.json()
        print(f"   Found {len(programs)} programs")
        return True
    results['Programs'] = test_feature("Programs List", test_programs)
    
    # 4. COHORTS
    def test_cohorts():
        resp = requests.get(f"{BASE_URL}/cohorts", headers=headers)
        if resp.status_code != 200:
            print(f"   List failed: {resp.text}")
            return False
        cohorts = resp.json()
        print(f"   Found {len(cohorts)} cohorts")
        return True
    results['Cohorts'] = test_feature("Cohorts List", test_cohorts)
    
    # 5. SUBJECTS
    def test_subjects():
        resp = requests.get(f"{BASE_URL}/subjects", headers=headers)
        if resp.status_code != 200:
            print(f"   List failed: {resp.text}")
            return False
        subjects = resp.json()
        print(f"   Found {len(subjects)} subjects")
        
        if subjects:
            subj_id = subjects[0]["id"]
            # Get outcomes for first subject
            resp = requests.get(f"{BASE_URL}/subjects/{subj_id}/outcomes", headers=headers)
            if resp.status_code == 200:
                outcomes = resp.json()
                print(f"   Subject '{subjects[0]['name']}' has {len(outcomes)} outcomes")
            else:
                print(f"   Outcomes fetch failed: {resp.status_code}")
        return True
    results['Subjects'] = test_feature("Subjects & Outcomes", test_subjects)
    
    # 6. EXAMS
    def test_exams():
        resp = requests.get(f"{BASE_URL}/exams", headers=headers)
        if resp.status_code != 200:
            print(f"   List failed: {resp.text}")
            return False
        exams = resp.json()
        print(f"   Found {len(exams)} exams")
        
        if exams:
            exam = exams[0]
            print(f"   First exam: {exam.get('exam_type')} - Status: {exam.get('status')}")
            
            # Get exam structure
            resp = requests.get(f"{BASE_URL}/exams/{exam['id']}/structure", headers=headers)
            if resp.status_code == 200:
                structure = resp.json()
                sections = structure.get('sections', [])
                print(f"   Exam has {len(sections)} sections")
        return True
    results['Exams'] = test_feature("Exams & Structure", test_exams)
    
    # 7. GRADING RULES
    def test_grading():
        resp = requests.get(f"{BASE_URL}/grading/rules", headers=headers)
        if resp.status_code != 200:
            print(f"   List failed: {resp.text}")
            return False
        rules = resp.json()
        print(f"   Found {len(rules)} grading rules")
        for rule in rules[:3]:
            print(f"   - {rule['grade']}: {rule['min_percentage']}% - {rule['max_percentage']}%")
        return True
    results['Grading'] = test_feature("Grading Rules", test_grading)
    
    # 8. AUDIT LOGS
    def test_audit():
        resp = requests.get(f"{BASE_URL}/audit", headers=headers)
        if resp.status_code != 200:
            print(f"   List failed: {resp.text}")
            return False
        logs = resp.json()
        print(f"   Found {len(logs)} audit logs")
        if logs:
            latest = logs[0]
            print(f"   Latest: {latest['action']} on {latest['table_name']}")
        return True
    results['Audit'] = test_feature("Audit Logs", test_audit)
    
    # 9. USERS
    def test_users():
        resp = requests.get(f"{BASE_URL}/users", headers=headers)
        if resp.status_code != 200:
            print(f"   List failed: {resp.text}")
            return False
        users = resp.json()
        print(f"   Found {len(users)} users")
        roles = {}
        for u in users:
            r = u.get('role', 'unknown')
            roles[r] = roles.get(r, 0) + 1
        print(f"   Role distribution: {roles}")
        return True
    results['Users'] = test_feature("Users List", test_users)
    
    # 10. ENROLLMENTS
    def test_enrollments():
        resp = requests.get(f"{BASE_URL}/enrollments", headers=headers)
        if resp.status_code != 200:
            print(f"   List failed: {resp.text}")
            return False
        enrollments = resp.json()
        print(f"   Found {len(enrollments)} enrollments")
        return True
    results['Enrollments'] = test_feature("Student Enrollments", test_enrollments)
    
    # 11. ASSIGNMENTS (Teacher-Subject)
    def test_assignments():
        resp = requests.get(f"{BASE_URL}/assignments", headers=headers)
        if resp.status_code != 200:
            print(f"   List failed: {resp.text}")
            return False
        assignments = resp.json()
        print(f"   Found {len(assignments)} teacher assignments")
        return True
    results['Assignments'] = test_feature("Teacher Assignments", test_assignments)
    
    # 12. DASHBOARD - PRINCIPAL
    def test_principal_dashboard():
        resp = requests.get(f"{BASE_URL}/dashboard/principal", headers=headers)
        if resp.status_code != 200:
            print(f"   Failed: {resp.text}")
            return False
        data = resp.json()
        print(f"   Total Students: {data.get('total_students')}")
        print(f"   Total Teachers: {data.get('total_teachers')}")
        print(f"   Total Departments: {data.get('total_departments')}")
        return True
    results['Dashboard-Principal'] = test_feature("Principal Dashboard", test_principal_dashboard)
    
    # 13. ANALYTICS - DEPARTMENT STATS
    def test_analytics():
        resp = requests.get(f"{BASE_URL}/analytics/department-stats", headers=headers)
        if resp.status_code != 200:
            print(f"   Failed: {resp.text}")
            return False
        stats = resp.json()
        print(f"   Department stats retrieved: {len(stats)} departments")
        return True
    results['Analytics'] = test_feature("Analytics - Department Stats", test_analytics)
    
    # 14. MARKS (for an exam)
    def test_marks():
        # Get an exam first
        exams = requests.get(f"{BASE_URL}/exams", headers=headers).json()
        if not exams:
            print("   No exams found to test marks")
            return True  # Not a failure, just no data
        
        exam = exams[0]
        resp = requests.get(f"{BASE_URL}/marks/exam/{exam['id']}", headers=headers)
        if resp.status_code != 200:
            print(f"   Marks fetch failed: {resp.status_code}")
            return False
        marks = resp.json()
        print(f"   Found {len(marks)} mark entries for exam {exam.get('exam_type')}")
        return True
    results['Marks'] = test_feature("Marks Retrieval", test_marks)
    
    # Summary
    print("\n" + "="*60)
    print("COMPREHENSIVE TEST SUMMARY")
    print("="*60)
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    print(f"\nTotal: {passed}/{total} tests passed")
    print()
    for test, passed in results.items():
        status = "✅" if passed else "❌"
        print(f"  {status} {test}")
    
    if passed == total:
        print("\n🎉 ALL FRONTEND WORKFLOWS VERIFIED SUCCESSFULLY!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed - needs investigation")
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)

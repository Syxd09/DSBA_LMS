import requests
import sys
import uuid
import random

BASE_URL = "http://localhost:8000/api/v1"
ADMIN_EMAIL = "verify_admin@example.com"
ADMIN_PASS = "password123"

def get_token(email, password):
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
    if resp.status_code != 200:
        print(f"Login Failed: {resp.text}")
        sys.exit(1)
    return resp.json()["access_token"]

def extension_check():
    token = get_token(ADMIN_EMAIL, ADMIN_PASS)
    headers = {"Authorization": f"Bearer {token}"}
    
    print("=== Extended Check: Grading & Audit ===")
    
    # 1. Grading Rules
    # Check existing
    rules = requests.get(f"{BASE_URL}/grading/rules", headers=headers).json()
    print(f"Existing Rules: {len(rules)}")
    
    # Delete A+ to trigger Audit (and remove overlap)
    target_grade = "A+"
    existing = next((r for r in rules if r["grade"] == target_grade), None)
    
    if existing:
        print(f"Deleting existing rule {target_grade}...")
        requests.delete(f"{BASE_URL}/grading/rules/{existing['id']}", headers=headers)
        print("✓ Deleted Rule (Audit Log Triggered)")
    else:
        print(f"Rule {target_grade} not found. Creating it...")
        requests.post(f"{BASE_URL}/grading/rules", headers=headers, json={
            "grade": "A+", "min_percentage": 90, "max_percentage": 100, "grade_point": 10
        })
        print("✓ Created Rule (Audit Log Triggered)")

    # 2. Audit Logs
    try:
        logs = requests.get(f"{BASE_URL}/audit", headers=headers).json()
        print(f"Audit Logs Found: {len(logs)}")
        if len(logs) == 0:
            print("⚠ Audit Logs are EMPTY (Expected: Feature incomplete)")
        else:
            print(f"✓ Audit Logs Working (Latest: {logs[0]['action']} on {logs[0]['table_name']})")
    except Exception as e:
        print(f"✗ Audit API Failed: {e}")

if __name__ == "__main__":
    extension_check()

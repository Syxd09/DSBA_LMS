import pytest
from playwright.sync_api import sync_playwright, expect
from sqlalchemy import text
from app.database import SessionLocal
from app.core.security import get_password_hash
from uuid import uuid4
from datetime import datetime

# Fixtures must remain as is, but we can access DB synchronously (SessionLocal is sync).
# But e2e_user was module scoped?
# fixtures can be same.

@pytest.fixture(scope="module")
def e2e_user():
    """Create a temporary user for E2E tests."""
    db = SessionLocal()
    email = f"e2e_{uuid4().hex[:6]}@test.com"
    password = "password123"
    
    try:
        # Create Profile
        user_id = uuid4()
        now = datetime.utcnow()
        db.execute(
            text("INSERT INTO profiles (id, user_id, email, full_name, password_hash, created_at, updated_at) VALUES (:id, :uid, :email, :name, :pwd, :now, :now)"),
            {
                "id": uuid4(),
                "uid": user_id,
                "email": email,
                "name": "E2E Test User",
                "pwd": get_password_hash(password),
                "now": now
            }
        )
        # Create Role (Student)
        db.execute(
            text("INSERT INTO user_roles (id, user_id, role) VALUES (:id, :uid, 'STUDENT')"),
            {"id": uuid4(), "uid": user_id}
        )
        db.commit()
        yield {"email": email, "password": password}
    except Exception as e:
        print(f"Error in e2e_user fixture: {e}")
        db.rollback()
        raise
    finally:
        # Cleanup
        try:
            db.execute(text("DELETE FROM profiles WHERE email = :email"), {"email": email})
            db.commit()
        except:
            db.rollback()
        db.close()

@pytest.fixture
def setup_teacher(e2e_user):
    """Setup teacher user (reusing e2e_user for simplicity but changing role)."""
    db = SessionLocal()
    email = e2e_user["email"]
    try:
        # Update connection to teacher role
        # Find user_id
        res = db.execute(text("SELECT user_id FROM profiles WHERE email = :email"), {"email": email}).first()
        uid = res[0]
        
        # Update role to teacher
        db.execute(text("UPDATE user_roles SET role = 'TEACHER' WHERE user_id = :uid"), {"uid": uid})
        db.commit()
        yield e2e_user
    except Exception:
        db.rollback()
        raise
    finally:
        # Revert/Close
        db.close()

def test_login_flow(e2e_user):
    """Test complete login flow (Sync)."""
    print("\n[DEBUG] Starting Login Flow (Sync)")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        try:
            # 1. Navigate to Login
            print("[DEBUG] Navigating to /auth")
            page.goto("http://127.0.0.1:5173/auth", timeout=5000)
            
            print("[DEBUG] Page loaded. Filling form.")
            
            # 2. Fill Form
            page.fill("#signin-email", e2e_user["email"])
            page.fill("#signin-password", e2e_user["password"])
            
            # 3. Submit
            print("[DEBUG] Submitting form")
            page.click("button[type=submit]")
            
            # 4. Verify Redirect to Dashboard
            print("[DEBUG] Waiting for dashboard redirect")
            expect(page).to_have_url("http://127.0.0.1:5173/dashboard", timeout=5000)
            
            # 5. Verify Content
            print("[DEBUG] Verifying dashboard content")
            # Use specific selector to avoid ambiguity
            expect(page.get_by_role("link", name="Dashboard")).to_be_visible(timeout=5000)
            
            print("[DEBUG] Login Flow Success")
        except Exception as e:
            print(f"[DEBUG] Test failed: {e}")
            raise
        finally:
            browser.close()

def test_marks_entry_ui(setup_teacher):
    """Test marks entry UI flow (Sync)."""
    user = setup_teacher
    print("\n[DEBUG] Starting Marks Entry Test (Sync)")
    
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        page = context.new_page()

        try:
            # 1. Login
            print("[DEBUG] Navigating to /auth")
            page.goto("http://127.0.0.1:5173/auth", timeout=5000)
            print("[DEBUG] Filling login form")
            page.fill("#signin-email", user["email"])
            page.fill("#signin-password", user["password"])
            page.click("button[type=submit]")
            
            # 2. Wait for Dash
            print("[DEBUG] Waiting for dashboard")
            expect(page).to_have_url("http://127.0.0.1:5173/dashboard", timeout=5000)
            
            # 3. Verify Teacher Menu
            print("[DEBUG] Verifying teacher dashboard")
            # Verify Teacher Dashboard Heading
            expect(page.get_by_role("heading", name="Teacher Dashboard")).to_be_visible(timeout=5000)
            
            # 4. Success
            print("[DEBUG] Marks Entry Test Success")
        
        except Exception as e:
            print(f"[DEBUG] Test failed: {e}")
            raise
        finally:
            browser.close()

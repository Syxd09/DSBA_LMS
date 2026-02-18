
import sys
import os
from pathlib import Path
from sqlalchemy import text

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.database import SessionLocal
from app.api.v1.reporting import router as reporting_router

def verify_reporting():
    db = SessionLocal()
    try:
        print("--- Verifying Reporting Engine ---")
        # 1. Check if we have any offerings
        offering_id = db.execute(text("SELECT id FROM subject_offerings LIMIT 1")).scalar()
        
        if not offering_id:
            print("⚠️ No subject offerings found. Skipping PDF generation test.")
        else:
            print(f"✅ Found offering_id: {offering_id}")
            # We can't easily call the API endpoint function directly without a Request object and auth
            # But we can import the function and check if it exists/imports correctly
            from app.api.v1.reporting import download_course_file
            print("✅ download_course_file function imported successfully.")

        # 2. Check Accreditation Endpoint
        print("\n--- Verifying Accreditation Analytics ---")
        from app.api.v1.analytics.role_scoped import get_principal_accreditation_readiness
        print("✅ get_principal_accreditation_readiness function imported successfully.")
        
        # 3. Check PDF Library
        try:
            import reportlab
            print(f"✅ ReportLab installed: {reportlab.__version__}")
        except ImportError:
            print("❌ ReportLab NOT installed.")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_reporting()

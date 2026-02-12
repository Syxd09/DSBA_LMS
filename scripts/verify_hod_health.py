
import asyncio
import sys
import os

# Add updated path to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database import SessionLocal
from app.services.analytics.role_scoped import HODAnalyticsService
from app.models import Department, UserRole, Profile

async def verify_hod_health():
    db = SessionLocal()
    try:
        # 1. Find a department (CSE)
        dept = db.query(Department).filter(Department.code == "CSE").first()
        if not dept:
            print("❌ CSE Department not found")
            return

        print(f"✅ Found Department: {dept.name} ({dept.id})")

        # 2. Call get_department_health
        response = await HODAnalyticsService.get_department_health(db, dept.id)
        
        # 3. Check subject_stats for offering_id
        subject_stats = response.data.get("subject_stats", [])
        if not subject_stats:
            print("⚠️ No subject stats found (possibly no locked exams)")
            return

        print(f"✅ Found {len(subject_stats)} subject stats entries")
        
        found_offering_id = False
        for stat in subject_stats:
            offering_id = stat.get("offering_id")
            subject_name = stat.get("subject_name")
            if offering_id:
                print(f"✅ [PASS] Found offering_id: {offering_id} for {subject_name}")
                found_offering_id = True
            else:
                print(f"❌ [FAIL] Missing offering_id for {subject_name}")
        
        if found_offering_id:
            print("\n🎉 Verification Successful: offering_id is present in HOD health stats")
        else:
            print("\n❌ Verification Failed: No offering_id found")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(verify_hod_health())

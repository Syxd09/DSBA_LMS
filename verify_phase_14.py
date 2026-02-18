
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

def verify_compliance():
    print("--- Verifying Compliance (Soft Deletes) ---")
    from app.models.academic import Subject
    from sqlalchemy import Column, Boolean
    
    # 1. Check Model
    is_active_attr = getattr(Subject, 'is_active', None)
    if is_active_attr is not None:
        print("✅ Subject model has is_active column.")
    else:
        print("❌ Subject model missing is_active column.")
        
    # 2. Check API
    with open("backend/app/api/v1/subjects.py", "r") as f:
        content = f.read()
        if "is_active = False" in content and "AuditLog" in content and "DEACTIVATE" in content:
            print("✅ Subject API implements soft-delete with audit logging.")
        else:
            print("❌ Subject API soft-delete logic not found.")

def verify_operational():
    print("\n--- Verifying Operational (XLSX Import) ---")
    with open("backend/app/api/v1/marks.py", "r") as f:
        content = f.read()
        if "filename.endswith('.xlsx')" in content and "load_workbook" in content:
            print("✅ Marks API supports XLSX import via openpyxl.")
        else:
            print("❌ Marks API missing XLSX import logic.")

def verify_performance():
    print("\n--- Verifying Performance (Async Promotion) ---")
    with open("backend/app/api/v1/promotions.py", "r") as f:
        content = f.read()
        if "background_tasks: BackgroundTasks" in content and "execute_promotion_bg" in content:
            print("✅ Semester Promotion API uses BackgroundTasks.")
        if "SessionLocal()" in content:
             print("✅ Background task uses isolated SessionLocal.")
        else:
            print("❌ Async promotion logic incomplete.")

if __name__ == "__main__":
    try:
        verify_compliance()
        verify_operational()
        verify_performance()
        print("\n--- STATIC VERIFICATION COMPLETE ---")
    except Exception as e:
        print(f"Error during verification: {e}")

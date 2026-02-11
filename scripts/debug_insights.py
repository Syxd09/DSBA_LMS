import sys
import os
import asyncio

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database import SessionLocal
from app.models import Student
from app.services.insights import get_student_insights

async def main():
    db = SessionLocal()
    try:
        # Get a random student
        student = db.query(Student).first()
        if not student:
            print("No students found in DB")
            return

        print(f"Testing insights for student: {student.usn}")
        
        # Call the function
        insights = await get_student_insights(db, student.usn)
        print("Success!")
        print(insights)
    except Exception as e:
        print("Caught exception:")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())

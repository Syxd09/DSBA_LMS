"""
EduMetrics Backend - Enrollments Router
Student enrollment management endpoints (Refactored to use Student model)
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
import uuid as uuid_lib
import csv
import io

from app.database import get_db
from app.api.deps import require_authenticated, require_hod_or_above
from app.models import Profile, Student, Cohort, Section, UserRole
from app.schemas import StudentCreate, StudentResponse, StudentUpdate
from app.core.security import get_password_hash
from app.core.permissions import AppRole

router = APIRouter(prefix="/enrollments", tags=["Enrollments"])


@router.get("", response_model=List[StudentResponse])
async def list_enrollments(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated),
    cohort_id: Optional[UUID] = None,
    usn: Optional[str] = None
):
    """List student enrollments (Students)."""
    query = db.query(Student).options(
        joinedload(Student.cohort),
        joinedload(Student.section)
    )
    
    # FILTER: Scoping for HOD
    from app.models import UserRole, Department, Program, Cohort
    from app.core.permissions import AppRole
    
    user_role_obj = db.query(UserRole).filter(UserRole.user_id == current_user.user_id).first()
    if user_role_obj and user_role_obj.role == AppRole.HOD:
        # Get HOD's department
        hod_dept = db.query(Department).filter(Department.hod_id == current_user.user_id).first()
        if hod_dept:
            # Get all cohorts for this department
            programs = db.query(Program).filter(Program.department_id == hod_dept.id).all()
            program_ids = [p.id for p in programs]
            cohorts = db.query(Cohort).filter(Cohort.program_id.in_(program_ids)).all() if program_ids else []
            cohort_ids = [c.id for c in cohorts]
            
            # Apply filter
            if cohort_ids:
                query = query.filter(Student.cohort_id.in_(cohort_ids))
            else:
                # No cohorts = no students
                return []
        else:
            # HOD with no department = see nothing
            return []

    if cohort_id:
        query = query.filter(Student.cohort_id == cohort_id)
    if usn:
        query = query.filter(Student.usn == usn)
    
    # Sort by USN
    students = query.order_by(Student.usn).all()
    return students


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_enrollment(
    student_in: StudentCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Create a new student (enrollment)."""
    # Check cohort exists with Department info (Eager Load)
    from app.models import Program, Department
    cohort = db.query(Cohort).options(
        joinedload(Cohort.program).joinedload(Program.department)
    ).filter(Cohort.id == student_in.cohort_id).first()
    
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    
    # Check for duplicate USN
    existing = db.query(Student).filter(Student.usn == student_in.usn).first()
    if existing:
        raise HTTPException(status_code=409, detail="Student with this USN already exists")
    
    
    # Check if email exists in Profile (User Login)
    final_email = student_in.email
    if not final_email:
        final_email = f"{student_in.usn.lower()}@outcome.edu"
        
    existing_user = db.query(Profile).filter(Profile.email == final_email).first()
    if existing_user:
        # If user exists, linking logic or fail. Fails for safety.
        raise HTTPException(status_code=409, detail=f"User with email {final_email} already exists")

    # Determine Department Name
    department_name = None
    if cohort.program and cohort.program.department:
        department_name = cohort.program.department.name

    # Create User login (Profile + Role)
    user_id = uuid_lib.uuid4()
    
    # Create Profile
    new_profile = Profile(
        id=uuid_lib.uuid4(),
        user_id=user_id,
        email=final_email,
        full_name=student_in.name,
        department=department_name,  # FIX: Set Department
        password_hash=get_password_hash(student_in.usn) # Default password is USN
    )
    db.add(new_profile)
    
    # Create Role
    new_role = UserRole(
        id=uuid_lib.uuid4(),
        user_id=user_id,
        role=AppRole.STUDENT
    )
    db.add(new_role)
    
    new_student = Student(
        usn=student_in.usn,
        name=student_in.name,
        email=final_email,
        cohort_id=student_in.cohort_id,
        section_id=student_in.section_id,
        admission_semester=student_in.admission_semester,
        status=student_in.status,
        user_id=user_id # Link to login
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student


@router.get("/{usn}", response_model=StudentResponse)
async def get_enrollment(
    usn: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_authenticated)
):
    """Get student by USN."""
    student = db.query(Student).filter(Student.usn == usn).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.put("/{usn}", response_model=StudentResponse)
async def update_enrollment(
    usn: str,
    student_in: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """Update student details."""
    student = db.query(Student).filter(Student.usn == usn).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if student_in.name is not None:
        student.name = student_in.name
    if student_in.email is not None:
        student.email = student_in.email
    if student_in.cohort_id is not None:
        student.cohort_id = student_in.cohort_id
    if student_in.section_id is not None:
        student.section_id = student_in.section_id
    if student_in.admission_semester is not None:
        student.admission_semester = student_in.admission_semester
    if student_in.status is not None:
        student.status = student_in.status
        
    db.commit()
    db.refresh(student)
    return student


@router.delete("/{usn}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_enrollment(
    usn: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Delete student and their associated login (Profile + UserRole).
    
    This ensures no orphan user accounts remain after student deletion.
    """
    student = db.query(Student).filter(Student.usn == usn).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # FIX: Cascade delete Profile and UserRole to avoid orphan accounts
    if student.user_id:
        # Delete UserRole first (FK to Profile.user_id)
        db.query(UserRole).filter(UserRole.user_id == student.user_id).delete()
        # Delete Profile
        db.query(Profile).filter(Profile.user_id == student.user_id).delete()
    
    # Delete Student (marks cascade via ORM relationship)
    db.delete(student)
    db.commit()



@router.post("/bulk-upload", status_code=status.HTTP_200_OK)
async def bulk_upload_enrollments(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above)
):
    """
    Bulk upload students via CSV.
    Expected columns: usn, name, email, cohort_name, section_name, admission_semester, status
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV file.")
    
    import csv
    import io
    
    content = await file.read()
    try:
        decoded = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(decoded))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read CSV: {str(e)}")
    
    # Cache cohorts and sections to minimize DB queries
    from app.models import Program, Department
    
    # Eager load Program -> Department for "super fast" processing
    cohorts_query = db.query(Cohort).options(
        joinedload(Cohort.program).joinedload(Program.department)
    ).all()
    
    cohorts = {c.name.strip().lower(): c for c in cohorts_query}
    
    # Sections need to be mapped by cohort_id -> name -> section
    sections_map = {} # {cohort_id: {'A': SectionObj, 'B': SectionObj}}
    all_sections = db.query(Section).all()
    for s in all_sections:
        if s.cohort_id not in sections_map:
            sections_map[s.cohort_id] = {}
        sections_map[s.cohort_id][s.name.strip().lower()] = s
    
    results = {
        "success_count": 0,
        "errors": []
    }
    
    students_to_add = []
    profiles_to_add = []
    roles_to_add = []
    
    # Pre-fetch existing emails to avoid conflicts
    existing_emails = set(e[0] for e in db.query(Profile.email).all())
    
    for row_idx, row in enumerate(csv_reader, start=1):
        # Normalize keys (strip spaces, lowercase)
        row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
        
        # Validation: Required fields
        usn = row.get('usn')
        name = row.get('name')
        cohort_name_raw = row.get('cohort_name') or row.get('cohort')
        
        if not usn or not name or not cohort_name_raw:
            results["errors"].append(f"Row {row_idx}: Missing required fields (usn, name, cohort_name)")
            continue
            
        # Check existing USN (check local list first to avoid duplicates in same file)
        if any(s.usn == usn for s in students_to_add):
            results["errors"].append(f"Row {row_idx}: Duplicate USN in file ({usn})")
            continue
            
        existing_student = db.query(Student).filter(Student.usn == usn).first()
        if existing_student:
             results["errors"].append(f"Row {row_idx}: Student already exists ({usn})")
             continue
             
        # Resolve Cohort
        cohort_name = cohort_name_raw.strip().lower()
        cohort = cohorts.get(cohort_name)
        if not cohort:
            results["errors"].append(f"Row {row_idx}: Cohort not found ({cohort_name_raw})")
            continue
            
        # Resolve Section (Optional)
        section_name_raw = row.get('section_name') or row.get('section')
        section_id = None
        if section_name_raw:
            section_name = section_name_raw.strip().lower()
            cohort_sections = sections_map.get(cohort.id, {})
            section = cohort_sections.get(section_name)
            if section:
                section_id = section.id
            else:
                results["errors"].append(f"Row {row_idx}: Section '{section_name_raw}' not found in cohort '{cohort_name_raw}'")
                continue
        
        # Determine Email
        email = row.get('email')
        if not email:
            email = f"{usn.lower()}@outcome.edu"
            
        if email in existing_emails:
            results["errors"].append(f"Row {row_idx}: User/Email already exists ({email})")
            continue
        
        # Add to local cache to prevent duplicates in same file
        existing_emails.add(email)
        
        # Determine Department Name
        department_name = None
        if cohort.program and cohort.program.department:
            department_name = cohort.program.department.name

        # Create Student Object & Login
        try:
            user_id = uuid_lib.uuid4()
            
            # Profile
            new_profile = Profile(
                id=uuid_lib.uuid4(),
                user_id=user_id,
                email=email,
                full_name=name,
                department=department_name, # FIX: Set Department
                password_hash=get_password_hash(usn) # Default password is USN
            )
            profiles_to_add.append(new_profile)
            
            # Role
            new_role = UserRole(
                id=uuid_lib.uuid4(),
                user_id=user_id,
                role=AppRole.STUDENT
            )
            roles_to_add.append(new_role)
            
            # Student
            new_student = Student(
                usn=usn,
                name=name,
                email=email,
                cohort_id=cohort.id,
                section_id=section_id,
                admission_semester=int(row.get('admission_semester', 1)),
                status=row.get('status', 'active'),
                user_id=user_id # Link to login
            )
            students_to_add.append(new_student)
            
        except ValueError:
             results["errors"].append(f"Row {row_idx}: Invalid data format")
             continue

    # Batch Insert
    if students_to_add:
        try:
            # Add all objects
            db.add_all(profiles_to_add)
            db.add_all(roles_to_add)
            db.add_all(students_to_add)
            
            db.commit()
            results["success_count"] = len(students_to_add)
        except Exception as e:
            db.rollback()
            results["errors"].append(f"Batch Insert Failed: {str(e)}")
            results["success_count"] = 0
            
    return results

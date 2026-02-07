#!/usr/bin/env python3
"""
EduMetrics - Database Seeding & Pilot Data Entry Script

This script seeds all reference data and creates pilot data for one department.

Usage:
    cd backend
    python seed_pilot_data.py

Contents:
1. Bloom Taxonomy (6 levels)
2. Pilot Department (CSE)
3. Pilot Program (B.Tech CSE)
4. Program Outcomes (6 POs)
5. Pilot Cohort (2023-27)
6. Pilot Subjects (1 core subject with 3 COs)
7. CO-PO Mappings
8. Pilot Students (5)
9. Internal Exam with Questions
10. Pilot Marks
"""
import os
import sys
import uuid
from datetime import datetime
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import engine, SessionLocal
from app.models import (
    Department, Program, Cohort, Subject, Student,
    SubjectOffering, Profile, UserRole, Bloom, BLOOM_SEED_DATA
)
from app.models.exam import Exam, ExamSection, Question, SubQuestion
from app.models.marks import StudentQuestionMark
from app.models.outcomes import CourseOutcome, ProgramOutcome, COPOMapping
from app.core.permissions import AppRole

def seed_bloom_taxonomy(db):
    """Seed Bloom's Taxonomy levels."""
    print("  Seeding Bloom Taxonomy...")
    
    existing = db.query(Bloom).count()
    if existing > 0:
        print(f"    → Already has {existing} levels, skipping")
        return
    
    for level_data in BLOOM_SEED_DATA:
        bloom = Bloom(
            id=uuid.uuid4(),
            level_order=level_data["level_order"],
            level_name=level_data["level_name"],
            version=level_data.get("version", "revised")
        )
        db.add(bloom)
    
    db.commit()
    print(f"    ✓ Seeded {len(BLOOM_SEED_DATA)} Bloom levels")

def seed_pilot_users(db):
    """Seed pilot users (HOD, Teacher)."""
    print("  Seeding Pilot Users...")
    
    users = []
    
    # Principal
    principal_id = uuid.uuid4()
    principal = Profile(
        id=uuid.uuid4(),
        user_id=principal_id,
        email="principal@pilot.edu",
        full_name="Pilot Principal"
    )
    db.add(principal)
    principal_role = UserRole(id=uuid.uuid4(), user_id=principal_id, role=AppRole.PRINCIPAL)
    db.add(principal_role)
    users.append(("principal", principal_id))
    
    # HOD
    hod_id = uuid.uuid4()
    hod = Profile(
        id=uuid.uuid4(),
        user_id=hod_id,
        email="hod.cse@pilot.edu",
        full_name="Pilot HOD CSE"
    )
    db.add(hod)
    hod_role = UserRole(id=uuid.uuid4(), user_id=hod_id, role=AppRole.HOD)
    db.add(hod_role)
    users.append(("hod", hod_id))
    
    # Teacher
    teacher_id = uuid.uuid4()
    teacher = Profile(
        id=uuid.uuid4(),
        user_id=teacher_id,
        email="teacher.ds@pilot.edu",
        full_name="Pilot DS Teacher"
    )
    db.add(teacher)
    teacher_role = UserRole(id=uuid.uuid4(), user_id=teacher_id, role=AppRole.TEACHER)
    db.add(teacher_role)
    users.append(("teacher", teacher_id))
    
    db.commit()
    print(f"    ✓ Created {len(users)} users")
    return dict(users)

def seed_pilot_department(db):
    """Seed pilot department."""
    print("  Seeding Department...")
    
    existing = db.query(Department).filter(Department.name == "Computer Science & Engineering").first()
    if existing:
        print(f"    → CSE department exists, reusing")
        return existing.id
    
    dept = Department(
        id=uuid.uuid4(),
        code="CSE",
        name="Computer Science & Engineering"
    )
    db.add(dept)
    db.commit()
    print(f"    ✓ Created department: CSE")
    return dept.id

def seed_pilot_program(db, dept_id):
    """Seed pilot program with POs."""
    print("  Seeding Program...")
    
    # Check if program exists
    existing = db.query(Program).filter(Program.code == "BTECH-CSE").first()
    if existing:
        print(f"    → BTECH-CSE program exists, checking POs...")
        po_count = db.query(ProgramOutcome).filter(ProgramOutcome.program_id == existing.id).count()
        if po_count >= 6:
            print(f"    → {po_count} POs exist, reusing")
            po_ids = [po.id for po in db.query(ProgramOutcome).filter(ProgramOutcome.program_id == existing.id).order_by(ProgramOutcome.po_number).all()]
            return existing.id, po_ids
        # Need to create POs
        program_id = existing.id
    else:
        program_id = uuid.uuid4()
        program = Program(
            id=program_id,
            department_id=dept_id,
            code="BTECH-CSE",
            name="Bachelor of Technology - Computer Science",
            duration_years=4,
            duration_semesters=8
        )
        db.add(program)
    
    # Create 6 Program Outcomes
    print("  Seeding Program Outcomes...")
    po_ids = []
    po_descriptions = [
        "Engineering Knowledge: Apply knowledge of mathematics, science, and engineering fundamentals",
        "Problem Analysis: Identify, formulate, and analyze complex engineering problems",
        "Design Solutions: Design solutions for complex engineering problems meeting specified needs",
        "Investigation: Conduct investigations using research-based knowledge and methods",
        "Modern Tool Usage: Create, select and apply appropriate techniques and modern tools",
        "Ethics: Apply ethical principles and commit to professional ethics and responsibilities"
    ]
    
    for i, desc in enumerate(po_descriptions, 1):
        po = ProgramOutcome(
            id=uuid.uuid4(),
            program_id=program_id,
            po_code=f"PO{i}",
            po_number=i,
            description=desc,
            threshold=Decimal("60.00")
        )
        db.add(po)
        po_ids.append(po.id)
    
    db.commit()
    print(f"    ✓ Created program with 6 POs")
    return program_id, po_ids

def seed_pilot_cohort(db, program_id):
    """Seed pilot cohort (batch)."""
    print("  Seeding Cohort (Batch 2023-27)...")
    
    cohort = Cohort(
        id=uuid.uuid4(),
        program_id=program_id,
        year=2023,
        name="2023-27 CSE",
        current_semester=2
    )
    db.add(cohort)
    db.commit()
    print(f"    ✓ Created cohort: 2023-27, Sem 2")
    return cohort.id

def seed_pilot_subject(db, program_id, cohort_id):
    """Seed pilot subject with COs."""
    print("  Seeding Subject: Data Structures...")
    
    # Create Subject
    subject = Subject(
        id=uuid.uuid4(),
        name="Data Structures",
        code="CS201",
        credits=4
    )
    db.add(subject)
    
    # Create Offering
    offering_id = uuid.uuid4()
    offering = SubjectOffering(
        id=offering_id,
        subject_id=subject.id,
        program_id=program_id,
        cohort_id=cohort_id,
        semester_no=2,
        regulation_year=2023
    )
    db.add(offering)
    
    # Create 3 Course Outcomes
    print("  Seeding Course Outcomes...")
    co_ids = []
    co_descriptions = [
        "Understand and implement basic data structures like arrays, linked lists, stacks, and queues",
        "Analyze time and space complexity of algorithms",
        "Design and implement tree and graph based data structures"
    ]
    
    for i, desc in enumerate(co_descriptions, 1):
        co = CourseOutcome(
            id=uuid.uuid4(),
            offering_id=offering_id,
            co_code=f"CO{i}",
            co_number=i,
            description=desc,
            threshold=Decimal("60.00")
        )
        db.add(co)
        co_ids.append(co.id)
    
    db.commit()
    print(f"    ✓ Created subject with 3 COs")
    return subject.id, offering_id, co_ids

def seed_co_po_mappings(db, co_ids, po_ids):
    """Seed CO-PO correlation mappings."""
    print("  Seeding CO-PO Mappings...")
    
    # Mapping matrix: (CO index, PO index, correlation level 1-3)
    # 1=Low, 2=Medium, 3=High
    mappings = [
        # CO1: Basic DS → PO1(H), PO2(M), PO5(L)
        (0, 0, 3), (0, 1, 2), (0, 4, 1),
        # CO2: Complexity Analysis → PO1(H), PO2(H), PO3(M)
        (1, 0, 3), (1, 1, 3), (1, 2, 2),
        # CO3: Trees/Graphs → PO2(H), PO3(H), PO4(M), PO5(H)
        (2, 1, 3), (2, 2, 3), (2, 3, 2), (2, 4, 3),
    ]
    
    for co_idx, po_idx, level in mappings:
        mapping = COPOMapping(
            id=uuid.uuid4(),
            co_id=co_ids[co_idx],
            po_id=po_ids[po_idx],
            correlation_level=level
        )
        db.add(mapping)
    
    db.commit()
    print(f"    ✓ Created {len(mappings)} CO-PO mappings")

def seed_pilot_students(db, cohort_id):
    """Seed pilot students."""
    print("  Seeding Students...")
    
    students = []
    for i in range(1, 6):
        usn = f"1PI23CS00{i}"
        
        # Check if student exists
        existing = db.query(Student).filter(Student.usn == usn).first()
        if existing:
            print(f"    → Student {usn} exists, skipping")
            students.append(usn)
            continue
            
        student = Student(
            usn=usn,
            name=f"Student {i}",
            email=f"student{i}@pilot.edu",
            cohort_id=cohort_id,
            status="active"
        )
        db.add(student)
        students.append(usn)
    
    db.commit()
    print(f"    ✓ Created {len(students)} students")
    return students

def seed_pilot_exam(db, offering_id, cohort_id, teacher_id, co_ids):
    """Seed pilot internal exam with questions."""
    print("  Seeding Internal Exam...")
    
    exam = Exam(
        id=uuid.uuid4(),
        offering_id=offering_id,
        cohort_id=cohort_id,
        exam_type="INT1",
        max_marks=40,
        status="approved",
        teacher_id=teacher_id
    )
    db.add(exam)
    
    # Section A: 6 questions x 2 marks, answer 4 (Best-N)
    section_a = ExamSection(
        id=uuid.uuid4(),
        exam_id=exam.id,
        name="Section A",
        sequence=1,
        max_questions=6,
        required_questions=4,
        selection_mode="BEST_N",
        max_marks=8,
        marks_per_question=2
    )
    db.add(section_a)
    
    sq_ids = []
    for i in range(1, 7):
        q = Question(
            id=uuid.uuid4(),
            section_id=section_a.id,
            sequence=i,
            max_marks=2,
            co_id=co_ids[(i-1) % 3]
        )
        db.add(q)
        
        sq = SubQuestion(
            id=uuid.uuid4(),
            question_id=q.id,
            label="a",
            max_marks=2,
            co_id=co_ids[(i-1) % 3]
        )
        db.add(sq)
        sq_ids.append(sq.id)
    
    # Section B: 6 questions x 8 marks, answer 4 (Best-N)
    section_b = ExamSection(
        id=uuid.uuid4(),
        exam_id=exam.id,
        name="Section B",
        sequence=2,
        max_questions=6,
        required_questions=4,
        selection_mode="BEST_N",
        max_marks=32,
        marks_per_question=8
    )
    db.add(section_b)
    
    for i in range(1, 7):
        q = Question(
            id=uuid.uuid4(),
            section_id=section_b.id,
            sequence=i,
            max_marks=8,
            co_id=co_ids[(i-1) % 3]
        )
        db.add(q)
        
        sq = SubQuestion(
            id=uuid.uuid4(),
            question_id=q.id,
            label="a",
            max_marks=8,
            co_id=co_ids[(i-1) % 3]
        )
        db.add(sq)
        sq_ids.append(sq.id)
    
    db.commit()
    print(f"    ✓ Created exam with 12 questions (6+6)")
    return exam.id, sq_ids

def seed_pilot_marks(db, exam_id, student_usns, sq_ids, teacher_id):
    """Seed pilot marks for all students."""
    print("  Seeding Marks...")
    
    # Marks matrix: 5 students x 12 sub-questions
    # Section A: 6 x 2 marks, Section B: 6 x 8 marks
    # Scores designed to test Best-N selection
    marks_data = [
        # Student 1: Total ~35/40
        [2, 2, 1.5, 2, 1, 1, 8, 7, 6, 7, 0.5, 0],
        # Student 2: Total ~32/40
        [2, 1.5, 2, 2, 1, 0.5, 6, 8, 6, 4, 0, 0],
        # Student 3: Total ~28/40
        [1.5, 2, 2, 1, 0.5, 0, 6, 6, 5, 5, 0, 0],
        # Student 4: Total ~25/40
        [1, 1, 1.5, 2, 0.5, 0, 5, 6, 5, 4, 0, 0],
        # Student 5: Total ~38/40
        [2, 2, 2, 2, 2, 1, 8, 8, 7, 7, 0, 0],
    ]
    
    count = 0
    for s_idx, usn in enumerate(student_usns):
        for q_idx, sq_id in enumerate(sq_ids):
            mark = StudentQuestionMark(
                id=uuid.uuid4(),
                exam_id=exam_id,
                usn=usn,
                sub_question_id=sq_id,
                marks=Decimal(str(marks_data[s_idx][q_idx])),
                entered_by=teacher_id
            )
            db.add(mark)
            count += 1
    
    db.commit()
    print(f"    ✓ Entered {count} marks (5 students × 12 questions)")

def main():
    """Run complete seeding."""
    print("\n" + "="*60)
    print("DATABASE SEEDING & PILOT DATA ENTRY")
    print("="*60 + "\n")
    
    db = SessionLocal()
    
    try:
        # 1. Bloom Taxonomy
        seed_bloom_taxonomy(db)
        
        # 2. Pilot Users
        users = seed_pilot_users(db)
        
        # 3. Department
        dept_id = seed_pilot_department(db)
        
        # 4. Program with POs
        program_id, po_ids = seed_pilot_program(db, dept_id)
        
        # 5. Cohort
        cohort_id = seed_pilot_cohort(db, program_id)
        
        # 6. Subject with COs
        subject_id, offering_id, co_ids = seed_pilot_subject(db, program_id, cohort_id)
        
        # 7. CO-PO Mappings
        seed_co_po_mappings(db, co_ids, po_ids)
        
        # 8. Students
        student_usns = seed_pilot_students(db, cohort_id)
        
        # 9. Exam with Questions
        exam_id, sq_ids = seed_pilot_exam(db, offering_id, cohort_id, users["teacher"], co_ids)
        
        # 10. Marks
        seed_pilot_marks(db, exam_id, student_usns, sq_ids, users["teacher"])
        
        print("\n" + "-"*60)
        print("✅ SEEDING COMPLETE")
        print("-"*60)
        print(f"""
Summary:
  • Bloom Taxonomy: 6 levels
  • Department: CSE
  • Program: B.Tech CSE with 6 POs
  • Cohort: 2023-27, Semester 2
  • Subject: Data Structures (CS201) with 3 COs
  • CO-PO Mappings: 10
  • Students: 5
  • Exam: INT1 with 12 questions
  • Marks: 60 entries
""")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ SEEDING FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        db.close()
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

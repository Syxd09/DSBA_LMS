"""
EduMetrics Backend - RBAC Scope Resolution
Determines resource access scope based on user role and context.

NOTE: This module enforces scope-based access at the API boundary.
Phase-2A/2B computation logic remains untouched.
"""
from enum import Enum
from typing import List, Optional, Set
from uuid import UUID
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.permissions import AppRole
from app.models import (
    Profile, Department, Program, Cohort,
    TeacherAssignment, StudentEnrollment, Student, College
)


class ScopeType(str, Enum):
    """Types of access scope."""
    ALL = "all"              # No restriction (Super Admin)
    COLLEGE = "college"      # Specific college(s) (Principal) - NEW for multi-tenancy
    DEPARTMENT = "department"  # User's department (HOD)
    COHORT = "cohort"        # Assigned cohorts (Teacher)
    SUBJECT = "subject"      # Assigned subjects (Teacher)
    OFFERING = "offering"    # Subject offerings (Teacher)
    OWN = "own"              # Own data only (Student)


@dataclass
class AccessScope:
    """
    Represents the accessible scope for a user.
    
    If a field is None, it means no restriction on that dimension.
    If a field is an empty list, it means no access.
    """
    scope_type: ScopeType
    college_ids: Optional[List[UUID]] = None  # NEW: Multi-tenancy support
    department_ids: Optional[List[UUID]] = None
    program_ids: Optional[List[UUID]] = None
    cohort_ids: Optional[List[UUID]] = None
    subject_ids: Optional[List[UUID]] = None
    offering_ids: Optional[List[UUID]] = None
    student_usns: Optional[List[str]] = None
    
    @property
    def is_unrestricted(self) -> bool:
        """Check if scope is unrestricted (Principal)."""
        return self.scope_type == ScopeType.ALL
    
    def can_access_college(self, college_id: UUID) -> bool:
        """Check if user can access a college."""
        if self.is_unrestricted:
            return True
        if self.college_ids is None:
            return True
        return college_id in self.college_ids
    
    def can_access_department(self, dept_id: UUID) -> bool:
        """Check if user can access a department."""
        if self.is_unrestricted:
            return True
        if self.department_ids is None:
            return True
        return dept_id in self.department_ids
    
    def can_access_cohort(self, cohort_id: UUID) -> bool:
        """Check if user can access a cohort."""
        if self.is_unrestricted:
            return True
        if self.cohort_ids is None:
            return True
        return cohort_id in self.cohort_ids
    
    def can_access_offering(self, offering_id: UUID) -> bool:
        """Check if user can access a subject offering."""
        if self.is_unrestricted:
            return True
        if self.offering_ids is None:
            return True
        return offering_id in self.offering_ids
    
    def can_access_student(self, usn: str) -> bool:
        """Check if user can access a student's data."""
        if self.is_unrestricted:
            return True
        if self.student_usns is None:
            return True
        return usn in self.student_usns


class ScopeResolver:
    """
    Resolves access scope for a user based on their role.
    
    Usage:
        scope = ScopeResolver.resolve(db, user, role)
        if not scope.can_access_cohort(cohort_id):
            raise PermissionDenied(...)
    """
    
    @staticmethod
    def resolve(db: Session, user: Profile, role: AppRole) -> AccessScope:
        """
        Resolve the access scope for a user.
        
        Args:
            db: Database session
            user: Current user profile
            role: User's role
            
        Returns:
            AccessScope with applicable restrictions
        """
        if role == AppRole.PRINCIPAL:
            return ScopeResolver._resolve_principal()
        elif role == AppRole.HOD:
            return ScopeResolver._resolve_hod(db, user)
        elif role == AppRole.TEACHER:
            return ScopeResolver._resolve_teacher(db, user)
        elif role == AppRole.STUDENT:
            return ScopeResolver._resolve_student(db, user)
        else:
            # Unknown role - no access
            return AccessScope(
                scope_type=ScopeType.OWN,
                department_ids=[],
                cohort_ids=[],
                offering_ids=[],
                student_usns=[]
            )
    
    @staticmethod
    def _resolve_principal() -> AccessScope:
        """Principal has unrestricted access."""
        return AccessScope(scope_type=ScopeType.ALL)
    
    @staticmethod
    def _resolve_hod(db: Session, user: Profile) -> AccessScope:
        """
        HOD has department-scoped access.
        
        Resolves:
        - Department where user is HOD
        - All programs in that department
        - All cohorts in those programs
        """
        # Find department where user is HOD
        dept = db.query(Department).filter(
            Department.hod_id == user.user_id
        ).first()
        
        if not dept:
            # HOD without department assignment - minimal access
            return AccessScope(
                scope_type=ScopeType.DEPARTMENT,
                department_ids=[],
                program_ids=[],
                cohort_ids=[]
            )
        
        # Get all programs in department
        programs = db.query(Program).filter(
            Program.department_id == dept.id
        ).all()
        program_ids = [p.id for p in programs]
        
        # Get all cohorts in those programs
        cohort_ids = []
        if program_ids:
            cohorts = db.query(Cohort).filter(
                Cohort.program_id.in_(program_ids)
            ).all()
            cohort_ids = [c.id for c in cohorts]
        
        return AccessScope(
            scope_type=ScopeType.DEPARTMENT,
            department_ids=[dept.id],
            program_ids=program_ids,
            cohort_ids=cohort_ids
        )
    
    @staticmethod
    def _resolve_teacher(db: Session, user: Profile) -> AccessScope:
        """
        Teacher has assignment-scoped access.
        
        Resolves:
        - Assigned subject offerings
        - Cohorts for those assignments
        """
        assignments = db.query(TeacherAssignment).filter(
            TeacherAssignment.teacher_id == user.user_id
        ).all()
        
        if not assignments:
            return AccessScope(
                scope_type=ScopeType.OFFERING,
                cohort_ids=[],
                subject_ids=[],
                offering_ids=[]
            )
        
        cohort_ids = list(set(a.cohort_id for a in assignments))
        subject_ids = list(set(a.subject_id for a in assignments))
        
        # If TeacherAssignment has offering_id, use it
        offering_ids = []
        for a in assignments:
            if hasattr(a, 'offering_id') and a.offering_id:
                offering_ids.append(a.offering_id)
        
        return AccessScope(
            scope_type=ScopeType.OFFERING,
            cohort_ids=cohort_ids,
            subject_ids=subject_ids,
            offering_ids=offering_ids if offering_ids else None
        )
    
    @staticmethod
    def _resolve_student(db: Session, user: Profile) -> AccessScope:
        """
        Student has own-data access only.
        
        Resolves:
        - Student's USN
        - Student's enrollment cohort
        """
        # Try to find student record
        student = db.query(Student).filter(
            Student.user_id == user.user_id
        ).first()
        
        usn = student.usn if student else None
        
        # Get enrollment
        enrollment = db.query(StudentEnrollment).filter(
            StudentEnrollment.student_id == user.user_id,
            StudentEnrollment.status == "active"
        ).first()
        
        cohort_ids = [enrollment.cohort_id] if enrollment else []
        
        return AccessScope(
            scope_type=ScopeType.OWN,
            cohort_ids=cohort_ids,
            student_usns=[usn] if usn else []
        )


def check_scope_access(
    scope: AccessScope,
    college_id: Optional[UUID] = None,
    department_id: Optional[UUID] = None,
    cohort_id: Optional[UUID] = None,
    offering_id: Optional[UUID] = None,
    student_usn: Optional[str] = None
) -> tuple[bool, str]:
    """
    Check if scope allows access to specified resources.
    
    Returns:
        (allowed, reason) tuple
    """
    if scope.is_unrestricted:
        return True, "unrestricted"
    
    if college_id and not scope.can_access_college(college_id):
        return False, f"college {college_id} not in scope"
    
    if department_id and not scope.can_access_department(department_id):
        return False, f"department {department_id} not in scope"
    
    if cohort_id and not scope.can_access_cohort(cohort_id):
        return False, f"cohort {cohort_id} not in scope"
    
    if offering_id and not scope.can_access_offering(offering_id):
        return False, f"offering {offering_id} not in scope"
    
    if student_usn and not scope.can_access_student(student_usn):
        return False, f"student {student_usn} not in scope"
    
    return True, "allowed"


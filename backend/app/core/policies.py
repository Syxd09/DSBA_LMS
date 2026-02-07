"""
EduMetrics Backend - RBAC Policies
Permission definitions and role-permission mappings.

NOTE: This module enforces authorization at the API boundary.
Phase-2A/2B computation logic remains untouched.
"""
from enum import Enum
from typing import Set, Optional
from functools import wraps

from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.core.permissions import AppRole


class Permission(str, Enum):
    """
    Fine-grained permissions for RBAC.
    
    Format: {resource}:{action}
    """
    # Wildcard (Principal only)
    ALL = "*"
    
    # Analytics (Phase-2B) - Read-only
    CO_ATTAINMENT_READ = "co_attainment:read"
    PO_ATTAINMENT_READ = "po_attainment:read"
    STUDENT_MARKS_READ = "student_marks:read"
    SGPA_READ = "sgpa:read"
    CGPA_READ = "cgpa:read"
    RESULT_READ = "result:read"
    BACKLOG_READ = "backlog:read"
    
    # Templates (Phase-2C) - Export
    TEMPLATE_CO_REPORT = "template:co_report"
    TEMPLATE_PO_MATRIX = "template:po_matrix"
    TEMPLATE_GAP_ANALYSIS = "template:gap_analysis"
    TEMPLATE_STUDENT_REPORT = "template:student_report"
    
    # Exams - CRUD
    EXAM_READ = "exam:read"
    EXAM_CREATE = "exam:create"
    EXAM_UPDATE = "exam:update"
    EXAM_DELETE = "exam:delete"
    EXAM_PUBLISH = "exam:publish"
    
    # Marks - CRUD
    MARKS_READ = "marks:read"
    MARKS_CREATE = "marks:create"
    MARKS_UPDATE = "marks:update"
    MARKS_ENTRY = "marks:entry"  # Phase 6.2: Assignment/Attendance/Activity entry
    MARKS_APPROVE = "marks:approve"
    MARKS_LOCK = "marks:lock"
    
    # CO/PO Mappings
    CO_MANAGE = "co:manage"  # Phase 6.2: CO/assignment management
    CO_MAPPING_READ = "co_mapping:read"
    CO_MAPPING_CREATE = "co_mapping:create"
    CO_MAPPING_UPDATE = "co_mapping:update"
    PO_MAPPING_READ = "po_mapping:read"
    PO_MAPPING_UPDATE = "po_mapping:update"
    
    # Administrative
    DEPARTMENT_READ = "department:read"
    DEPARTMENT_MANAGE = "department:manage"
    PROGRAM_READ = "program:read"
    PROGRAM_MANAGE = "program:manage"
    COHORT_READ = "cohort:read"
    COHORT_MANAGE = "cohort:manage"
    SUBJECT_READ = "subject:read"
    SUBJECT_MANAGE = "subject:manage"
    ENROLLMENT_READ = "enrollment:read"
    ENROLLMENT_MANAGE = "enrollment:manage"
    
    # Audit
    AUDIT_READ = "audit:read"
    
    # Dashboard
    DASHBOARD_PRINCIPAL = "dashboard:principal"
    DASHBOARD_HOD = "dashboard:hod"
    DASHBOARD_TEACHER = "dashboard:teacher"
    DASHBOARD_STUDENT = "dashboard:student"


# Role-Permission Mapping
# Principal has ALL (wildcard)
# Other roles have explicit permissions

ROLE_PERMISSIONS: dict[AppRole, Set[Permission]] = {
    AppRole.PRINCIPAL: {Permission.ALL},
    
    AppRole.HOD: {
        # Analytics (department-scoped)
        Permission.CO_ATTAINMENT_READ,
        Permission.PO_ATTAINMENT_READ,
        Permission.STUDENT_MARKS_READ,
        Permission.SGPA_READ,
        Permission.CGPA_READ,
        Permission.RESULT_READ,
        Permission.BACKLOG_READ,
        
        # Templates (department-scoped)
        Permission.TEMPLATE_CO_REPORT,
        Permission.TEMPLATE_PO_MATRIX,
        Permission.TEMPLATE_GAP_ANALYSIS,
        Permission.TEMPLATE_STUDENT_REPORT,
        
        # Exams (approve/view)
        Permission.EXAM_READ,
        Permission.EXAM_PUBLISH,
        
        # Marks (approve + entry)
        Permission.MARKS_READ,
        Permission.MARKS_ENTRY,
        Permission.MARKS_APPROVE,
        Permission.MARKS_LOCK,
        
        # CO Management
        Permission.CO_MANAGE,
        
        # CO/PO (manage for department)
        Permission.CO_MAPPING_READ,
        Permission.CO_MAPPING_CREATE,
        Permission.CO_MAPPING_UPDATE,
        Permission.PO_MAPPING_READ,
        Permission.PO_MAPPING_UPDATE,
        
        # Admin (department-scoped)
        Permission.DEPARTMENT_READ,
        Permission.PROGRAM_READ,
        Permission.COHORT_READ,
        Permission.COHORT_MANAGE,
        Permission.SUBJECT_READ,
        Permission.SUBJECT_MANAGE,
        Permission.ENROLLMENT_READ,
        Permission.ENROLLMENT_MANAGE,
        
        # Audit (department-scoped)
        Permission.AUDIT_READ,
        
        # Dashboard
        Permission.DASHBOARD_HOD,
    },
    
    AppRole.TEACHER: {
        # Analytics (assigned subjects/cohorts)
        Permission.CO_ATTAINMENT_READ,
        Permission.STUDENT_MARKS_READ,
        Permission.SGPA_READ,
        Permission.RESULT_READ,
        
        # Templates (assigned only)
        Permission.TEMPLATE_STUDENT_REPORT,
        
        # Exams (own exams)
        Permission.EXAM_READ,
        Permission.EXAM_CREATE,
        Permission.EXAM_UPDATE,
        Permission.EXAM_DELETE,
        
        # Marks (own exams + component entry)
        Permission.MARKS_READ,
        Permission.MARKS_CREATE,
        Permission.MARKS_UPDATE,
        Permission.MARKS_ENTRY,
        
        # CO Mapping (read only)
        Permission.CO_MAPPING_READ,
        Permission.PO_MAPPING_READ,
        
        # Admin (read only)
        Permission.DEPARTMENT_READ,
        Permission.PROGRAM_READ,
        Permission.COHORT_READ,
        Permission.SUBJECT_READ,
        Permission.ENROLLMENT_READ,
        
        # Dashboard
        Permission.DASHBOARD_TEACHER,
    },
    
    AppRole.STUDENT: {
        # Analytics (own data only)
        Permission.STUDENT_MARKS_READ,
        Permission.SGPA_READ,
        Permission.CGPA_READ,
        Permission.RESULT_READ,
        
        # Templates (own report only)
        Permission.TEMPLATE_STUDENT_REPORT,
        
        # Dashboard
        Permission.DASHBOARD_STUDENT,
    },
}


def has_permission(role: AppRole, permission: Permission) -> bool:
    """
    Check if a role has a specific permission.
    
    Principal has ALL (wildcard) which grants everything.
    """
    role_perms = ROLE_PERMISSIONS.get(role, set())
    
    # Principal has wildcard
    if Permission.ALL in role_perms:
        return True
    
    return permission in role_perms


def get_role_permissions(role: AppRole) -> Set[Permission]:
    """Get all permissions for a role."""
    perms = ROLE_PERMISSIONS.get(role, set())
    
    # Expand wildcard for Principal
    if Permission.ALL in perms:
        return set(Permission) - {Permission.ALL}
    
    return perms


class PermissionDenied(Exception):
    """Raised when permission check fails."""
    def __init__(self, permission: Permission, reason: str = ""):
        self.permission = permission
        self.reason = reason
        super().__init__(f"Permission denied: {permission.value}" + (f" ({reason})" if reason else ""))

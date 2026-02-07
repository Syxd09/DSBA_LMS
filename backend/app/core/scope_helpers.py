"""
EduMetrics Backend - Scope Helpers

Utility functions for college_id filtering and scope-based access control.
"""
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Profile, Department, College


def get_college_filter(db: Session, user: Profile) -> Optional[UUID]:
    """
    Get college_id for current user, for query filtering.
    
    Args:
        db: Database session
        user: Current user profile
        
    Returns:
        UUID of user's college, or None if not resolvable
    """
    # Direct college_id on profile
    if hasattr(user, 'college_id') and user.college_id:
        return user.college_id
    
    # Resolve from department
    if hasattr(user, 'department_id') and user.department_id:
        dept = db.query(Department).filter(Department.id == user.department_id).first()
        if dept:
            return dept.college_id
    
    # Principal might have college assignment differently
    if user.role == "principal":
        # Find first college in system (single-college mode)
        college = db.query(College).first()
        if college:
            return college.id
    
    return None


def apply_college_filter(query, model, db: Session, user: Profile):
    """
    Apply college_id filter to a query.
    
    Args:
        query: SQLAlchemy query
        model: Model class being queried (must have college_id or resolvable path)
        db: Database session
        user: Current user profile
        
    Returns:
        Filtered query
    """
    college_id = get_college_filter(db, user)
    
    if college_id is None:
        # Can't determine college - return empty or raise
        return query.filter(False)  # Returns no results
    
    # Check if model has direct college_id
    if hasattr(model, 'college_id'):
        return query.filter(model.college_id == college_id)
    
    # Handle models that need join to get college_id
    # Department -> college_id is direct
    # Program -> department -> college_id
    # Cohort -> program -> department -> college_id
    # etc.
    
    # For now, return unfiltered for models without college_id
    # TODO: Add specific handling for each model type
    return query


def check_resource_college(
    db: Session,
    user: Profile,
    resource_college_id: Optional[UUID]
) -> bool:
    """
    Check if user has access to a resource based on college.
    
    Args:
        db: Database session
        user: Current user profile
        resource_college_id: College ID of the resource
        
    Returns:
        True if user can access the resource
    """
    if resource_college_id is None:
        return True  # No college restriction on resource
    
    user_college_id = get_college_filter(db, user)
    
    if user_college_id is None:
        return False  # Can't determine user's college
    
    return user_college_id == resource_college_id


def get_user_department_ids(db: Session, user: Profile) -> list:
    """
    Get list of department IDs accessible to user.
    
    Args:
        db: Database session
        user: Current user profile
        
    Returns:
        List of department UUIDs
    """
    if user.role == "principal":
        # Principal can access all departments in their college
        college_id = get_college_filter(db, user)
        if college_id:
            depts = db.query(Department.id).filter(
                Department.college_id == college_id
            ).all()
            return [d[0] for d in depts]
        return []
    
    elif user.role == "hod":
        # HOD can access their own department
        if hasattr(user, 'department_id') and user.department_id:
            return [user.department_id]
        return []
    
    elif user.role == "teacher":
        # Teacher can access departments they're assigned to
        # For now, return their department
        if hasattr(user, 'department_id') and user.department_id:
            return [user.department_id]
        return []
    
    elif user.role == "student":
        # Student has no department access
        return []
    
    return []

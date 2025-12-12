"""
EduMetrics Backend - Audit Router
Audit log endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.api.deps import require_hod_or_above
from app.models import Profile, AuditLog

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("")
async def list_audit_logs(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_hod_or_above),
    table_name: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100
):
    """List audit logs with optional filters."""
    query = db.query(AuditLog)
    
    if table_name and table_name != "all":
        query = query.filter(AuditLog.table_name == table_name)
    if action and action != "all":
        query = query.filter(AuditLog.action == action)
    
    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    
    # Get user profiles for the logs
    from app.models import Profile as ProfileModel
    user_ids = list(set(log.user_id for log in logs if log.user_id))
    profiles = {}
    if user_ids:
        profile_list = db.query(ProfileModel).filter(ProfileModel.user_id.in_(user_ids)).all()
        profiles = {p.user_id: {"full_name": p.full_name, "email": p.email} for p in profile_list}
    
    return [
        {
            "id": str(log.id),
            "user_id": str(log.user_id) if log.user_id else None,
            "action": log.action,
            "table_name": log.table_name,
            "record_id": str(log.record_id) if log.record_id else None,
            "old_data": log.old_data,
            "new_data": log.new_data,
            "created_at": log.created_at.isoformat(),
            "user": profiles.get(log.user_id)
        }
        for log in logs
    ]

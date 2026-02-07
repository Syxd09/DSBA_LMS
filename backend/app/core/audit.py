from sqlalchemy.orm import Session
from uuid import UUID
from typing import Dict, Any, Optional
import json
from app.models.audit import AuditLog

def create_audit_log(
    db: Session,
    user_id: UUID,
    action: str,
    table_name: str,
    record_id: Optional[UUID] = None,
    old_data: Optional[Dict[str, Any]] = None,
    new_data: Optional[Dict[str, Any]] = None
):
    """
    Create an audit log entry.
    """
    try:
        log = AuditLog(
            user_id=user_id,
            action=action,
            table_name=table_name,
            record_id=record_id,
            old_data=old_data,
            new_data=new_data
        )
        db.add(log)
        # We don't commit here to allow atomic transactions with the main operation
        # The caller should commit.
    except Exception as e:
        print(f"Failed to create audit log: {e}")

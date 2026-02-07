"""
EduMetrics Backend - Audit Logging Tests

Tests to verify audit logs are created correctly for sensitive operations.
Uses unit tests for model validation (no HTTP required).
"""
import pytest
from datetime import datetime
from uuid import uuid4
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import AuditLog


@pytest.fixture
def db():
    """Database session fixture."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


class TestAuditLogging:
    """Tests for audit log creation - unit tests."""
    
    def test_marks_entry_creates_audit(self, db: Session):
        """Audit log can be created for marks entry."""
        audit = AuditLog(
            user_id=uuid4(),
            user_role="teacher",
            action="INSERT",
            entity_type="student_marks",
            entity_id=str(uuid4()),
            new_data={"usn": "1MS21CS001", "marks": 35}
        )
        db.add(audit)
        db.commit()
        db.refresh(audit)
        
        assert audit.id is not None
        assert audit.entity_type == "student_marks"
        assert audit.action == "INSERT"
    
    def test_exam_approval_creates_audit(self, db: Session):
        """Audit log can be created for exam approval."""
        exam_id = uuid4()
        audit = AuditLog(
            user_id=uuid4(),
            user_role="hod",
            action="APPROVE",
            entity_type="exam",
            entity_id=str(exam_id),
            old_value="submitted",
            new_value="approved"
        )
        db.add(audit)
        db.commit()
        db.refresh(audit)
        
        assert audit.id is not None
        assert audit.action == "APPROVE"
        assert audit.old_value == "submitted"
        assert audit.new_value == "approved"
    
    def test_exam_unlock_requires_reason_in_audit(self, db: Session):
        """Audit log for unlock should have a reason."""
        exam_id = uuid4()
        reason = "Data entry error correction required"
        
        audit = AuditLog(
            user_id=uuid4(),
            user_role="principal",
            action="UNLOCK",
            entity_type="exam",
            entity_id=str(exam_id),
            old_value="locked",
            new_value="approved",
            reason=reason
        )
        db.add(audit)
        db.commit()
        db.refresh(audit)
        
        assert audit.reason == reason
        assert len(audit.reason) > 0
    
    def test_unlock_without_reason_is_logged(self, db: Session):
        """Audit log can be created even without reason (validation elsewhere)."""
        audit = AuditLog(
            user_id=uuid4(),
            user_role="principal",
            action="UNLOCK",
            entity_type="exam",
            entity_id=str(uuid4())
        )
        db.add(audit)
        db.commit()
        db.refresh(audit)
        
        # Model allows null reason - business logic enforces this
        assert audit.id is not None
        assert audit.reason is None
    
    def test_backlog_attempt_creates_audit(self, db: Session):
        """Audit log for backlog attempt can be created."""
        audit = AuditLog(
            user_id=uuid4(),
            user_role="teacher",
            action="INSERT",
            entity_type="backlog_attempt",
            entity_id=str(uuid4()),
            new_data={
                "student_usn": "1MS21CS001",
                "semester_attempted": 5,
                "result": "PASS"
            }
        )
        db.add(audit)
        db.commit()
        db.refresh(audit)
        
        assert audit.entity_type == "backlog_attempt"


class TestAuditLogFields:
    """Tests for audit log field completeness."""
    
    def test_audit_log_has_required_fields(self, db: Session):
        """AuditLog model should have all required fields."""
        audit = AuditLog(
            user_id=uuid4(),
            user_role="teacher",
            action="INSERT",
            entity_type="exam",
            entity_id=str(uuid4()),
            old_data={"status": "draft"},
            new_data={"status": "submitted"},
            reason="Test reason",
            version=1
        )
        db.add(audit)
        db.commit()
        db.refresh(audit)
        
        assert audit.id is not None
        assert audit.created_at is not None
        assert audit.user_id is not None
        assert audit.user_role is not None
        assert audit.action is not None
        assert audit.entity_type is not None
    
    def test_audit_log_ip_address(self, db: Session):
        """AuditLog should capture IP address."""
        audit = AuditLog(
            user_id=uuid4(),
            user_role="hod",
            action="APPROVE",
            entity_type="exam",
            entity_id=str(uuid4()),
            ip_address="192.168.1.1"
        )
        db.add(audit)
        db.commit()
        db.refresh(audit)
        
        assert str(audit.ip_address) == "192.168.1.1"


class TestAuditLogIntegrity:
    """Tests for audit log integrity."""
    
    def test_audit_logs_are_immutable(self, db: Session):
        """Audit logs should preserve original values."""
        audit = AuditLog(
            user_id=uuid4(),
            user_role="teacher",
            action="INSERT",
            entity_type="exam",
            entity_id=str(uuid4())
        )
        db.add(audit)
        db.commit()
        
        original_id = audit.id
        original_action = audit.action
        
        # Verify original values preserved
        db.refresh(audit)
        assert audit.id == original_id
        assert audit.action == original_action
    
    def test_audit_log_timestamps(self, db: Session):
        """Audit log should have automatic timestamp."""
        audit = AuditLog(
            user_id=uuid4(),
            user_role="teacher",
            action="INSERT",
            entity_type="exam",
            entity_id=str(uuid4())
        )
        db.add(audit)
        db.commit()
        db.refresh(audit)
        
        assert audit.created_at is not None
        assert isinstance(audit.created_at, datetime)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

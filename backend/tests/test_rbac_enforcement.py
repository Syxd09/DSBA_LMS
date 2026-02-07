"""
EduMetrics Backend - RBAC Enforcement Tests (Mocked)

Tests Role-Based Access Control logic by mocking authentication and database dependencies.
This ensures permissions are enforced correctly without relying on a running database.
"""
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from uuid import uuid4

from app.main import app
from app.api.deps import get_current_user, get_db
from app.models import Profile, UserRole
from app.core.permissions import AppRole

# Mock Enum wrapper to satisfy .role.value access
class MockRole:
    def __init__(self, value):
        self.value = value

class MockUserRole:
    def __init__(self, role_value):
        self.role = MockRole(role_value)

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def client(mock_db):
    """
    Test client with mocked database and user.
    """
    # Override DB to return our mock
    app.dependency_overrides[get_db] = lambda: mock_db
    yield TestClient(app)
    app.dependency_overrides = {}

def override_auth_as(client: TestClient, role: str):
    """
    Helper to override get_current_user and configure mock DB to return specific role.
    """
    user_id = uuid4()
    profile = Profile(id=user_id, user_id=user_id, full_name="Test User", email="test@example.com")
    
    # Override get_current_user to return this profile
    app.dependency_overrides[get_current_user] = lambda: profile
    
    # Configure mock DB to return the UserRole when queried
    # Structure: db.query(UserRole).filter(...).first() -> MockUserRole
    # We need to access the mock_db instance used by the client
    # Since client fixture sets lambda: mock_db, we can't easily access that specific mock unless we capture it.
    # But since pure mocks are passed by reference, we can configure the one passed to fixture.
    pass

class TestRBACEnforcement:

    def setup_auth(self, client, mock_db, role_name):
        """Setup overrides for a specific role."""
        user_id = uuid4()
        profile = Profile(id=user_id, user_id=user_id, full_name="Test User", email="test@example.com")
        
        # 1. Override User
        app.dependency_overrides[get_current_user] = lambda: profile
        
        # 2. Configure DB to return role
        # db.query(UserRole).filter().first() returns the role object
        mock_role_entry = MockUserRole(role_name)
        
        # Chain: query() -> filter() -> first()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_role_entry
        
        return profile

    def test_exam_approve_denied_for_teacher(self, client: TestClient, mock_db):
        """Teacher cannot approve exams (requires HOD)."""
        self.setup_auth(client, mock_db, "teacher")
        
        # Exam ID (arbitrary)
        exam_id = uuid4()
        
        response = client.post(f"/api/v1/exams/{exam_id}/approve")
        
        # Should be Forbidden (403)
        # If Permission logic uses UserRole to check 'teacher' vs 'hod'
        assert response.status_code == 403

    def test_exam_approve_denied_for_student(self, client: TestClient, mock_db):
        """Student cannot approve exams."""
        self.setup_auth(client, mock_db, "student")
        
        exam_id = uuid4()
        response = client.post(f"/api/v1/exams/{exam_id}/approve")
        assert response.status_code == 403

    def test_promotion_rollback_denied_for_hod(self, client: TestClient, mock_db):
        """HOD cannot rollback promotion (requires Principal)."""
        self.setup_auth(client, mock_db, "hod")
        
        cohort_id = uuid4()
        response = client.post(f"/api/v1/promotions/{cohort_id}/rollback?reason=TestRollbackReason123")
        assert response.status_code == 403

    def test_marks_approve_requires_hod(self, client: TestClient, mock_db):
        """Marks approval requires HOD."""
        self.setup_auth(client, mock_db, "teacher")
        
        exam_id = uuid4()
        response = client.post(f"/api/v1/marks/approve/{exam_id}")
        assert response.status_code == 403

    def test_student_cannot_access_other_marks(self, client: TestClient, mock_db):
        """Student cannot view other student's marks."""
        current_user = self.setup_auth(client, mock_db, "student")
        
        other_uuid = uuid4()
        
        response = client.get(f"/api/v1/marks/student/{other_uuid}")
        
        # Should be Forbidden (403) or Not Found (404) if scope enforced early
        # Definitely not 200
        assert response.status_code in [403, 404]

    def test_exam_create_requires_permission(self, client: TestClient, mock_db):
        """Exam creation requires teacher or above."""
        self.setup_auth(client, mock_db, "student")
        
        response = client.post("/api/v1/exams/", json={"name": "Test Exam"})
        assert response.status_code == 403

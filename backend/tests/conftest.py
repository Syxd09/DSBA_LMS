"""
EduMetrics Backend - Test Configuration
Uses PostgreSQL test database or skips auth tests if not available.
"""
import pytest
import os
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db

# Use PostgreSQL for tests if available, otherwise in-memory SQLite (limited)
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/edumetrics_test"
)

# Try PostgreSQL first
try:
    engine = create_engine(TEST_DATABASE_URL)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    USE_POSTGRES = True
except Exception:
    # Fallback to SQLite with limitations
    USE_POSTGRES = False
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def db() -> Generator:
    """Create database tables and yield session."""
    if USE_POSTGRES:
        Base.metadata.create_all(bind=engine)
    else:
        pytest.skip("PostgreSQL required for full model tests (UUID columns)")
    
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db) -> Generator:
    """Create test client with database override."""
    app.dependency_overrides[get_db] = override_get_db
    
    if USE_POSTGRES:
        Base.metadata.create_all(bind=engine)
    
    with TestClient(app) as c:
        yield c
    
    app.dependency_overrides.clear()
    if USE_POSTGRES:
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def auth_headers(client) -> dict:
    """Get authentication headers for test user."""
    # Create test user
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "test@example.com",
            "password": "testpassword123",
            "full_name": "Test User"
        }
    )
    
    if response.status_code == 200:
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    # If user exists, login
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "test@example.com",
            "password": "testpassword123"
        }
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

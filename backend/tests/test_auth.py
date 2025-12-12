"""
EduMetrics Backend - Authentication Tests
"""
import pytest
from fastapi.testclient import TestClient


class TestAuth:
    """Test authentication endpoints."""
    
    def test_signup_success(self, client: TestClient):
        """Test successful user signup."""
        response = client.post(
            "/api/v1/auth/signup",
            json={
                "email": "newuser@example.com",
                "password": "securepassword123",
                "full_name": "New User"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "newuser@example.com"
        assert data["user"]["role"] == "student"
    
    def test_signup_duplicate_email(self, client: TestClient):
        """Test signup with existing email."""
        # First signup
        client.post(
            "/api/v1/auth/signup",
            json={
                "email": "duplicate@example.com",
                "password": "password123",
                "full_name": "First User"
            }
        )
        
        # Second signup with same email
        response = client.post(
            "/api/v1/auth/signup",
            json={
                "email": "duplicate@example.com",
                "password": "password456",
                "full_name": "Second User"
            }
        )
        
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]
    
    def test_login_success(self, client: TestClient):
        """Test successful login."""
        # Create user first
        client.post(
            "/api/v1/auth/signup",
            json={
                "email": "login@example.com",
                "password": "loginpassword",
                "full_name": "Login User"
            }
        )
        
        # Login
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "login@example.com",
                "password": "loginpassword"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
    
    def test_login_invalid_credentials(self, client: TestClient):
        """Test login with invalid credentials."""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "nonexistent@example.com",
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401

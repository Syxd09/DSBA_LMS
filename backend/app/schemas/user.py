"""
EduMetrics Backend - User Schemas
Pydantic models for user-related API endpoints
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr
from uuid import UUID


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    full_name: str
    department: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a user."""
    password: str


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    full_name: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(UserBase):
    """Schema for user response."""
    id: UUID
    user_id: UUID
    avatar_url: Optional[str] = None
    role: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserRoleUpdate(BaseModel):
    """Schema for updating user role."""
    role: str  # principal, hod, teacher, student


class ProfileResponse(BaseModel):
    """Profile response schema."""
    id: UUID
    user_id: UUID
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    
    class Config:
        from_attributes = True


# Auth schemas
class Token(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: ProfileResponse


class TokenData(BaseModel):
    """Token payload data."""
    user_id: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None


class LoginRequest(BaseModel):
    """Login request schema."""
    email: EmailStr
    password: str


class SignupRequest(BaseModel):
    """Signup request schema."""
    email: EmailStr
    password: str
    full_name: str

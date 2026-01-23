"""
Authentication Pydantic schemas
"""
from pydantic import BaseModel, EmailStr, Field
from .user import UserResponse


class RegisterRequest(BaseModel):
    """Registration request schema"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)


class LoginRequest(BaseModel):
    """Login request schema"""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """Token payload data"""
    user_id: str

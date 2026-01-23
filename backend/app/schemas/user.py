"""
User-related Pydantic schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)


class UserCreate(UserBase):
    """Schema for user registration"""
    password: str = Field(..., min_length=6, max_length=100)


class UserUpdate(BaseModel):
    """Schema for updating user profile"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    avatar_url: Optional[str] = None


class UserStatsResponse(BaseModel):
    """User statistics response"""
    total_score: int = 0
    problems_solved: int = 0
    total_submissions: int = 0
    global_rank: Optional[int] = None
    badges: List[str] = []

    class Config:
        from_attributes = True


class UserProblemProgressResponse(BaseModel):
    """User problem progress response"""
    problem_id: str
    status: str
    best_score: int
    submission_count: int
    last_submitted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    """User response schema (public info)"""
    id: str
    email: EmailStr
    username: str
    avatar_url: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserProfileResponse(BaseModel):
    """Full user profile with stats"""
    id: str
    email: EmailStr
    username: str
    avatar_url: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False
    created_at: datetime
    updated_at: datetime
    stats: Optional[UserStatsResponse] = None

    class Config:
        from_attributes = True


class UserPublicResponse(BaseModel):
    """Public user info (for leaderboard etc)"""
    id: str
    username: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

"""
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
    UserProfileResponse,
    UserStatsResponse
)
from ..services.auth_service import auth_service
from ..core.deps import get_current_user
from ..models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account"""
    user, error = auth_service.register_user(db, data)

    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    return user


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Login and get access token"""
    user = auth_service.authenticate_user(db, data.email, data.password)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth_service.create_user_token(user)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserProfileResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user's info"""
    # Build stats response if exists
    stats = None
    if current_user.stats:
        import json
        badges = []
        if current_user.stats.badges:
            try:
                badges = json.loads(current_user.stats.badges)
            except:
                badges = []

        stats = UserStatsResponse(
            total_score=current_user.stats.total_score,
            problems_solved=current_user.stats.problems_solved,
            total_submissions=current_user.stats.total_submissions,
            global_rank=current_user.stats.global_rank,
            badges=badges
        )

    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        avatar_url=current_user.avatar_url,
        is_active=current_user.is_active,
        is_admin=current_user.is_admin,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        stats=stats
    )


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """
    Logout current user.
    Note: With JWT, logout is handled client-side by discarding the token.
    This endpoint exists for API completeness and future token blacklisting.
    """
    return {"message": "Successfully logged out"}

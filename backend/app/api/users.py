"""
User API endpoints
"""
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import (
    UserResponse,
    UserUpdate,
    UserStatsResponse,
    UserProblemProgressResponse,
    UserProfileResponse
)
from ..services.user_service import user_service
from ..core.deps import get_current_user
from ..models import User

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/{user_id}", response_model=UserProfileResponse)
def get_user(user_id: str, db: Session = Depends(get_db)):
    """Get user profile by ID"""
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Build stats response
    stats = None
    if user.stats:
        badges = []
        if user.stats.badges:
            try:
                badges = json.loads(user.stats.badges)
            except:
                badges = []

        stats = UserStatsResponse(
            total_score=user.stats.total_score,
            problems_solved=user.stats.problems_solved,
            total_submissions=user.stats.total_submissions,
            global_rank=user.stats.global_rank,
            badges=badges
        )

    return UserProfileResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
        stats=stats
    )


@router.get("/{user_id}/stats", response_model=UserStatsResponse)
def get_user_stats(user_id: str, db: Session = Depends(get_db)):
    """Get user statistics"""
    stats = user_service.get_user_stats(db, user_id)
    if not stats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User stats not found"
        )

    badges = []
    if stats.badges:
        try:
            badges = json.loads(stats.badges)
        except:
            badges = []

    return UserStatsResponse(
        total_score=stats.total_score,
        problems_solved=stats.problems_solved,
        total_submissions=stats.total_submissions,
        global_rank=stats.global_rank,
        badges=badges
    )


@router.put("/me", response_model=UserResponse)
def update_current_user(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile"""
    try:
        user = user_service.update_user(db, current_user, data)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/me/progress", response_model=list[UserProblemProgressResponse])
def get_current_user_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's problem progress"""
    progress_list = user_service.get_user_problem_progress(db, current_user.id)
    return [
        UserProblemProgressResponse(
            problem_id=p.problem_id,
            status=p.status,
            best_score=p.best_score,
            submission_count=p.submission_count,
            last_submitted_at=p.last_submitted_at
        )
        for p in progress_list
    ]

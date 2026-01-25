"""
Leaderboard API endpoints
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.leaderboard_service import leaderboard_service
from ..core.deps import get_current_user_optional
from ..models import User

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])


@router.get("/global")
def get_global_leaderboard(
    db: Session = Depends(get_db),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user_optional)
):
    """Get global leaderboard"""
    leaderboard = leaderboard_service.get_global_leaderboard(db, limit, offset)

    response = {
        "leaderboard": leaderboard,
        "total_entries": len(leaderboard)
    }

    # Add current user's rank if authenticated
    if current_user:
        response["my_rank"] = leaderboard_service.get_user_rank(db, current_user.id)

    return response


@router.get("/problem/{problem_id}")
def get_problem_leaderboard(
    problem_id: str,
    db: Session = Depends(get_db),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0)
):
    """Get leaderboard for a specific problem"""
    leaderboard = leaderboard_service.get_problem_leaderboard(
        db, problem_id, limit, offset
    )

    return {
        "problem_id": problem_id,
        "leaderboard": leaderboard,
        "total_entries": len(leaderboard)
    }

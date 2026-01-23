"""
User service - business logic for user operations
"""
import json
from typing import Optional, List
from sqlalchemy.orm import Session

from ..models import User, UserStats, UserProblemProgress
from ..schemas import UserUpdate


class UserService:
    """User service class"""

    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_user_by_username(db: Session, username: str) -> Optional[User]:
        """Get user by username"""
        return db.query(User).filter(User.username == username).first()

    @staticmethod
    def update_user(db: Session, user: User, data: UserUpdate) -> User:
        """Update user profile"""
        if data.username is not None:
            # Check if username is taken
            existing = db.query(User).filter(
                User.username == data.username,
                User.id != user.id
            ).first()
            if existing:
                raise ValueError("Username already taken")
            user.username = data.username

        if data.avatar_url is not None:
            user.avatar_url = data.avatar_url

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def get_user_stats(db: Session, user_id: str) -> Optional[UserStats]:
        """Get user statistics"""
        return db.query(UserStats).filter(UserStats.user_id == user_id).first()

    @staticmethod
    def update_user_stats(
        db: Session,
        user_id: str,
        score_delta: int = 0,
        problems_solved_delta: int = 0,
        submissions_delta: int = 0
    ) -> UserStats:
        """Update user statistics"""
        stats = db.query(UserStats).filter(UserStats.user_id == user_id).first()
        if not stats:
            stats = UserStats(user_id=user_id)
            db.add(stats)

        stats.total_score += score_delta
        stats.problems_solved += problems_solved_delta
        stats.total_submissions += submissions_delta

        db.commit()
        db.refresh(stats)
        return stats

    @staticmethod
    def get_user_problem_progress(db: Session, user_id: str) -> List[UserProblemProgress]:
        """Get all problem progress for a user"""
        return db.query(UserProblemProgress).filter(
            UserProblemProgress.user_id == user_id
        ).all()

    @staticmethod
    def get_or_create_problem_progress(
        db: Session,
        user_id: str,
        problem_id: str
    ) -> UserProblemProgress:
        """Get or create problem progress record"""
        progress = db.query(UserProblemProgress).filter(
            UserProblemProgress.user_id == user_id,
            UserProblemProgress.problem_id == problem_id
        ).first()

        if not progress:
            progress = UserProblemProgress(
                user_id=user_id,
                problem_id=problem_id
            )
            db.add(progress)
            db.commit()
            db.refresh(progress)

        return progress

    @staticmethod
    def add_badge(db: Session, user_id: str, badge: str) -> UserStats:
        """Add a badge to user"""
        stats = db.query(UserStats).filter(UserStats.user_id == user_id).first()
        if not stats:
            stats = UserStats(user_id=user_id)
            db.add(stats)

        badges = []
        if stats.badges:
            try:
                badges = json.loads(stats.badges)
            except:
                badges = []

        if badge not in badges:
            badges.append(badge)
            stats.badges = json.dumps(badges)
            db.commit()
            db.refresh(stats)

        return stats


# Singleton instance
user_service = UserService()

"""
Leaderboard service - rankings and leaderboard logic
"""
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..models import User, UserStats, Submission


class LeaderboardService:
    """Leaderboard service class"""

    @staticmethod
    def get_global_leaderboard(
        db: Session,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get global leaderboard sorted by total score"""
        results = db.query(
            User.id,
            User.username,
            User.avatar_url,
            UserStats.total_score,
            UserStats.problems_solved,
            UserStats.total_submissions
        ).join(
            UserStats, User.id == UserStats.user_id
        ).filter(
            User.is_active == True
        ).order_by(
            desc(UserStats.total_score),
            desc(UserStats.problems_solved)
        ).offset(offset).limit(limit).all()

        leaderboard = []
        for i, row in enumerate(results):
            leaderboard.append({
                "rank": offset + i + 1,
                "user_id": row.id,
                "username": row.username,
                "avatar_url": row.avatar_url,
                "total_score": row.total_score,
                "problems_solved": row.problems_solved,
                "total_submissions": row.total_submissions
            })

        return leaderboard

    @staticmethod
    def get_problem_leaderboard(
        db: Session,
        problem_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get leaderboard for a specific problem"""
        # Get best submission per user for this problem
        from sqlalchemy import func

        # Subquery to get best score per user
        subquery = db.query(
            Submission.user_id,
            func.max(Submission.score).label("best_score"),
            func.min(Submission.created_at).label("first_submit")
        ).filter(
            Submission.problem_id == problem_id,
            Submission.status == "completed",
            Submission.score != None
        ).group_by(
            Submission.user_id
        ).subquery()

        results = db.query(
            User.id,
            User.username,
            User.avatar_url,
            subquery.c.best_score,
            subquery.c.first_submit
        ).join(
            subquery, User.id == subquery.c.user_id
        ).filter(
            User.is_active == True
        ).order_by(
            desc(subquery.c.best_score),
            subquery.c.first_submit  # Earlier submission wins on tie
        ).offset(offset).limit(limit).all()

        leaderboard = []
        for i, row in enumerate(results):
            leaderboard.append({
                "rank": offset + i + 1,
                "user_id": row.id,
                "username": row.username,
                "avatar_url": row.avatar_url,
                "score": row.best_score,
                "submitted_at": row.first_submit.isoformat() if row.first_submit else None
            })

        return leaderboard

    @staticmethod
    def get_user_rank(db: Session, user_id: str) -> int:
        """Get user's global rank"""
        user_stats = db.query(UserStats).filter(
            UserStats.user_id == user_id
        ).first()

        if not user_stats:
            return 0

        # Count users with higher score
        higher_count = db.query(UserStats).join(
            User, User.id == UserStats.user_id
        ).filter(
            User.is_active == True,
            UserStats.total_score > user_stats.total_score
        ).count()

        return higher_count + 1

    @staticmethod
    def update_all_ranks(db: Session):
        """Update global ranks for all users"""
        results = db.query(
            UserStats
        ).join(
            User, User.id == UserStats.user_id
        ).filter(
            User.is_active == True
        ).order_by(
            desc(UserStats.total_score),
            desc(UserStats.problems_solved)
        ).all()

        for i, stats in enumerate(results):
            stats.global_rank = i + 1

        db.commit()


# Singleton instance
leaderboard_service = LeaderboardService()

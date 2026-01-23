"""
Submission service - business logic for submissions
"""
import json
from datetime import datetime
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session

from ..models import Submission, UserProblemProgress
from ..schemas import SubmissionCreate, SubmissionResultUpdate
from .user_service import user_service


class SubmissionService:
    """Submission service class"""

    @staticmethod
    def create_submission(
        db: Session,
        user_id: str,
        data: SubmissionCreate
    ) -> Submission:
        """Create a new submission"""
        submission = Submission(
            user_id=user_id,
            problem_id=data.problem_id,
            code=data.code,
            submission_type=data.submission_type,
            target=data.target,
            status="pending"
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)

        # Update user stats
        user_service.update_user_stats(db, user_id, submissions_delta=1)

        # Update problem progress
        progress = user_service.get_or_create_problem_progress(db, user_id, data.problem_id)
        progress.submission_count += 1
        progress.last_submitted_at = datetime.utcnow()
        if progress.status == "not_started":
            progress.status = "attempted"
        db.commit()

        return submission

    @staticmethod
    def get_submission(db: Session, submission_id: str) -> Optional[Submission]:
        """Get submission by ID"""
        return db.query(Submission).filter(Submission.id == submission_id).first()

    @staticmethod
    def get_user_submissions(
        db: Session,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        problem_id: Optional[str] = None
    ) -> Tuple[List[Submission], int]:
        """Get submissions for a user with pagination"""
        query = db.query(Submission).filter(Submission.user_id == user_id)

        if problem_id:
            query = query.filter(Submission.problem_id == problem_id)

        total = query.count()
        submissions = query.order_by(
            Submission.created_at.desc()
        ).offset(offset).limit(limit).all()

        return submissions, total

    @staticmethod
    def update_submission_result(
        db: Session,
        submission: Submission,
        data: SubmissionResultUpdate
    ) -> Submission:
        """Update submission with results"""
        submission.status = data.status
        if data.score is not None:
            submission.score = data.score
        if data.fidelity is not None:
            submission.fidelity = data.fidelity
        if data.gate_count is not None:
            submission.gate_count = data.gate_count
        if data.circuit_depth is not None:
            submission.circuit_depth = data.circuit_depth
        if data.qubit_count is not None:
            submission.qubit_count = data.qubit_count
        if data.feedback is not None:
            submission.feedback = json.dumps(data.feedback)
        if data.test_results is not None:
            submission.test_results = json.dumps(data.test_results)

        if data.status in ["completed", "failed", "error"]:
            submission.completed_at = datetime.utcnow()

        db.commit()
        db.refresh(submission)

        # If completed successfully, update user progress
        if data.status == "completed" and data.score is not None:
            SubmissionService._update_progress_on_completion(
                db, submission, data.score
            )

        return submission

    @staticmethod
    def _update_progress_on_completion(
        db: Session,
        submission: Submission,
        score: int
    ):
        """Update user progress when submission completes"""
        progress = user_service.get_or_create_problem_progress(
            db, submission.user_id, submission.problem_id
        )

        # Update best score
        if score > progress.best_score:
            score_delta = score - progress.best_score
            progress.best_score = score

            # Update total score
            user_service.update_user_stats(db, submission.user_id, score_delta=score_delta)

        # Mark as solved if score is perfect (100)
        if score >= 100 and progress.status != "solved":
            progress.status = "solved"
            user_service.update_user_stats(db, submission.user_id, problems_solved_delta=1)

        db.commit()


# Singleton instance
submission_service = SubmissionService()

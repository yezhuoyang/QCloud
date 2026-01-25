"""
Submission API endpoints
"""
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import (
    SubmissionCreate,
    SubmissionResponse,
    SubmissionListResponse
)
from ..services.submission_service import submission_service
from ..core.deps import get_current_user
from ..models import User

router = APIRouter(prefix="/submissions", tags=["Submissions"])


def _format_submission(submission) -> SubmissionResponse:
    """Format submission for response"""
    feedback = None
    test_results = None

    if submission.feedback:
        try:
            feedback = json.loads(submission.feedback)
        except:
            feedback = None

    if submission.test_results:
        try:
            test_results = json.loads(submission.test_results)
        except:
            test_results = None

    return SubmissionResponse(
        id=submission.id,
        user_id=submission.user_id,
        problem_id=submission.problem_id,
        code=submission.code,
        submission_type=submission.submission_type,
        target=submission.target,
        status=submission.status,
        score=submission.score,
        fidelity=submission.fidelity,
        gate_count=submission.gate_count,
        circuit_depth=submission.circuit_depth,
        qubit_count=submission.qubit_count,
        feedback=feedback,
        test_results=test_results,
        created_at=submission.created_at,
        completed_at=submission.completed_at
    )


@router.post("/", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
def create_submission(
    data: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new submission"""
    submission = submission_service.create_submission(db, current_user.id, data)
    return _format_submission(submission)


@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get submission by ID"""
    submission = submission_service.get_submission(db, submission_id)
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )

    # Only allow user to see their own submissions
    if submission.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return _format_submission(submission)


@router.get("/me/", response_model=SubmissionListResponse)
def get_my_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    problem_id: Optional[str] = Query(default=None)
):
    """Get current user's submissions"""
    submissions, total = submission_service.get_user_submissions(
        db, current_user.id, limit, offset, problem_id
    )

    return SubmissionListResponse(
        submissions=[_format_submission(s) for s in submissions],
        total=total
    )

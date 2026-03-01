"""
Homework API endpoints - Token-gated quantum hardware access with FIFO queue.
Student endpoints use token authentication (not JWT).
Admin endpoints use standard JWT admin authentication.
"""
import json
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from ..database import get_db
from ..core.deps import get_admin_user
from ..models.user import User
from ..models.homework import Homework, HomeworkToken, HomeworkSubmission
from ..services.homework_service import (
    verify_homework_token,
    create_homework,
    generate_tokens_for_homework,
    get_homework,
    get_student_label,
    check_budget,
    encrypt_api_key,
    decrypt_api_key,
)
from ..services.homework_queue import homework_queue
from ..services.code_validator import validate_code
from ..schemas.homework import (
    HomeworkTokenVerifyRequest,
    HomeworkTokenVerifyResponse,
    HomeworkSubmitRequest,
    HomeworkSubmissionResponse,
    HomeworkSubmissionListResponse,
    HomeworkQueueStatusResponse,
    QueueEntry,
    RunningEntry,
    MyQueueEntry,
    HomeworkLeaderboardEntry,
    HomeworkLeaderboardResponse,
    HomeworkCreateRequest,
    HomeworkCreateResponse,
    HomeworkGenerateTokensRequest,
    HomeworkGenerateTokensResponse,
    HomeworkTokenEntry,
    HomeworkTokenAdminResponse,
    HomeworkBudgetSummaryResponse,
    HomeworkUpdateRequest,
    HomeworkTokenUpdateRequest,
)

router = APIRouter(prefix="/homework", tags=["Homework"])


# ============ Helper to poll IBM jobs in the background ============

async def _poll_submission_status(submission_id: str):
    """Background task to poll IBM for job completion."""
    import asyncio
    from ..database import SessionLocal

    max_polls = 120  # ~1 hour with 30s intervals
    for i in range(max_polls):
        await asyncio.sleep(30)
        db = SessionLocal()
        try:
            sub = db.query(HomeworkSubmission).filter(
                HomeworkSubmission.id == submission_id
            ).first()
            if not sub or sub.status not in ("running",):
                break
            homework_queue.check_job_status(db, sub)
            if sub.status in ("completed", "failed"):
                break
        finally:
            db.close()


# ============ Student Endpoints ============

@router.post("/verify-token", response_model=HomeworkTokenVerifyResponse)
async def verify_token(
    request: HomeworkTokenVerifyRequest,
    db: Session = Depends(get_db),
):
    """Verify a student's homework token and return homework info + budget."""
    token_record = verify_homework_token(db, request.token)

    if not token_record:
        return HomeworkTokenVerifyResponse(
            valid=False,
            error="Invalid or expired token",
        )

    homework = token_record.homework
    has_budget, remaining = check_budget(token_record)
    allowed_backends = json.loads(homework.allowed_backends)

    return HomeworkTokenVerifyResponse(
        valid=True,
        homework_id=homework.id,
        homework_title=homework.title,
        course=homework.course,
        description=homework.description,
        budget_total_seconds=token_record.budget_limit_seconds,
        budget_used_seconds=token_record.budget_used_seconds,
        budget_remaining_seconds=remaining,
        submission_count=token_record.submission_count,
        allowed_backends=allowed_backends,
        deadline=homework.deadline,
        reference_circuit=homework.reference_circuit,
    )


@router.post("/submit", response_model=HomeworkSubmissionResponse)
async def submit_homework(
    request: HomeworkSubmitRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Submit homework code for hardware execution.
    The job enters a FIFO queue and is processed when a slot is available.
    """
    # Verify token
    token_record = verify_homework_token(db, request.token)
    if not token_record:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    homework = token_record.homework

    # Check budget
    has_budget, remaining = check_budget(token_record)
    if not has_budget:
        raise HTTPException(
            status_code=403,
            detail=f"Insufficient budget. Remaining: {remaining:.0f}s",
        )

    # Validate backend
    allowed = json.loads(homework.allowed_backends)
    if request.backend not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Backend '{request.backend}' not allowed. Choose from: {allowed}",
        )

    # Validate reference circuit exists
    if not homework.reference_circuit:
        raise HTTPException(
            status_code=400,
            detail="Homework has no reference circuit configured. Contact your TA.",
        )

    # Validate student's circuit
    is_valid, error = validate_code(request.code)
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail=f"Circuit validation error: {error}",
        )

    # Enqueue the submission (reference circuit comes from homework config)
    submission = homework_queue.enqueue(
        db=db,
        homework=homework,
        token_record=token_record,
        code=request.code,
        backend_name=request.backend,
        shots=request.shots,
    )

    # Try to process the queue (may start this job immediately if slots available)
    started = homework_queue.process_next(db, homework.id)

    # If a job was started, schedule background polling
    if started:
        background_tasks.add_task(_poll_submission_status, started.id)

    db.refresh(submission)
    return _format_submission(submission)


@router.get("/status/{submission_id}", response_model=HomeworkSubmissionResponse)
async def get_submission_status(
    submission_id: str,
    token: str = Query(..., description="Student's homework token"),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
):
    """Check the status of a homework submission."""
    token_record = verify_homework_token(db, token)
    if not token_record:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    submission = db.query(HomeworkSubmission).filter(
        HomeworkSubmission.id == submission_id,
        HomeworkSubmission.token_id == token_record.id,
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # If running, check IBM status
    if submission.status == "running":
        homework_queue.check_job_status(db, submission)

    return _format_submission(submission)


@router.get("/submissions", response_model=HomeworkSubmissionListResponse)
async def get_my_submissions(
    token: str = Query(..., description="Student's homework token"),
    db: Session = Depends(get_db),
):
    """Get the student's submission history for this homework."""
    token_record = verify_homework_token(db, token)
    if not token_record:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    submissions = (
        db.query(HomeworkSubmission)
        .filter(HomeworkSubmission.token_id == token_record.id)
        .order_by(HomeworkSubmission.created_at.desc())
        .all()
    )

    return HomeworkSubmissionListResponse(
        submissions=[_format_submission(s) for s in submissions],
        total=len(submissions),
    )


@router.get("/queue/{homework_id}", response_model=HomeworkQueueStatusResponse)
async def get_queue_status(
    homework_id: str,
    token: str = Query(None, description="Student's homework token (optional)"),
    db: Session = Depends(get_db),
):
    """Get the current queue status for a homework."""
    homework = get_homework(db, homework_id)
    if not homework:
        raise HTTPException(status_code=404, detail="Homework not found")

    token_record = None
    if token:
        token_record = verify_homework_token(db, token)

    queue_data = homework_queue.get_queue_status(db, homework_id, token_record)

    return HomeworkQueueStatusResponse(
        queue=[QueueEntry(**e) for e in queue_data["queue"]],
        running=[RunningEntry(**e) for e in queue_data["running"]],
        my_submissions=[MyQueueEntry(**e) for e in queue_data["my_submissions"]],
        total_queued=queue_data["total_queued"],
        total_running=queue_data["total_running"],
        estimated_wait_minutes=queue_data["estimated_wait_minutes"],
    )


@router.get("/leaderboard/{homework_id}", response_model=HomeworkLeaderboardResponse)
async def get_leaderboard(
    homework_id: str,
    db: Session = Depends(get_db),
):
    """Get the homework leaderboard ranked by final fidelity."""
    homework = get_homework(db, homework_id)
    if not homework:
        raise HTTPException(status_code=404, detail="Homework not found")

    # For each token, get their best submission (highest fidelity_after)
    # Subquery: best fidelity_after per token
    best_sub = (
        db.query(
            HomeworkSubmission.token_id,
            func.max(HomeworkSubmission.fidelity_after).label("best_fidelity"),
        )
        .filter(
            HomeworkSubmission.homework_id == homework_id,
            HomeworkSubmission.status == "completed",
            HomeworkSubmission.fidelity_after.isnot(None),
        )
        .group_by(HomeworkSubmission.token_id)
        .subquery()
    )

    # Join to get full submission details for the best one
    results = (
        db.query(HomeworkSubmission, HomeworkToken)
        .join(HomeworkToken, HomeworkSubmission.token_id == HomeworkToken.id)
        .join(
            best_sub,
            (HomeworkSubmission.token_id == best_sub.c.token_id)
            & (HomeworkSubmission.fidelity_after == best_sub.c.best_fidelity),
        )
        .filter(
            HomeworkSubmission.homework_id == homework_id,
            HomeworkSubmission.status == "completed",
        )
        .order_by(desc(HomeworkSubmission.fidelity_after))
        .all()
    )

    # Build leaderboard entries
    seen_tokens = set()
    entries = []
    rank = 0
    for sub, token in results:
        if token.id in seen_tokens:
            continue
        seen_tokens.add(token.id)
        rank += 1

        # Count total submissions for this student
        sub_count = (
            db.query(HomeworkSubmission)
            .filter(HomeworkSubmission.token_id == token.id)
            .count()
        )

        entries.append(
            HomeworkLeaderboardEntry(
                rank=rank,
                student_label=get_student_label(token),
                fidelity_before=sub.fidelity_before or 0.0,
                fidelity_after=sub.fidelity_after or 0.0,
                fidelity_improvement=sub.fidelity_improvement or 0.0,
                score=sub.score or 0,
                submission_count=sub_count,
                best_submission_at=sub.completed_at,
            )
        )

    total_students = (
        db.query(HomeworkToken)
        .filter(HomeworkToken.homework_id == homework_id)
        .count()
    )

    return HomeworkLeaderboardResponse(
        homework_id=homework_id,
        homework_title=homework.title,
        leaderboard=entries,
        total_students=total_students,
        updated_at=datetime.utcnow(),
    )


# ============ Admin Endpoints ============

@router.post("/admin/create", response_model=HomeworkCreateResponse)
async def admin_create_homework(
    request: HomeworkCreateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Create a new homework (admin only). Encrypts the IBM API key."""
    homework = create_homework(
        db=db,
        title=request.title,
        description=request.description,
        course=request.course,
        ibmq_api_key=request.ibmq_api_key,
        ibmq_channel=request.ibmq_channel,
        ibmq_instance=request.ibmq_instance,
        allowed_backends=request.allowed_backends,
        total_budget_seconds=request.total_budget_seconds,
        num_students=request.num_students,
        max_concurrent_jobs=request.max_concurrent_jobs,
        problem_id=request.problem_id,
        deadline=request.deadline,
        reference_circuit=request.reference_circuit,
        judge_code=request.judge_code,
        created_by=admin.id,
    )

    return HomeworkCreateResponse(
        id=homework.id,
        title=homework.title,
        per_student_budget_seconds=homework.per_student_budget_seconds,
        max_concurrent_jobs=homework.max_concurrent_jobs,
    )


@router.post(
    "/admin/{homework_id}/generate-tokens",
    response_model=HomeworkGenerateTokensResponse,
)
async def admin_generate_tokens(
    homework_id: str,
    request: HomeworkGenerateTokensRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Generate tokens for a list of student UIDs (admin only). Raw tokens returned once."""
    homework = get_homework(db, homework_id)
    if not homework:
        raise HTTPException(status_code=404, detail="Homework not found")

    results = generate_tokens_for_homework(db, homework, request.student_uids)

    return HomeworkGenerateTokensResponse(
        tokens=[HomeworkTokenEntry(**r) for r in results],
        count=len(results),
    )


@router.get("/admin/{homework_id}/tokens", response_model=List[HomeworkTokenAdminResponse])
async def admin_get_tokens(
    homework_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Get all tokens for a homework with budget usage (admin only)."""
    homework = get_homework(db, homework_id)
    if not homework:
        raise HTTPException(status_code=404, detail="Homework not found")

    tokens = (
        db.query(HomeworkToken)
        .filter(HomeworkToken.homework_id == homework_id)
        .order_by(HomeworkToken.created_at.asc())
        .all()
    )

    return [
        HomeworkTokenAdminResponse(
            id=t.id,
            student_uid_hash=t.student_uid,
            budget_used_seconds=t.budget_used_seconds,
            budget_limit_seconds=t.budget_limit_seconds,
            is_active=t.is_active,
            submission_count=t.submission_count,
            last_used_at=t.last_used_at,
            created_at=t.created_at,
        )
        for t in tokens
    ]


@router.get("/admin/{homework_id}/budgets", response_model=HomeworkBudgetSummaryResponse)
async def admin_get_budgets(
    homework_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Get budget summary for a homework (admin only)."""
    homework = get_homework(db, homework_id)
    if not homework:
        raise HTTPException(status_code=404, detail="Homework not found")

    tokens = (
        db.query(HomeworkToken)
        .filter(HomeworkToken.homework_id == homework_id)
        .all()
    )

    total_used = sum(t.budget_used_seconds for t in tokens)
    active_count = sum(1 for t in tokens if t.is_active)

    students = [
        HomeworkTokenAdminResponse(
            id=t.id,
            student_uid_hash=t.student_uid,
            budget_used_seconds=t.budget_used_seconds,
            budget_limit_seconds=t.budget_limit_seconds,
            is_active=t.is_active,
            submission_count=t.submission_count,
            last_used_at=t.last_used_at,
            created_at=t.created_at,
        )
        for t in tokens
    ]

    return HomeworkBudgetSummaryResponse(
        homework_id=homework.id,
        homework_title=homework.title,
        total_budget_seconds=homework.total_budget_seconds,
        total_used_seconds=total_used,
        total_remaining_seconds=homework.total_budget_seconds - total_used,
        num_students=len(tokens),
        num_active_tokens=active_count,
        students=students,
    )


@router.put("/admin/{homework_id}")
async def admin_update_homework(
    homework_id: str,
    request: HomeworkUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Update homework settings (admin only)."""
    homework = get_homework(db, homework_id)
    if not homework:
        raise HTTPException(status_code=404, detail="Homework not found")

    if request.title is not None:
        homework.title = request.title
    if request.description is not None:
        homework.description = request.description
    if request.allowed_backends is not None:
        homework.allowed_backends = json.dumps(request.allowed_backends)
    if request.max_concurrent_jobs is not None:
        homework.max_concurrent_jobs = request.max_concurrent_jobs
    if request.is_active is not None:
        homework.is_active = request.is_active
    if request.deadline is not None:
        homework.deadline = request.deadline
    if request.reference_circuit is not None:
        homework.reference_circuit = request.reference_circuit
    if request.judge_code is not None:
        homework.judge_code = request.judge_code

    homework.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Homework updated", "id": homework.id}


@router.put("/admin/tokens/{token_id}")
async def admin_update_token(
    token_id: str,
    request: HomeworkTokenUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Update a specific token (admin only)."""
    token_record = db.query(HomeworkToken).filter(HomeworkToken.id == token_id).first()
    if not token_record:
        raise HTTPException(status_code=404, detail="Token not found")

    if request.is_active is not None:
        token_record.is_active = request.is_active
    if request.budget_limit_seconds is not None:
        token_record.budget_limit_seconds = request.budget_limit_seconds

    db.commit()

    return {"message": "Token updated", "id": token_record.id}


@router.get("/admin/list")
async def admin_list_homeworks(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """List all homeworks (admin only)."""
    homeworks = db.query(Homework).order_by(Homework.created_at.desc()).all()
    return [
        {
            "id": h.id,
            "title": h.title,
            "course": h.course,
            "is_active": h.is_active,
            "num_students": h.num_students,
            "total_budget_seconds": h.total_budget_seconds,
            "per_student_budget_seconds": h.per_student_budget_seconds,
            "max_concurrent_jobs": h.max_concurrent_jobs,
            "deadline": h.deadline.isoformat() if h.deadline else None,
            "created_at": h.created_at.isoformat() if h.created_at else None,
        }
        for h in homeworks
    ]


# ============ Helpers ============

def _format_submission(sub: HomeworkSubmission) -> HomeworkSubmissionResponse:
    """Format a HomeworkSubmission model into a response schema."""
    return HomeworkSubmissionResponse(
        id=sub.id,
        homework_id=sub.homework_id,
        status=sub.status,
        queue_position=sub.queue_position,
        backend_name=sub.backend_name,
        shots=sub.shots,
        ibmq_job_id_before=sub.ibmq_job_id_before,
        ibmq_job_id_after=sub.ibmq_job_id_after,
        fidelity_before=sub.fidelity_before,
        fidelity_after=sub.fidelity_after,
        fidelity_improvement=sub.fidelity_improvement,
        score=sub.score,
        measurements_before=json.loads(sub.measurements_before) if sub.measurements_before else None,
        measurements_after=json.loads(sub.measurements_after) if sub.measurements_after else None,
        qubit_count=sub.qubit_count,
        gate_count=sub.gate_count,
        circuit_depth=sub.circuit_depth,
        execution_time_seconds=sub.execution_time_seconds,
        error_message=sub.error_message,
        created_at=sub.created_at,
        started_at=sub.started_at,
        completed_at=sub.completed_at,
    )

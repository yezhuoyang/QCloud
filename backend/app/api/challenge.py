"""
Challenge API endpoints - Generalized competition system with custom evaluation.
Student endpoints use token authentication (not JWT).
Admin endpoints use standard JWT admin authentication.
"""
import json
import asyncio
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from ..database import get_db
from ..core.deps import get_admin_user
from ..models.user import User
from ..models.challenge import Challenge, ChallengeToken, ChallengeSubmission
from ..services.challenge_service import (
    verify_challenge_token,
    create_challenge,
    generate_tokens_for_challenge,
    get_challenge,
    get_participant_label,
    check_budget,
    encrypt_api_key,
    decrypt_api_key,
    simulate_challenge_noisy,
)
from ..services.challenge_queue import challenge_queue
from ..services.code_validator import validate_code
from ..schemas.challenge import (
    ChallengeTokenVerifyRequest,
    ChallengeTokenVerifyResponse,
    ChallengeSubmitRequest,
    ChallengeSubmissionResponse,
    ChallengeSubmissionListResponse,
    ChallengeQueueStatusResponse,
    ChallengeQueueEntry,
    ChallengeRunningEntry,
    ChallengeMyQueueEntry,
    ChallengeLeaderboardEntry,
    ChallengeLeaderboardResponse,
    ChallengePublicInfo,
    ChallengeListResponse,
    ChallengeSimulateRequest,
    ChallengeSimulateResponse,
    ChallengeCreateRequest,
    ChallengeCreateResponse,
    ChallengeUpdateRequest,
    ChallengeGenerateTokensRequest,
    ChallengeGenerateTokensResponse,
    ChallengeTokenEntry,
    ChallengeTokenAdminResponse,
    ChallengeBudgetSummaryResponse,
    ChallengeTokenUpdateRequest,
    ChallengeUpdateProfileRequest,
    ChallengeUpdateProfileResponse,
    AdminChallengeSubmissionResponse,
    AdminChallengeSubmissionListResponse,
    GlobalProgrammerEntry,
    GlobalProgrammerLeaderboardResponse,
    GlobalHardwareEntry,
    GlobalHardwareLeaderboardResponse,
    ParticipantEntry,
)

router = APIRouter(prefix="/challenge", tags=["Challenge"])

# Limit concurrent simulations
_simulation_semaphore = asyncio.Semaphore(3)


# ============ Background Polling ============

_active_challenge_pollers: set = set()


async def _poll_challenge_submission(submission_id: str):
    """Background task to poll IBM for job completion.
    Spawns new polling tasks for cascaded jobs."""
    from ..database import SessionLocal

    if submission_id in _active_challenge_pollers:
        return
    _active_challenge_pollers.add(submission_id)

    try:
        max_polls = 120
        for i in range(max_polls):
            await asyncio.sleep(30)
            db = SessionLocal()
            try:
                sub = db.query(ChallengeSubmission).filter(
                    ChallengeSubmission.id == submission_id
                ).first()
                if not sub or sub.status not in ("running",):
                    break
                sub, newly_started = challenge_queue.check_job_status(db, sub)
                if newly_started:
                    asyncio.ensure_future(_poll_challenge_submission(newly_started.id))
                if sub.status in ("completed", "failed"):
                    break
            finally:
                db.close()
    finally:
        _active_challenge_pollers.discard(submission_id)


# ============ Public Endpoints ============

@router.get("/list", response_model=ChallengeListResponse)
async def list_challenges(
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """List all active challenges."""
    challenges = (
        db.query(Challenge)
        .filter(Challenge.is_active == True)
        .order_by(Challenge.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    total = db.query(Challenge).filter(Challenge.is_active == True).count()

    items = []
    for c in challenges:
        # Count participants and top score
        participant_count = (
            db.query(func.count(ChallengeToken.id))
            .filter(ChallengeToken.challenge_id == c.id, ChallengeToken.is_active == True)
            .scalar()
        ) or 0

        top_score = (
            db.query(func.max(ChallengeSubmission.score))
            .filter(
                ChallengeSubmission.challenge_id == c.id,
                ChallengeSubmission.status == "completed",
                ChallengeSubmission.score.isnot(None),
            )
            .scalar()
        )

        items.append(ChallengePublicInfo(
            id=c.id,
            title=c.title,
            description=c.description,
            difficulty=c.difficulty or "medium",
            category=c.category,
            tags=json.loads(c.tags) if c.tags else None,
            is_active=c.is_active,
            deadline=c.deadline,
            total_participants=participant_count,
            top_score=top_score,
        ))

    return ChallengeListResponse(challenges=items, total=total)


@router.get("/search")
async def search_challenges(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    """Search challenges by title, description, category, or tags."""
    query = f"%{q.lower()}%"
    challenges = (
        db.query(Challenge)
        .filter(
            Challenge.is_active == True,
            (
                func.lower(Challenge.title).like(query)
                | func.lower(Challenge.description).like(query)
                | func.lower(Challenge.category).like(query)
                | func.lower(Challenge.tags).like(query)
            ),
        )
        .order_by(Challenge.created_at.desc())
        .limit(20)
        .all()
    )

    items = []
    for c in challenges:
        items.append(ChallengePublicInfo(
            id=c.id,
            title=c.title,
            description=c.description,
            difficulty=c.difficulty or "medium",
            category=c.category,
            tags=json.loads(c.tags) if c.tags else None,
            is_active=c.is_active,
            deadline=c.deadline,
        ))

    return ChallengeListResponse(challenges=items, total=len(items))


@router.get("/info/{challenge_id}")
async def get_challenge_info(challenge_id: str, db: Session = Depends(get_db)):
    """Get public challenge info."""
    challenge = get_challenge(db, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    allowed = json.loads(challenge.allowed_backends) if challenge.allowed_backends else []

    return {
        "id": challenge.id,
        "title": challenge.title,
        "description": challenge.description,
        "difficulty": challenge.difficulty,
        "category": challenge.category,
        "tags": json.loads(challenge.tags) if challenge.tags else [],
        "deadline": challenge.deadline.isoformat() if challenge.deadline else None,
        "starter_code": challenge.starter_code,
        "allowed_backends": allowed,
        "default_shots": 1024,
        "is_active": challenge.is_active,
    }


# ============ Token Verification ============

@router.post("/verify-token", response_model=ChallengeTokenVerifyResponse)
async def verify_token(req: ChallengeTokenVerifyRequest, db: Session = Depends(get_db)):
    """Verify a participant's challenge token."""
    token_record = verify_challenge_token(db, req.token)
    if not token_record:
        return ChallengeTokenVerifyResponse(valid=False, error="Invalid or expired token")

    challenge = token_record.challenge
    allowed = json.loads(challenge.allowed_backends) if challenge.allowed_backends else []
    has_budget, remaining = check_budget(token_record)

    return ChallengeTokenVerifyResponse(
        valid=True,
        challenge_id=challenge.id,
        challenge_title=challenge.title,
        description=challenge.description,
        difficulty=challenge.difficulty,
        category=challenge.category,
        tags=json.loads(challenge.tags) if challenge.tags else None,
        budget_total_seconds=token_record.budget_limit_seconds,
        budget_used_seconds=token_record.budget_used_seconds,
        budget_remaining_seconds=remaining,
        submission_count=token_record.submission_count,
        allowed_backends=allowed,
        deadline=challenge.deadline,
        starter_code=challenge.starter_code,
        display_name=token_record.display_name,
        method_name=token_record.method_name,
        participant_label=get_participant_label(token_record),
    )


# ============ Profile ============

@router.post("/update-profile", response_model=ChallengeUpdateProfileResponse)
async def update_profile(req: ChallengeUpdateProfileRequest, db: Session = Depends(get_db)):
    """Update participant's display name and method name."""
    token_record = verify_challenge_token(db, req.token)
    if not token_record:
        raise HTTPException(status_code=401, detail="Invalid token")

    if req.display_name is not None:
        token_record.display_name = req.display_name.strip()[:30] if req.display_name else None
    if req.method_name is not None:
        token_record.method_name = req.method_name.strip()[:50] if req.method_name else None
    db.commit()

    return ChallengeUpdateProfileResponse(
        display_name=token_record.display_name,
        method_name=token_record.method_name,
    )


# ============ Submission ============

@router.post("/submit", response_model=ChallengeSubmissionResponse)
async def submit_code(
    req: ChallengeSubmitRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Submit code for hardware execution."""
    token_record = verify_challenge_token(db, req.token)
    if not token_record:
        raise HTTPException(status_code=401, detail="Invalid token")

    challenge = token_record.challenge

    # Validate backend
    allowed = json.loads(challenge.allowed_backends) if challenge.allowed_backends else []
    if req.backend not in allowed:
        raise HTTPException(status_code=400, detail=f"Backend '{req.backend}' not allowed")

    # Check budget
    has_budget, remaining = check_budget(token_record)
    if not has_budget:
        raise HTTPException(status_code=400, detail=f"Budget exhausted ({remaining:.0f}s remaining)")

    # Validate code
    is_valid, error = validate_code(req.code)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Code validation failed: {error}")

    # Enqueue
    submission = challenge_queue.enqueue(
        db=db,
        challenge=challenge,
        token_record=token_record,
        code=req.code,
        backend_name=req.backend,
        shots=req.shots,
    )

    # Try to process immediately
    started = challenge_queue.process_next(db, challenge.id)
    if started:
        background_tasks.add_task(_poll_challenge_submission, started.id)

    db.refresh(submission)
    return _format_submission(submission)


@router.get("/status/{submission_id}", response_model=ChallengeSubmissionResponse)
async def get_submission_status(
    submission_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Get submission status. Polls IBM if running."""
    sub = db.query(ChallengeSubmission).filter(ChallengeSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    if sub.status == "running":
        sub, newly_started = challenge_queue.check_job_status(db, sub)
        db.refresh(sub)

        if sub.status == "running" and sub.id not in _active_challenge_pollers:
            background_tasks.add_task(_poll_challenge_submission, sub.id)

        if newly_started and newly_started.id not in _active_challenge_pollers:
            background_tasks.add_task(_poll_challenge_submission, newly_started.id)

    return _format_submission(sub)


@router.get("/submissions", response_model=ChallengeSubmissionListResponse)
async def get_submissions(
    token: str = Query(...),
    challenge_id: str = Query(...),
    db: Session = Depends(get_db),
):
    """Get all submissions for a participant."""
    token_record = verify_challenge_token(db, token)
    if not token_record:
        raise HTTPException(status_code=401, detail="Invalid token")

    subs = (
        db.query(ChallengeSubmission)
        .filter(
            ChallengeSubmission.token_id == token_record.id,
            ChallengeSubmission.challenge_id == challenge_id,
        )
        .order_by(ChallengeSubmission.created_at.desc())
        .all()
    )

    return ChallengeSubmissionListResponse(
        submissions=[_format_submission(s) for s in subs],
        total=len(subs),
    )


# ============ Queue ============

@router.get("/queue/{challenge_id}", response_model=ChallengeQueueStatusResponse)
async def get_queue_status(
    challenge_id: str,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get queue status for a challenge."""
    token_record = None
    if token:
        token_record = verify_challenge_token(db, token)

    status_data = challenge_queue.get_queue_status(db, challenge_id, token_record)

    return ChallengeQueueStatusResponse(
        queue=[ChallengeQueueEntry(**e) for e in status_data["queue"]],
        running=[ChallengeRunningEntry(**e) for e in status_data["running"]],
        my_submissions=[ChallengeMyQueueEntry(**e) for e in status_data["my_submissions"]],
        total_queued=status_data["total_queued"],
        total_running=status_data["total_running"],
        estimated_wait_minutes=status_data["estimated_wait_minutes"],
    )


# ============ Leaderboard ============

@router.get("/leaderboard/{challenge_id}", response_model=ChallengeLeaderboardResponse)
async def get_leaderboard(
    challenge_id: str,
    db: Session = Depends(get_db),
):
    """Get per-challenge leaderboard ranked by score."""
    challenge = get_challenge(db, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # Best submission per participant (highest score)
    from sqlalchemy.orm import aliased
    best_sub = (
        db.query(
            ChallengeSubmission.token_id,
            func.max(ChallengeSubmission.score).label("best_score"),
        )
        .filter(
            ChallengeSubmission.challenge_id == challenge_id,
            ChallengeSubmission.status == "completed",
            ChallengeSubmission.score.isnot(None),
        )
        .group_by(ChallengeSubmission.token_id)
        .subquery()
    )

    # Join to get full submission details
    submissions = (
        db.query(ChallengeSubmission)
        .join(
            best_sub,
            (ChallengeSubmission.token_id == best_sub.c.token_id)
            & (ChallengeSubmission.score == best_sub.c.best_score),
        )
        .filter(
            ChallengeSubmission.challenge_id == challenge_id,
            ChallengeSubmission.status == "completed",
        )
        .order_by(ChallengeSubmission.score.desc())
        .all()
    )

    # Deduplicate (in case of ties within same participant)
    seen_tokens = set()
    entries = []
    rank = 0
    for sub in submissions:
        if sub.token_id in seen_tokens:
            continue
        seen_tokens.add(sub.token_id)
        rank += 1

        token_record = sub.token
        label = get_participant_label(token_record) if token_record else "unknown"

        entries.append(ChallengeLeaderboardEntry(
            rank=rank,
            submission_id=sub.id,
            participant_label=label,
            display_name=token_record.display_name if token_record else None,
            method_name=token_record.method_name if token_record else None,
            score=sub.score or 0.0,
            submitted_at=sub.created_at,
            backend_name=sub.backend_name,
        ))

    total_participants = (
        db.query(func.count(func.distinct(ChallengeSubmission.token_id)))
        .filter(
            ChallengeSubmission.challenge_id == challenge_id,
            ChallengeSubmission.status == "completed",
        )
        .scalar()
    ) or 0

    return ChallengeLeaderboardResponse(
        challenge_id=challenge.id,
        challenge_title=challenge.title,
        leaderboard=entries,
        total_participants=total_participants,
        updated_at=datetime.utcnow(),
    )


# ============ Global Leaderboards ============

@router.get("/global-leaderboard", response_model=GlobalProgrammerLeaderboardResponse)
async def get_global_leaderboard(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Aggregate programmer leaderboard across all challenges. Best score per challenge per participant, summed."""
    # Best score per (token_id, challenge_id) pair
    best_per_challenge = (
        db.query(
            ChallengeSubmission.token_id,
            ChallengeSubmission.challenge_id,
            func.max(ChallengeSubmission.score).label("best_score"),
        )
        .filter(
            ChallengeSubmission.status == "completed",
            ChallengeSubmission.score.isnot(None),
        )
        .group_by(ChallengeSubmission.token_id, ChallengeSubmission.challenge_id)
        .subquery()
    )

    # Sum best scores across challenges
    aggregated = (
        db.query(
            best_per_challenge.c.token_id,
            func.sum(best_per_challenge.c.best_score).label("total_score"),
            func.count(best_per_challenge.c.challenge_id).label("challenges_solved"),
        )
        .group_by(best_per_challenge.c.token_id)
        .order_by(desc("total_score"))
        .limit(limit)
        .all()
    )

    entries = []
    for rank, (token_id, total_score, challenges_solved) in enumerate(aggregated, 1):
        token_record = db.query(ChallengeToken).filter(ChallengeToken.id == token_id).first()
        label = get_participant_label(token_record) if token_record else "unknown"

        entries.append(GlobalProgrammerEntry(
            rank=rank,
            participant_label=label,
            display_name=token_record.display_name if token_record else None,
            total_score=float(total_score or 0),
            challenges_solved=int(challenges_solved or 0),
        ))

    total = (
        db.query(func.count(func.distinct(ChallengeSubmission.token_id)))
        .filter(ChallengeSubmission.status == "completed", ChallengeSubmission.score.isnot(None))
        .scalar()
    ) or 0

    return GlobalProgrammerLeaderboardResponse(
        leaderboard=entries,
        total_participants=total,
        updated_at=datetime.utcnow(),
    )


@router.get("/global-hardware-ranking", response_model=GlobalHardwareLeaderboardResponse)
async def get_global_hardware_ranking(
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Aggregate hardware ranking: avg score per backend across all challenges."""
    rankings = (
        db.query(
            ChallengeSubmission.backend_name,
            func.avg(ChallengeSubmission.score).label("avg_score"),
            func.count(ChallengeSubmission.id).label("total_jobs"),
            func.count(func.distinct(ChallengeSubmission.token_id)).label("unique_participants"),
        )
        .filter(
            ChallengeSubmission.status == "completed",
            ChallengeSubmission.score.isnot(None),
        )
        .group_by(ChallengeSubmission.backend_name)
        .order_by(desc("avg_score"))
        .limit(limit)
        .all()
    )

    entries = []
    for rank, (backend, avg_score, total_jobs, unique_participants) in enumerate(rankings, 1):
        entries.append(GlobalHardwareEntry(
            rank=rank,
            backend_name=backend,
            avg_score=float(avg_score or 0),
            total_jobs=int(total_jobs or 0),
            unique_participants=int(unique_participants or 0),
        ))

    return GlobalHardwareLeaderboardResponse(
        leaderboard=entries,
        total_backends=len(entries),
        updated_at=datetime.utcnow(),
    )


# ============ Simulator ============

@router.post("/simulate", response_model=ChallengeSimulateResponse)
async def simulate_challenge(req: ChallengeSimulateRequest, db: Session = Depends(get_db)):
    """Run on noisy simulator with challenge's evaluate_code."""
    challenge = get_challenge(db, req.challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    async with _simulation_semaphore:
        import asyncio
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: simulate_challenge_noisy(
                challenge=challenge,
                student_circuit_code=req.code,
                shots=req.shots,
                single_qubit_error=req.single_qubit_error,
                two_qubit_error=req.two_qubit_error,
            ),
        )

    if not result.get("success"):
        return ChallengeSimulateResponse(success=False, error=result.get("error"))

    return ChallengeSimulateResponse(
        success=True,
        score=result.get("score"),
        measurements=result.get("measurements"),
        qubit_count=result.get("qubit_count"),
        gate_count=result.get("gate_count"),
        circuit_depth=result.get("circuit_depth"),
        execution_time_ms=result.get("execution_time_ms"),
        backend=result.get("backend", "noisy_simulator"),
    )


# ============ Admin Endpoints ============

@router.post("/admin/create", response_model=ChallengeCreateResponse)
async def admin_create_challenge(
    req: ChallengeCreateRequest,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Create a new challenge (admin only)."""
    challenge = create_challenge(
        db=db,
        title=req.title,
        ibmq_api_key=req.ibmq_api_key,
        allowed_backends=req.allowed_backends,
        evaluate_code=req.evaluate_code,
        created_by=admin.id,
        description=req.description,
        difficulty=req.difficulty,
        category=req.category,
        tags=req.tags,
        total_budget_seconds=req.total_budget_seconds,
        num_participants=req.num_participants,
        max_concurrent_jobs=req.max_concurrent_jobs,
        deadline=req.deadline,
        reference_circuit=req.reference_circuit,
        starter_code=req.starter_code,
    )
    return ChallengeCreateResponse(
        id=challenge.id,
        title=challenge.title,
        per_participant_budget_seconds=challenge.per_participant_budget_seconds,
        max_concurrent_jobs=challenge.max_concurrent_jobs,
    )


@router.put("/admin/{challenge_id}")
async def admin_update_challenge(
    challenge_id: str,
    req: ChallengeUpdateRequest,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Update challenge settings (admin only)."""
    challenge = get_challenge(db, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    if req.title is not None:
        challenge.title = req.title
    if req.description is not None:
        challenge.description = req.description
    if req.difficulty is not None:
        challenge.difficulty = req.difficulty
    if req.category is not None:
        challenge.category = req.category
    if req.tags is not None:
        challenge.tags = json.dumps(req.tags)
    if req.allowed_backends is not None:
        challenge.allowed_backends = json.dumps(req.allowed_backends)
    if req.max_concurrent_jobs is not None:
        challenge.max_concurrent_jobs = req.max_concurrent_jobs
    if req.is_active is not None:
        challenge.is_active = req.is_active
    if req.deadline is not None:
        challenge.deadline = req.deadline
    if req.evaluate_code is not None:
        challenge.evaluate_code = req.evaluate_code
    if req.reference_circuit is not None:
        challenge.reference_circuit = req.reference_circuit
    if req.starter_code is not None:
        challenge.starter_code = req.starter_code
    if req.ibmq_api_key is not None:
        challenge.ibmq_api_key_encrypted = encrypt_api_key(req.ibmq_api_key)

    challenge.updated_at = datetime.utcnow()
    db.commit()

    return {"status": "updated", "challenge_id": challenge.id}


@router.post("/admin/{challenge_id}/tokens", response_model=ChallengeGenerateTokensResponse)
async def admin_generate_tokens(
    challenge_id: str,
    req: ChallengeGenerateTokensRequest,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Generate tokens for participants (admin only)."""
    challenge = get_challenge(db, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    entries = []
    if req.participants:
        entries = [(p.uid, p.display_name) for p in req.participants]
    elif req.participant_uids:
        entries = [(uid, None) for uid in req.participant_uids]
    else:
        raise HTTPException(status_code=400, detail="Provide participants or participant_uids")

    results = generate_tokens_for_challenge(db, challenge, entries)

    return ChallengeGenerateTokensResponse(
        tokens=[
            ChallengeTokenEntry(
                participant_uid=r["participant_uid"],
                display_name=r["display_name"],
                token=r["token"],
            )
            for r in results
        ],
        count=len(results),
    )


@router.get("/admin/{challenge_id}/budget", response_model=ChallengeBudgetSummaryResponse)
async def admin_get_budget(
    challenge_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get budget summary for a challenge (admin only)."""
    challenge = get_challenge(db, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    tokens = (
        db.query(ChallengeToken)
        .filter(ChallengeToken.challenge_id == challenge_id)
        .order_by(ChallengeToken.created_at.asc())
        .all()
    )

    total_used = sum(t.budget_used_seconds for t in tokens)
    active_count = sum(1 for t in tokens if t.is_active)

    participants = []
    for t in tokens:
        raw_uid = None
        raw_token = None
        try:
            if t.participant_uid_encrypted:
                raw_uid = decrypt_api_key(t.participant_uid_encrypted)
            if t.token_encrypted:
                raw_token = decrypt_api_key(t.token_encrypted)
        except Exception:
            pass

        participants.append(ChallengeTokenAdminResponse(
            id=t.id,
            participant_uid_hash=t.participant_uid,
            participant_uid_raw=raw_uid,
            display_name=t.display_name,
            token=raw_token,
            budget_used_seconds=t.budget_used_seconds,
            budget_limit_seconds=t.budget_limit_seconds,
            is_active=t.is_active,
            submission_count=t.submission_count,
            last_used_at=t.last_used_at,
            created_at=t.created_at,
        ))

    return ChallengeBudgetSummaryResponse(
        challenge_id=challenge.id,
        challenge_title=challenge.title,
        total_budget_seconds=challenge.total_budget_seconds,
        total_used_seconds=total_used,
        total_remaining_seconds=max(0, challenge.total_budget_seconds - total_used),
        num_participants=len(tokens),
        num_active_tokens=active_count,
        participants=participants,
    )


@router.put("/admin/{challenge_id}/token/{token_id}")
async def admin_update_token(
    challenge_id: str,
    token_id: str,
    req: ChallengeTokenUpdateRequest,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Update a participant's token settings (admin only)."""
    token_record = (
        db.query(ChallengeToken)
        .filter(ChallengeToken.id == token_id, ChallengeToken.challenge_id == challenge_id)
        .first()
    )
    if not token_record:
        raise HTTPException(status_code=404, detail="Token not found")

    if req.is_active is not None:
        token_record.is_active = req.is_active
    if req.budget_limit_seconds is not None:
        token_record.budget_limit_seconds = req.budget_limit_seconds

    db.commit()
    return {"status": "updated"}


@router.get("/admin/{challenge_id}/submissions", response_model=AdminChallengeSubmissionListResponse)
async def admin_get_submissions(
    challenge_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
):
    """Get all submissions for a challenge (admin only)."""
    query = (
        db.query(ChallengeSubmission)
        .filter(ChallengeSubmission.challenge_id == challenge_id)
    )
    if status_filter:
        query = query.filter(ChallengeSubmission.status == status_filter)

    total = query.count()
    subs = (
        query.order_by(ChallengeSubmission.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for s in subs:
        token_record = s.token
        label = get_participant_label(token_record) if token_record else "unknown"

        items.append(AdminChallengeSubmissionResponse(
            id=s.id,
            challenge_id=s.challenge_id,
            token_id=s.token_id,
            status=s.status,
            queue_position=s.queue_position,
            backend_name=s.backend_name,
            shots=s.shots,
            ibmq_job_id=s.ibmq_job_id,
            score=s.score,
            measurements=json.loads(s.measurements) if s.measurements else None,
            qubit_count=s.qubit_count,
            gate_count=s.gate_count,
            circuit_depth=s.circuit_depth,
            execution_time_seconds=s.execution_time_seconds,
            error_message=s.error_message,
            code=s.code,
            created_at=s.created_at,
            started_at=s.started_at,
            completed_at=s.completed_at,
            participant_uid_hash=token_record.participant_uid if token_record else "",
            display_name=token_record.display_name if token_record else None,
            method_name=token_record.method_name if token_record else None,
            participant_label=label,
        ))

    return AdminChallengeSubmissionListResponse(
        submissions=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/admin/submission/{submission_id}", response_model=AdminChallengeSubmissionResponse)
async def admin_get_submission(
    submission_id: str,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get a single submission (admin only)."""
    s = db.query(ChallengeSubmission).filter(ChallengeSubmission.id == submission_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")

    token_record = s.token
    label = get_participant_label(token_record) if token_record else "unknown"

    return AdminChallengeSubmissionResponse(
        id=s.id,
        challenge_id=s.challenge_id,
        token_id=s.token_id,
        status=s.status,
        queue_position=s.queue_position,
        backend_name=s.backend_name,
        shots=s.shots,
        ibmq_job_id=s.ibmq_job_id,
        score=s.score,
        measurements=json.loads(s.measurements) if s.measurements else None,
        qubit_count=s.qubit_count,
        gate_count=s.gate_count,
        circuit_depth=s.circuit_depth,
        execution_time_seconds=s.execution_time_seconds,
        error_message=s.error_message,
        code=s.code,
        created_at=s.created_at,
        started_at=s.started_at,
        completed_at=s.completed_at,
        participant_uid_hash=token_record.participant_uid if token_record else "",
        display_name=token_record.display_name if token_record else None,
        method_name=token_record.method_name if token_record else None,
        participant_label=label,
    )


@router.get("/admin/list")
async def admin_list_challenges(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """List all challenges including inactive (admin only)."""
    challenges = db.query(Challenge).order_by(Challenge.created_at.desc()).all()
    return {
        "challenges": [
            {
                "id": c.id,
                "title": c.title,
                "difficulty": c.difficulty,
                "category": c.category,
                "is_active": c.is_active,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "deadline": c.deadline.isoformat() if c.deadline else None,
                "num_tokens": len(c.tokens),
                "num_submissions": len(c.submissions),
            }
            for c in challenges
        ],
        "total": len(challenges),
    }


# ============ Helpers ============

def _format_submission(s: ChallengeSubmission) -> ChallengeSubmissionResponse:
    """Format a submission for API response."""
    return ChallengeSubmissionResponse(
        id=s.id,
        challenge_id=s.challenge_id,
        status=s.status,
        queue_position=s.queue_position,
        backend_name=s.backend_name,
        shots=s.shots,
        ibmq_job_id=s.ibmq_job_id,
        score=s.score,
        measurements=json.loads(s.measurements) if s.measurements else None,
        qubit_count=s.qubit_count,
        gate_count=s.gate_count,
        circuit_depth=s.circuit_depth,
        execution_time_seconds=s.execution_time_seconds,
        code=s.code,
        error_message=s.error_message,
        created_at=s.created_at,
        started_at=s.started_at,
        completed_at=s.completed_at,
    )

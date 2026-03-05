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
from ..models.homework import Homework, HomeworkToken, HomeworkSubmission, FakeHardwareSubmission
from ..services.homework_service import (
    verify_homework_token,
    create_homework,
    generate_tokens_for_homework,
    get_homework,
    get_student_label,
    check_budget,
    encrypt_api_key,
    decrypt_api_key,
    simulate_homework_noisy,
    simulate_fake_hardware,
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
    HardwareRankingEntry,
    HardwareRankingResponse,
    HomeworkCreateRequest,
    HomeworkCreateResponse,
    HomeworkGenerateTokensRequest,
    HomeworkGenerateTokensResponse,
    HomeworkTokenEntry,
    HomeworkTokenAdminResponse,
    HomeworkBudgetSummaryResponse,
    HomeworkUpdateRequest,
    HomeworkTokenUpdateRequest,
    HomeworkInfoResponse,
    HomeworkSimulateRequest,
    HomeworkSimulateResponse,
    HomeworkCheckTranspileRequest,
    HomeworkCheckTranspileResponse,
    HomeworkUpdateProfileRequest,
    HomeworkUpdateProfileResponse,
    AdminSubmissionResponse,
    AdminSubmissionListResponse,
    AdminDirectSubmitRequest,
    StudentEntry,
    FakeHardwareSubmitRequest,
    FakeHardwareSubmitResponse,
    FakeHardwareLeaderboardEntry,
    FakeHardwareLeaderboardResponse,
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
        display_name=token_record.display_name,
        method_name=token_record.method_name,
    )


@router.post("/update-profile", response_model=HomeworkUpdateProfileResponse)
async def update_student_profile(
    request: HomeworkUpdateProfileRequest,
    db: Session = Depends(get_db),
):
    """Update student's leaderboard display name and method name."""
    token_record = verify_homework_token(db, request.token)
    if not token_record:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if request.display_name is not None:
        # Sanitize: strip whitespace, limit length
        name = request.display_name.strip()[:30]
        token_record.display_name = name if name else None
    if request.method_name is not None:
        name = request.method_name.strip()[:50]
        token_record.method_name = name if name else None

    db.commit()

    return HomeworkUpdateProfileResponse(
        display_name=token_record.display_name,
        method_name=token_record.method_name,
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

    # Validate backend exists in our known backends
    known_backends = [
        "ibm_torino", "ibm_fez", "ibm_kingston",
        "ibm_marrakesh", "ibm_boston", "ibm_pittsburgh", "ibm_miami",
    ]
    if request.backend not in known_backends:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown backend '{request.backend}'. Choose from: {known_backends}",
        )

    # Validate student's circuit
    is_valid, error = validate_code(request.code)
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail=f"Circuit validation error: {error}",
        )

    # Validate eval_method
    eval_method = request.eval_method
    if eval_method not in ("inverse_bell", "tomography"):
        raise HTTPException(
            status_code=400,
            detail="Invalid eval_method. Use 'inverse_bell' or 'tomography'.",
        )

    # Enqueue the submission (reference circuit comes from homework config)
    submission = homework_queue.enqueue(
        db=db,
        homework=homework,
        token_record=token_record,
        code=request.code,
        backend_name=request.backend,
        shots=request.shots,
        eval_method=eval_method,
        custom_api_key=request.ibmq_api_key,
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

    queue_data = homework_queue.get_queue_status(db, homework.id, token_record)

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

    # Use the resolved UUID for all DB queries (homework_id param may be a slug)
    hw_id = homework.id

    # Get ALL completed submissions, ranked by fidelity
    results = (
        db.query(HomeworkSubmission, HomeworkToken)
        .join(HomeworkToken, HomeworkSubmission.token_id == HomeworkToken.id)
        .filter(
            HomeworkSubmission.homework_id == hw_id,
            HomeworkSubmission.status == "completed",
            HomeworkSubmission.fidelity_after.isnot(None),
        )
        .order_by(desc(HomeworkSubmission.fidelity_after))
        .all()
    )

    # Build leaderboard entries — each submission is a separate entry
    entries = []
    for rank, (sub, token) in enumerate(results, start=1):
        entries.append(
            HomeworkLeaderboardEntry(
                rank=rank,
                submission_id=sub.id,
                student_label=get_student_label(token),
                display_name=token.display_name,
                method_name=token.method_name,
                fidelity_before=sub.fidelity_before or 0.0,
                fidelity_after=sub.fidelity_after or 0.0,
                fidelity_improvement=sub.fidelity_improvement or 0.0,
                score=sub.score or 0,
                submitted_at=sub.completed_at,
                backend_name=sub.backend_name,
                success_probability=sub.success_probability,
                eval_method=sub.eval_method or "legacy",
            )
        )

    total_students = (
        db.query(HomeworkToken)
        .filter(HomeworkToken.homework_id == hw_id)
        .count()
    )

    return HomeworkLeaderboardResponse(
        homework_id=hw_id,
        homework_title=homework.title,
        leaderboard=entries,
        total_students=total_students,
        updated_at=datetime.utcnow(),
    )


@router.get("/hardware-ranking/{homework_id}", response_model=HardwareRankingResponse)
async def get_hardware_ranking(
    homework_id: str,
    db: Session = Depends(get_db),
):
    """Get hardware ranking by average fidelity across all completed submissions."""
    homework = get_homework(db, homework_id)
    if not homework:
        raise HTTPException(status_code=404, detail="Homework not found")

    hw_id = homework.id

    # Aggregate per backend
    backend_stats = (
        db.query(
            HomeworkSubmission.backend_name,
            func.avg(HomeworkSubmission.fidelity_before).label("avg_fidelity_before"),
            func.avg(HomeworkSubmission.fidelity_after).label("avg_fidelity_after"),
            func.avg(HomeworkSubmission.fidelity_improvement).label("avg_improvement"),
            func.max(HomeworkSubmission.fidelity_after).label("best_fidelity"),
            func.min(HomeworkSubmission.fidelity_after).label("worst_fidelity"),
            func.count(HomeworkSubmission.id).label("total_jobs"),
            func.count(func.distinct(HomeworkSubmission.token_id)).label("unique_students"),
            func.avg(HomeworkSubmission.success_probability).label("avg_success_prob"),
        )
        .filter(
            HomeworkSubmission.homework_id == hw_id,
            HomeworkSubmission.status == "completed",
            HomeworkSubmission.fidelity_after.isnot(None),
            HomeworkSubmission.backend_name.isnot(None),
        )
        .group_by(HomeworkSubmission.backend_name)
        .order_by(desc("avg_fidelity_after"))
        .all()
    )

    total_completed = (
        db.query(HomeworkSubmission)
        .filter(
            HomeworkSubmission.homework_id == hw_id,
            HomeworkSubmission.status == "completed",
            HomeworkSubmission.fidelity_after.isnot(None),
        )
        .count()
    )

    rankings = []
    for rank, row in enumerate(backend_stats, 1):
        rankings.append(
            HardwareRankingEntry(
                rank=rank,
                backend_name=row.backend_name,
                avg_fidelity_before=round(float(row.avg_fidelity_before or 0), 6),
                avg_fidelity_after=round(float(row.avg_fidelity_after or 0), 6),
                avg_fidelity_improvement=round(float(row.avg_improvement or 0), 6),
                best_fidelity_after=round(float(row.best_fidelity or 0), 6),
                worst_fidelity_after=round(float(row.worst_fidelity or 0), 6),
                total_jobs=row.total_jobs,
                unique_students=row.unique_students,
                avg_success_probability=round(float(row.avg_success_prob), 6) if row.avg_success_prob else None,
            )
        )

    return HardwareRankingResponse(
        homework_id=hw_id,
        homework_title=homework.title,
        rankings=rankings,
        total_completed_jobs=total_completed,
        updated_at=datetime.utcnow(),
    )


# ============ Public Info & Simulator ============

@router.get("/info/{homework_id}", response_model=HomeworkInfoResponse)
async def get_homework_info(
    homework_id: str,
    db: Session = Depends(get_db),
):
    """Get public homework info. No auth required."""
    homework = get_homework(db, homework_id)
    if not homework or not homework.is_active:
        raise HTTPException(status_code=404, detail="Homework not found")

    allowed_backends = json.loads(homework.allowed_backends)

    return HomeworkInfoResponse(
        id=homework.id,
        title=homework.title,
        course=homework.course,
        description=homework.description,
        deadline=homework.deadline,
        reference_circuit=homework.reference_circuit,
        allowed_backends=allowed_backends,
        default_shots=1024,
        is_active=homework.is_active,
    )


@router.post("/simulate", response_model=HomeworkSimulateResponse)
async def simulate_homework(
    request: HomeworkSimulateRequest,
    db: Session = Depends(get_db),
):
    """
    Run student code on noisy simulator. No token required.
    Modes:
      - distillation: runs reference + student circuits, uses student POST_SELECT
      - bell_pair: runs only student circuit, returns fidelity only
    """
    homework = get_homework(db, request.homework_id)
    if not homework:
        raise HTTPException(status_code=404, detail="Homework not found")

    if request.mode not in ("distillation", "bell_pair"):
        raise HTTPException(status_code=400, detail="Invalid mode. Use 'distillation' or 'bell_pair'.")

    # Validate student code
    is_valid, error = validate_code(request.code)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Code validation error: {error}")

    # Validate eval_method
    eval_method = request.eval_method
    if eval_method not in ("inverse_bell", "tomography"):
        raise HTTPException(
            status_code=400,
            detail="Invalid eval_method. Use 'inverse_bell' or 'tomography'.",
        )

    # Run noisy simulation
    result = simulate_homework_noisy(
        reference_circuit_code=homework.reference_circuit,
        student_circuit_code=request.code,
        shots=request.shots,
        judge_code=homework.judge_code if request.mode == "distillation" else None,
        mode=request.mode,
        eval_method=eval_method,
        single_qubit_error=request.single_qubit_error,
        two_qubit_error=request.two_qubit_error,
    )

    return HomeworkSimulateResponse(**result)


@router.post("/check-transpile", response_model=HomeworkCheckTranspileResponse)
async def check_transpile(
    request: HomeworkCheckTranspileRequest,
    db: Session = Depends(get_db),
):
    """
    Preview how student code would be transpiled for a specific backend.
    Shows extracted INITIAL_LAYOUT, circuit stats, and transpiled QASM.
    No token required — for debugging purposes.
    """
    from ..services.code_validator import execute_circuit_code

    homework = get_homework(db, request.homework_id)
    if not homework:
        raise HTTPException(status_code=404, detail="Homework not found")

    # Validate backend exists in our known backends
    backend_qubit_counts = {
        "ibm_torino": 133,
        "ibm_fez": 156, "ibm_kingston": 156,
        "ibm_marrakesh": 156, "ibm_boston": 156,
        "ibm_pittsburgh": 156, "ibm_miami": 120,
    }
    if request.backend_name not in backend_qubit_counts:
        raise HTTPException(status_code=400, detail=f"Unknown backend {request.backend_name}")

    # Validate and parse code
    is_valid, error = validate_code(request.code)
    if not is_valid:
        return HomeworkCheckTranspileResponse(success=False, error=f"Code validation error: {error}")

    circuit, post_select, initial_layout, err = execute_circuit_code(request.code)
    if circuit is None:
        return HomeworkCheckTranspileResponse(success=False, error=f"Circuit parse error: {err}")

    # Add measurements if not present
    if not any(instr.operation.name == "measure" for instr in circuit.data):
        circuit.measure_all()

    try:
        from qiskit.transpiler import generate_preset_pass_manager
        from qiskit.providers.fake_provider import GenericBackendV2

        # Use GenericBackendV2 for local transpilation preview
        num_qubits = backend_qubit_counts.get(request.backend_name, 156)
        fake_backend = GenericBackendV2(num_qubits=num_qubits)

        pm_kwargs = {"backend": fake_backend, "optimization_level": 3}
        if initial_layout:
            pm_kwargs["initial_layout"] = initial_layout
        pm = generate_preset_pass_manager(**pm_kwargs)

        # Prepare circuit with eval method
        eval_method = request.eval_method or "inverse_bell"
        if eval_method == "inverse_bell":
            from ..services.homework_queue import prepare_inverse_bell_circuit
            test_circuit = prepare_inverse_bell_circuit(circuit)
        else:
            from ..services.homework_queue import prepare_tomography_circuits
            tomo = prepare_tomography_circuits(circuit)
            test_circuit = tomo["ZZ"]  # Show ZZ basis as representative

        transpiled = pm.run(test_circuit)

        # Extract physical qubit mapping
        physical_qubits = None
        if transpiled.layout and transpiled.layout.initial_layout:
            layout = transpiled.layout.initial_layout
            # Get virtual -> physical mapping
            physical_qubits = [layout[q] for q in test_circuit.qubits]

        transpiled_qasm = transpiled.qasm() if hasattr(transpiled, 'qasm') else str(transpiled.draw(output='text'))

        return HomeworkCheckTranspileResponse(
            success=True,
            initial_layout=initial_layout,
            post_select=list(post_select) if post_select else None,
            qubit_count=circuit.num_qubits,
            gate_count=len(circuit.data),
            circuit_depth=circuit.depth(),
            transpiled_qasm=transpiled_qasm,
            transpiled_depth=transpiled.depth(),
            transpiled_gate_count=len(transpiled.data),
            transpiled_qubit_count=transpiled.num_qubits,
            physical_qubits=physical_qubits,
        )
    except Exception as e:
        return HomeworkCheckTranspileResponse(
            success=True,
            initial_layout=initial_layout,
            post_select=list(post_select) if post_select else None,
            qubit_count=circuit.num_qubits,
            gate_count=len(circuit.data),
            circuit_depth=circuit.depth(),
            error=f"Transpilation preview failed: {str(e)}",
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
    """Generate tokens for a list of students (admin only). Raw tokens returned once."""
    homework = get_homework(db, homework_id)
    if not homework:
        raise HTTPException(status_code=404, detail="Homework not found")

    # Support both legacy (student_uids) and new (students with names) format
    if request.students:
        student_entries = [(s.uid, s.display_name) for s in request.students]
    elif request.student_uids:
        student_entries = [(uid, None) for uid in request.student_uids]
    else:
        raise HTTPException(status_code=400, detail="Provide 'students' or 'student_uids'")

    results = generate_tokens_for_homework(db, homework, student_entries)

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
        .filter(HomeworkToken.homework_id == homework.id)
        .order_by(HomeworkToken.created_at.asc())
        .all()
    )

    return [_format_token_admin(t) for t in tokens]


def _format_token_admin(t: HomeworkToken) -> HomeworkTokenAdminResponse:
    """Format a token record for admin response, decrypting raw token and UID if available."""
    raw_token = None
    raw_uid = None
    if t.token_encrypted:
        try:
            raw_token = decrypt_api_key(t.token_encrypted)
        except Exception:
            pass
    if t.student_uid_encrypted:
        try:
            raw_uid = decrypt_api_key(t.student_uid_encrypted)
        except Exception:
            pass
    return HomeworkTokenAdminResponse(
        id=t.id,
        student_uid_hash=t.student_uid,
        student_uid_raw=raw_uid,
        display_name=t.display_name,
        token=raw_token,
        budget_used_seconds=t.budget_used_seconds,
        budget_limit_seconds=t.budget_limit_seconds,
        is_active=t.is_active,
        submission_count=t.submission_count,
        last_used_at=t.last_used_at,
        created_at=t.created_at,
    )


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
        .filter(HomeworkToken.homework_id == homework.id)
        .all()
    )

    total_used = sum(t.budget_used_seconds for t in tokens)
    active_count = sum(1 for t in tokens if t.is_active)

    students = [_format_token_admin(t) for t in tokens]

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
    if request.ibmq_api_key is not None:
        homework.ibmq_api_key_encrypted = encrypt_api_key(request.ibmq_api_key)

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


# ============ Admin: Submissions, Delete, Direct Submit ============


@router.get("/admin/{homework_id}/submissions", response_model=AdminSubmissionListResponse)
async def admin_get_submissions(
    homework_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Get all submissions for a homework with full student info (admin only)."""
    homework = get_homework(db, homework_id)
    if not homework:
        raise HTTPException(status_code=404, detail="Homework not found")

    hw_id = homework.id

    query = (
        db.query(HomeworkSubmission, HomeworkToken)
        .join(HomeworkToken, HomeworkSubmission.token_id == HomeworkToken.id)
        .filter(HomeworkSubmission.homework_id == hw_id)
    )

    if status_filter:
        query = query.filter(HomeworkSubmission.status == status_filter)

    total = query.count()

    results = (
        query
        .order_by(HomeworkSubmission.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    submissions = []
    for sub, token in results:
        submissions.append(
            AdminSubmissionResponse(
                id=sub.id,
                homework_id=sub.homework_id,
                token_id=sub.token_id,
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
                success_probability=sub.success_probability,
                post_selected_shots=sub.post_selected_shots,
                eval_method=sub.eval_method or "legacy",
                tomography_correlators=json.loads(sub.tomography_correlators) if sub.tomography_correlators else None,
                error_message=sub.error_message,
                code_before=sub.code_before,
                code_after=sub.code_after,
                created_at=sub.created_at,
                started_at=sub.started_at,
                completed_at=sub.completed_at,
                student_uid_hash=token.student_uid,
                display_name=token.display_name,
                method_name=token.method_name,
                student_label=get_student_label(token),
            )
        )

    return AdminSubmissionListResponse(
        submissions=submissions,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.delete("/admin/submissions/{submission_id}")
async def admin_delete_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Delete a submission (admin only). Running IBM jobs are not cancelled."""
    submission = db.query(HomeworkSubmission).filter(
        HomeworkSubmission.id == submission_id
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    homework_id = submission.homework_id
    was_queued = submission.status == "queued"

    db.delete(submission)
    db.commit()

    # Recalculate queue positions if a queued job was removed
    if was_queued:
        homework_queue._recalculate_positions(db, homework_id)

    return {"message": "Submission deleted", "id": submission_id}


@router.post("/admin/{homework_id}/submit", response_model=HomeworkSubmissionResponse)
async def admin_direct_submit(
    homework_id: str,
    request: AdminDirectSubmitRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin direct submit: enqueue a job without a student token."""
    homework = get_homework(db, homework_id)
    if not homework:
        raise HTTPException(status_code=404, detail="Homework not found")

    # Validate backend
    known_backends = [
        "ibm_torino", "ibm_fez", "ibm_kingston",
        "ibm_marrakesh", "ibm_boston", "ibm_pittsburgh", "ibm_miami",
    ]
    if request.backend_name not in known_backends:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown backend '{request.backend_name}'",
        )

    # Validate circuit code
    is_valid, error = validate_code(request.code)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Circuit validation error: {error}")

    if request.eval_method not in ("inverse_bell", "tomography"):
        raise HTTPException(status_code=400, detail="eval_method must be 'inverse_bell' or 'tomography'")

    # Get or create special admin token for this homework
    admin_uid = "__admin__"
    admin_token = (
        db.query(HomeworkToken)
        .filter(
            HomeworkToken.homework_id == homework.id,
            HomeworkToken.student_uid == admin_uid,
        )
        .first()
    )

    if not admin_token:
        admin_token = HomeworkToken(
            homework_id=homework.id,
            student_uid=admin_uid,
            token_hash="__admin_no_token__",
            budget_limit_seconds=999999,
            is_active=True,
            display_name=request.label or "Admin",
        )
        db.add(admin_token)
        db.commit()
        db.refresh(admin_token)

    if request.label and admin_token.display_name != request.label:
        admin_token.display_name = request.label
        db.commit()

    # Enqueue via existing queue system
    submission = homework_queue.enqueue(
        db=db,
        homework=homework,
        token_record=admin_token,
        code=request.code,
        backend_name=request.backend_name,
        shots=request.shots,
        eval_method=request.eval_method,
    )

    started = homework_queue.process_next(db, homework.id)
    if started:
        background_tasks.add_task(_poll_submission_status, started.id)

    db.refresh(submission)
    return _format_submission(submission)


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
        success_probability=sub.success_probability,
        post_selected_shots=sub.post_selected_shots,
        eval_method=sub.eval_method or "legacy",
        tomography_correlators=json.loads(sub.tomography_correlators) if sub.tomography_correlators else None,
        error_message=sub.error_message,
        created_at=sub.created_at,
        started_at=sub.started_at,
        completed_at=sub.completed_at,
    )


# ============ Fake Hardware (4x4 Grid) ============


@router.post("/fake-hardware/submit", response_model=FakeHardwareSubmitResponse)
async def submit_to_fake_hardware(
    request: FakeHardwareSubmitRequest,
    db: Session = Depends(get_db),
):
    """Submit a circuit to the fake 4x4 grid hardware (noisy simulation with topology)."""
    homework = get_homework(db, request.homework_id)
    if not homework:
        raise HTTPException(status_code=404, detail="Homework not found")
    if not homework.is_active:
        raise HTTPException(status_code=400, detail="Homework is not active")

    # Verify token
    token_record = verify_homework_token(db, request.token)
    if not token_record:
        raise HTTPException(status_code=401, detail="Invalid or inactive token")

    # Validate eval method
    eval_method = request.eval_method.lower()
    if eval_method not in ("inverse_bell", "tomography"):
        raise HTTPException(status_code=400, detail="eval_method must be 'inverse_bell' or 'tomography'")

    # Run on fake hardware
    result = simulate_fake_hardware(
        student_circuit_code=request.code,
        shots=request.shots,
        eval_method=eval_method,
    )

    if not result.get("success"):
        return FakeHardwareSubmitResponse(
            success=False,
            error=result.get("error", "Simulation failed"),
        )

    # Store the submission
    submission = FakeHardwareSubmission(
        homework_id=homework.id,
        token_id=token_record.id,
        code=request.code,
        shots=request.shots,
        eval_method=eval_method,
        initial_layout=json.dumps(result.get("initial_layout")) if result.get("initial_layout") else None,
        measurements=json.dumps(result.get("measurements")),
        fidelity_after=result.get("fidelity_after"),
        success_probability=result.get("success_probability"),
        post_selected_shots=result.get("post_selected_shots"),
        tomography_correlators=json.dumps(result.get("tomography_correlators")) if result.get("tomography_correlators") else None,
        qubit_count=result.get("qubit_count"),
        gate_count=result.get("gate_count"),
        circuit_depth=result.get("circuit_depth"),
        status="completed",
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    return FakeHardwareSubmitResponse(
        success=True,
        submission_id=submission.id,
        fidelity_after=result.get("fidelity_after"),
        success_probability=result.get("success_probability"),
        post_selected_shots=result.get("post_selected_shots"),
        measurements=result.get("measurements"),
        qubit_count=result.get("qubit_count"),
        gate_count=result.get("gate_count"),
        circuit_depth=result.get("circuit_depth"),
        execution_time_ms=result.get("execution_time_ms"),
        eval_method=eval_method,
        tomography_correlators=result.get("tomography_correlators"),
    )


@router.get("/fake-hardware/leaderboard/{homework_id}", response_model=FakeHardwareLeaderboardResponse)
async def get_fake_hardware_leaderboard(
    homework_id: str,
    db: Session = Depends(get_db),
):
    """Get the fake hardware leaderboard showing best result per student."""
    homework = get_homework(db, homework_id)
    if not homework:
        raise HTTPException(status_code=404, detail="Homework not found")

    # Get best fidelity per token (student) using subquery
    from sqlalchemy import and_

    best_sub = (
        db.query(
            FakeHardwareSubmission.token_id,
            func.max(FakeHardwareSubmission.fidelity_after).label("best_fidelity"),
        )
        .filter(
            FakeHardwareSubmission.homework_id == homework.id,
            FakeHardwareSubmission.status == "completed",
            FakeHardwareSubmission.fidelity_after.isnot(None),
        )
        .group_by(FakeHardwareSubmission.token_id)
        .subquery()
    )

    # Join to get full submission details for each student's best result
    results = (
        db.query(FakeHardwareSubmission, HomeworkToken)
        .join(HomeworkToken, FakeHardwareSubmission.token_id == HomeworkToken.id)
        .join(
            best_sub,
            and_(
                FakeHardwareSubmission.token_id == best_sub.c.token_id,
                FakeHardwareSubmission.fidelity_after == best_sub.c.best_fidelity,
            ),
        )
        .filter(
            FakeHardwareSubmission.homework_id == homework.id,
            FakeHardwareSubmission.status == "completed",
        )
        .order_by(desc(FakeHardwareSubmission.fidelity_after))
        .all()
    )

    # Deduplicate (in case of ties, take latest)
    seen_tokens = set()
    entries = []
    rank = 0
    for sub, token in results:
        if token.id in seen_tokens:
            continue
        seen_tokens.add(token.id)
        rank += 1
        entries.append(FakeHardwareLeaderboardEntry(
            rank=rank,
            student_label=token.student_uid[:6] if token.student_uid else "???",
            display_name=token.display_name,
            method_name=token.method_name,
            fidelity_after=sub.fidelity_after,
            success_probability=sub.success_probability,
            eval_method=sub.eval_method or "inverse_bell",
            qubit_count=sub.qubit_count,
            gate_count=sub.gate_count,
            circuit_depth=sub.circuit_depth,
            created_at=sub.created_at.isoformat() if sub.created_at else None,
        ))

    total_students = db.query(HomeworkToken).filter(
        HomeworkToken.homework_id == homework.id,
        HomeworkToken.is_active == True,
    ).count()

    return FakeHardwareLeaderboardResponse(
        entries=entries,
        total_students=total_students,
        updated_at=datetime.utcnow().isoformat(),
    )

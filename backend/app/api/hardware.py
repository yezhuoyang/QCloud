"""
Hardware API endpoints - Direct quantum hardware submission
Allows direct submission without authentication for the code editor
Now includes database persistence for job history
"""
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from ..services.ibmq_service import ibmq_service
from ..config import settings
from ..database import get_db
from ..models import HardwareSubmission
from ..schemas.hardware_submission import (
    HardwareSubmissionResponse,
    HardwareSubmissionListResponse,
    HardwareJobStatusResponse
)

router = APIRouter(prefix="/hardware", tags=["Quantum Hardware"])


class HardwareSubmitRequest(BaseModel):
    """Request model for hardware submission"""
    code: str = Field(..., description="Python code that creates a QuantumCircuit")
    backend: str = Field(default=None, description="Target backend (uses default if not specified)")
    shots: int = Field(default=1024, ge=1, le=100000, description="Number of shots")
    wait_for_result: bool = Field(default=False, description="Wait for job completion (can take several minutes)")
    # User credentials (optional - if not provided, uses platform token)
    token: Optional[str] = Field(default=None, description="User's IBM Quantum API token")
    channel: Optional[str] = Field(default=None, description="IBM channel: ibm_cloud or ibm_quantum")
    instance: Optional[str] = Field(default=None, description="IBM Quantum instance")
    # Optional user_id for tracking (from frontend auth)
    user_id: Optional[str] = Field(default=None, description="User ID for tracking submission history")


class HardwareSubmitResponse(BaseModel):
    """Response model for hardware submission"""
    success: bool
    error: Optional[str] = None
    job_id: Optional[str] = None
    submission_id: Optional[str] = None  # Our database ID
    backend: Optional[str] = None
    status: Optional[str] = None
    shots: Optional[int] = None
    qubitCount: Optional[int] = None
    gateCount: Optional[int] = None
    circuitDepth: Optional[int] = None
    measurements: Optional[Dict[str, int]] = None
    probabilities: Optional[Dict[str, float]] = None
    executionTime: Optional[float] = None


class JobStatusRequest(BaseModel):
    """Request model for job status check"""
    job_id: str = Field(..., description="The IBMQ job ID")
    # User credentials (optional)
    token: Optional[str] = Field(default=None, description="User's IBM Quantum API token")
    channel: Optional[str] = Field(default=None, description="IBM channel: ibm_cloud or ibm_quantum")
    instance: Optional[str] = Field(default=None, description="IBM Quantum instance")


class JobStatusResponse(BaseModel):
    """Response model for job status"""
    success: bool
    error: Optional[str] = None
    job_id: Optional[str] = None
    submission_id: Optional[str] = None  # Our database ID
    status: Optional[str] = None
    measurements: Optional[Dict[str, int]] = None
    probabilities: Optional[Dict[str, float]] = None


class BackendInfo(BaseModel):
    """Backend information"""
    name: str
    num_qubits: Optional[int] = None
    operational: bool = True
    simulator: bool = False


def _save_submission_to_db(
    db: Session,
    code: str,
    backend_name: str,
    shots: int,
    user_id: Optional[str] = None,
    ibmq_job_id: Optional[str] = None,
    status: str = "queued",
    qubit_count: Optional[int] = None,
    gate_count: Optional[int] = None,
    circuit_depth: Optional[int] = None,
    measurements: Optional[Dict[str, int]] = None,
    probabilities: Optional[Dict[str, float]] = None,
    error_message: Optional[str] = None
) -> HardwareSubmission:
    """Save a hardware submission to the database."""
    submission = HardwareSubmission(
        user_id=user_id,
        circuit_code=code,
        backend_name=backend_name,
        shots=shots,
        ibmq_job_id=ibmq_job_id,
        status=status,
        qubit_count=qubit_count,
        gate_count=gate_count,
        circuit_depth=circuit_depth,
        measurements=json.dumps(measurements) if measurements else None,
        probabilities=json.dumps(probabilities) if probabilities else None,
        error_message=error_message,
        created_at=datetime.utcnow(),
        completed_at=datetime.utcnow() if status == "completed" else None
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


def _update_submission_status(
    db: Session,
    submission_id: str,
    status: str,
    measurements: Optional[Dict[str, int]] = None,
    probabilities: Optional[Dict[str, float]] = None,
    error_message: Optional[str] = None
) -> Optional[HardwareSubmission]:
    """Update a hardware submission's status and results."""
    submission = db.query(HardwareSubmission).filter(HardwareSubmission.id == submission_id).first()
    if submission:
        submission.status = status
        submission.last_checked_at = datetime.utcnow()
        if measurements:
            submission.measurements = json.dumps(measurements)
        if probabilities:
            submission.probabilities = json.dumps(probabilities)
        if error_message:
            submission.error_message = error_message
        if status in ["completed", "failed", "cancelled"]:
            submission.completed_at = datetime.utcnow()
        db.commit()
        db.refresh(submission)
    return submission


def _poll_pending_job(
    submission_id: str,
    ibmq_job_id: str,
    token: str,
    channel: str,
    instance: Optional[str]
):
    """Background task to poll for job completion and update database."""
    from ..database import SessionLocal

    db = SessionLocal()
    try:
        result = _get_job_status_with_credentials(
            job_id=ibmq_job_id,
            token=token,
            channel=channel,
            instance=instance
        )

        if result.get("success"):
            status = result.get("status", "unknown")
            if status == "completed":
                _update_submission_status(
                    db=db,
                    submission_id=submission_id,
                    status="completed",
                    measurements=result.get("measurements"),
                    probabilities=result.get("probabilities")
                )
            elif status in ["failed", "cancelled", "error"]:
                _update_submission_status(
                    db=db,
                    submission_id=submission_id,
                    status="failed",
                    error_message=result.get("error", f"Job {status}")
                )
            else:
                # Still running, just update last checked time
                submission = db.query(HardwareSubmission).filter(
                    HardwareSubmission.id == submission_id
                ).first()
                if submission:
                    submission.status = status
                    submission.last_checked_at = datetime.utcnow()
                    db.commit()
        else:
            _update_submission_status(
                db=db,
                submission_id=submission_id,
                status="failed",
                error_message=result.get("error", "Unknown error")
            )
    except Exception as e:
        _update_submission_status(
            db=db,
            submission_id=submission_id,
            status="failed",
            error_message=str(e)
        )
    finally:
        db.close()


@router.post("/run", response_model=HardwareSubmitResponse)
def submit_to_hardware(
    data: HardwareSubmitRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Submit a quantum circuit to real IBM Quantum hardware.

    This endpoint submits the provided Qiskit code to an actual quantum computer.
    Note: Hardware jobs can take several minutes to complete due to queue times.

    If wait_for_result is False (default), returns immediately with a job_id.
    If wait_for_result is True, waits for completion and returns results (may timeout).

    You can provide your own IBM Quantum credentials (token, channel, instance) or
    the platform will use its configured token if available.

    All submissions are saved to the database for history tracking.

    Example code:
    ```python
    from qiskit import QuantumCircuit

    circuit = QuantumCircuit(2, 2)
    circuit.h(0)
    circuit.cx(0, 1)
    circuit.measure([0, 1], [0, 1])
    ```
    """
    # If user provided credentials, use them directly
    if data.token:
        result = _submit_with_user_credentials(
            code=data.code,
            token=data.token,
            channel=data.channel or "ibm_cloud",
            instance=data.instance,
            backend_name=data.backend,
            shots=data.shots,
            wait_for_result=data.wait_for_result
        )

        # Save to database
        status = "completed" if result.get("success") and result.get("measurements") else (
            "failed" if not result.get("success") else "queued"
        )
        submission = _save_submission_to_db(
            db=db,
            code=data.code,
            backend_name=result.get("backend") or data.backend or "unknown",
            shots=data.shots,
            user_id=data.user_id,
            ibmq_job_id=result.get("job_id"),
            status=status,
            qubit_count=result.get("qubitCount"),
            gate_count=result.get("gateCount"),
            circuit_depth=result.get("circuitDepth"),
            measurements=result.get("measurements"),
            probabilities=result.get("probabilities"),
            error_message=result.get("error")
        )

        # If job is queued (not waiting for result), schedule background polling
        if result.get("success") and status == "queued" and result.get("job_id"):
            background_tasks.add_task(
                _poll_pending_job,
                submission_id=submission.id,
                ibmq_job_id=result.get("job_id"),
                token=data.token,
                channel=data.channel or "ibm_cloud",
                instance=data.instance
            )

        response = HardwareSubmitResponse(**result)
        response.submission_id = submission.id
        return response

    # Otherwise use platform token
    if not ibmq_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="IBM Quantum service is not available. IBMQ_TOKEN not configured."
        )

    result = ibmq_service.submit_circuit_direct(
        circuit_code=data.code,
        backend_name=data.backend,
        shots=data.shots,
        wait_for_result=data.wait_for_result
    )

    # Save to database
    status = "completed" if result.get("success") and result.get("measurements") else (
        "failed" if not result.get("success") else "queued"
    )
    submission = _save_submission_to_db(
        db=db,
        code=data.code,
        backend_name=result.get("backend") or data.backend or settings.ibmq_backend,
        shots=data.shots,
        user_id=data.user_id,
        ibmq_job_id=result.get("job_id"),
        status=status,
        qubit_count=result.get("qubitCount"),
        gate_count=result.get("gateCount"),
        circuit_depth=result.get("circuitDepth"),
        measurements=result.get("measurements"),
        probabilities=result.get("probabilities"),
        error_message=result.get("error")
    )

    response = HardwareSubmitResponse(**result)
    response.submission_id = submission.id
    return response


def _submit_with_user_credentials(
    code: str,
    token: str,
    channel: str,
    instance: Optional[str],
    backend_name: Optional[str],
    shots: int,
    wait_for_result: bool
) -> Dict[str, Any]:
    """Submit a circuit using user-provided credentials."""
    try:
        from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
        from qiskit import QuantumCircuit
        from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager

        # Connect with user's credentials
        connect_args = {"channel": channel, "token": token}
        if instance:
            connect_args["instance"] = instance

        service = QiskitRuntimeService(**connect_args)

        # Parse circuit from code (with security validation)
        circuit, parse_error = _parse_circuit_from_code(code)
        if circuit is None:
            return {"success": False, "error": parse_error or "Could not parse quantum circuit from code"}

        # Get backend
        if backend_name:
            backend = service.backend(backend_name)
        else:
            # Use least busy backend
            backend = service.least_busy(operational=True, simulator=False)

        # Transpile circuit for the backend
        pm = generate_preset_pass_manager(backend=backend, optimization_level=1)
        isa_circuit = pm.run(circuit)

        # Get circuit stats
        num_qubits = circuit.num_qubits
        gate_count = sum(circuit.count_ops().values())
        circuit_depth = circuit.depth()

        # Submit using SamplerV2
        sampler = SamplerV2(backend)
        job = sampler.run([isa_circuit], shots=shots)

        if wait_for_result:
            # Wait for job completion (with timeout)
            result = job.result()
            pub_result = result[0]

            # Extract counts
            counts = pub_result.data.meas.get_counts() if hasattr(pub_result.data, 'meas') else {}

            # Calculate probabilities
            total_shots = sum(counts.values())
            probabilities = {k: v / total_shots for k, v in counts.items()} if total_shots > 0 else {}

            return {
                "success": True,
                "job_id": job.job_id(),
                "backend": backend.name,
                "status": "completed",
                "shots": shots,
                "qubitCount": num_qubits,
                "gateCount": gate_count,
                "circuitDepth": circuit_depth,
                "measurements": counts,
                "probabilities": probabilities
            }
        else:
            # Return immediately with job ID
            return {
                "success": True,
                "job_id": job.job_id(),
                "backend": backend.name,
                "status": "queued",
                "shots": shots,
                "qubitCount": num_qubits,
                "gateCount": gate_count,
                "circuitDepth": circuit_depth
            }

    except ImportError as e:
        return {"success": False, "error": f"Missing required package: {str(e)}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _parse_circuit_from_code(code: str) -> tuple[Optional[Any], Optional[str]]:
    """
    Securely parse a QuantumCircuit from user code.
    Only allows Qiskit circuit operations - no arbitrary code execution.

    Returns:
        Tuple of (circuit, error_message)
    """
    from ..services.code_validator import execute_circuit_code
    circuit, _post_select, _layout, error = execute_circuit_code(code)
    return circuit, error


@router.post("/status", response_model=JobStatusResponse)
def check_job_status(
    data: JobStatusRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Check the status of a hardware job and get results if completed.

    Use this endpoint to poll for job completion after submitting with wait_for_result=False.
    Updates the database record if results are found.
    """
    # If user provided credentials, use them
    if data.token:
        result = _get_job_status_with_credentials(
            job_id=data.job_id,
            token=data.token,
            channel=data.channel or "ibm_cloud",
            instance=data.instance
        )

        # Update database if we have a record
        submission = db.query(HardwareSubmission).filter(
            HardwareSubmission.ibmq_job_id == data.job_id
        ).first()

        if submission and result.get("success"):
            if result.get("status") == "completed":
                _update_submission_status(
                    db=db,
                    submission_id=submission.id,
                    status="completed",
                    measurements=result.get("measurements"),
                    probabilities=result.get("probabilities")
                )
            elif result.get("status") in ["failed", "cancelled", "error"]:
                _update_submission_status(
                    db=db,
                    submission_id=submission.id,
                    status="failed",
                    error_message=result.get("error")
                )
            else:
                submission.status = result.get("status", "running")
                submission.last_checked_at = datetime.utcnow()
                db.commit()

        response = JobStatusResponse(**result)
        if submission:
            response.submission_id = submission.id
        return response

    # Otherwise use platform token
    if not ibmq_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="IBM Quantum service is not available"
        )

    result = ibmq_service.get_job_result_direct(data.job_id)

    # Update database if we have a record
    submission = db.query(HardwareSubmission).filter(
        HardwareSubmission.ibmq_job_id == data.job_id
    ).first()

    if submission and result.get("success"):
        if result.get("status") == "completed":
            _update_submission_status(
                db=db,
                submission_id=submission.id,
                status="completed",
                measurements=result.get("measurements"),
                probabilities=result.get("probabilities")
            )

    response = JobStatusResponse(**result)
    if submission:
        response.submission_id = submission.id
    return response


def _get_job_status_with_credentials(
    job_id: str,
    token: str,
    channel: str,
    instance: Optional[str]
) -> Dict[str, Any]:
    """Get job status using user-provided credentials."""
    try:
        from qiskit_ibm_runtime import QiskitRuntimeService

        # Connect with user's credentials
        connect_args = {"channel": channel, "token": token}
        if instance:
            connect_args["instance"] = instance

        print(f"[DEBUG] Checking job status for {job_id} with channel={channel}, instance={instance}")
        service = QiskitRuntimeService(**connect_args)

        # Get the job
        job = service.job(job_id)
        raw_status = job.status()
        # Handle both enum (older API) and string (newer API) status formats
        if hasattr(raw_status, 'name'):
            job_status = raw_status.name.lower()
        else:
            job_status = str(raw_status).lower()
        print(f"[DEBUG] Job {job_id} status from IBM: {job_status}")

        if job_status in ["done", "completed"]:
            # Get results
            result = job.result()
            pub_result = result[0]

            # Extract counts
            counts = {}
            if hasattr(pub_result.data, 'meas'):
                counts = pub_result.data.meas.get_counts()
            elif hasattr(pub_result.data, 'c'):
                counts = pub_result.data.c.get_counts()

            # Calculate probabilities
            total_shots = sum(counts.values())
            probabilities = {k: v / total_shots for k, v in counts.items()} if total_shots > 0 else {}

            return {
                "success": True,
                "job_id": job_id,
                "status": "completed",
                "measurements": counts,
                "probabilities": probabilities
            }
        elif job_status in ["error", "cancelled"]:
            return {
                "success": False,
                "job_id": job_id,
                "status": "failed",
                "error": f"Job {job_status}"
            }
        else:
            return {
                "success": True,
                "job_id": job_id,
                "status": job_status
            }

    except Exception as e:
        print(f"[DEBUG] Error checking job {job_id}: {type(e).__name__}: {str(e)}")
        return {
            "success": False,
            "job_id": job_id,
            "status": "failed",
            "error": str(e)
        }


@router.get("/status/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """
    Get the status of a hardware job by ID.

    Alternative to POST /status endpoint.
    """
    if not ibmq_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="IBM Quantum service is not available"
        )

    result = ibmq_service.get_job_result_direct(job_id)

    # Check if we have a database record
    submission = db.query(HardwareSubmission).filter(
        HardwareSubmission.ibmq_job_id == job_id
    ).first()

    response = JobStatusResponse(**result)
    if submission:
        response.submission_id = submission.id
    return response


@router.get("/history")
def get_submission_history(
    db: Session = Depends(get_db),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page")
):
    """
    Get hardware submission history.

    Returns a paginated list of all hardware submissions.
    Can filter by user_id and/or status.
    """
    query = db.query(HardwareSubmission)

    if user_id:
        query = query.filter(HardwareSubmission.user_id == user_id)
    if status_filter:
        query = query.filter(HardwareSubmission.status == status_filter)

    # Get total count
    total = query.count()

    # Apply pagination and ordering (newest first)
    submissions = query.order_by(HardwareSubmission.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    # Convert to response format
    items = []
    for sub in submissions:
        items.append({
            "id": sub.id,
            "user_id": sub.user_id,
            "circuit_code": sub.circuit_code,
            "ibmq_job_id": sub.ibmq_job_id,
            "backend_name": sub.backend_name,
            "shots": sub.shots,
            "qubit_count": sub.qubit_count,
            "gate_count": sub.gate_count,
            "circuit_depth": sub.circuit_depth,
            "status": sub.status,
            "measurements": json.loads(sub.measurements) if sub.measurements else None,
            "probabilities": json.loads(sub.probabilities) if sub.probabilities else None,
            "error_message": sub.error_message,
            "created_at": sub.created_at.isoformat() if sub.created_at else None,
            "completed_at": sub.completed_at.isoformat() if sub.completed_at else None
        })

    return {
        "submissions": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/submission/{submission_id}")
def get_submission_detail(submission_id: str, db: Session = Depends(get_db)):
    """
    Get detailed information about a specific hardware submission.
    """
    submission = db.query(HardwareSubmission).filter(
        HardwareSubmission.id == submission_id
    ).first()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )

    return {
        "id": submission.id,
        "user_id": submission.user_id,
        "circuit_code": submission.circuit_code,
        "ibmq_job_id": submission.ibmq_job_id,
        "backend_name": submission.backend_name,
        "shots": submission.shots,
        "qubit_count": submission.qubit_count,
        "gate_count": submission.gate_count,
        "circuit_depth": submission.circuit_depth,
        "status": submission.status,
        "measurements": json.loads(submission.measurements) if submission.measurements else None,
        "probabilities": json.loads(submission.probabilities) if submission.probabilities else None,
        "error_message": submission.error_message,
        "created_at": submission.created_at.isoformat() if submission.created_at else None,
        "started_at": submission.started_at.isoformat() if submission.started_at else None,
        "completed_at": submission.completed_at.isoformat() if submission.completed_at else None,
        "last_checked_at": submission.last_checked_at.isoformat() if submission.last_checked_at else None
    }


@router.post("/refresh/{submission_id}")
def refresh_submission_status(
    submission_id: str,
    db: Session = Depends(get_db),
    token: Optional[str] = Query(None, description="IBM Quantum API token"),
    channel: Optional[str] = Query("ibm_cloud", description="IBM channel"),
    instance: Optional[str] = Query(None, description="IBM Quantum instance")
):
    """
    Refresh the status of a pending hardware submission by checking with IBM.

    This endpoint manually triggers a status check for a specific submission.
    """
    submission = db.query(HardwareSubmission).filter(
        HardwareSubmission.id == submission_id
    ).first()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )

    if not submission.ibmq_job_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submission has no IBM job ID"
        )

    if submission.status in ["completed", "failed", "cancelled"]:
        return {
            "message": "Job already finished",
            "status": submission.status,
            "measurements": json.loads(submission.measurements) if submission.measurements else None,
            "probabilities": json.loads(submission.probabilities) if submission.probabilities else None
        }

    # Check status with IBM
    if token:
        result = _get_job_status_with_credentials(
            job_id=submission.ibmq_job_id,
            token=token,
            channel=channel or "ibm_cloud",
            instance=instance
        )
    elif ibmq_service.is_available():
        result = ibmq_service.get_job_result_direct(submission.ibmq_job_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No credentials provided and platform token not configured"
        )

    # Update database
    if result.get("success"):
        new_status = result.get("status", "unknown")
        if new_status == "completed":
            _update_submission_status(
                db=db,
                submission_id=submission.id,
                status="completed",
                measurements=result.get("measurements"),
                probabilities=result.get("probabilities")
            )
        elif new_status in ["failed", "cancelled", "error"]:
            _update_submission_status(
                db=db,
                submission_id=submission.id,
                status="failed",
                error_message=result.get("error")
            )
        else:
            submission.status = new_status
            submission.last_checked_at = datetime.utcnow()
            db.commit()

    db.refresh(submission)

    return {
        "id": submission.id,
        "ibmq_job_id": submission.ibmq_job_id,
        "status": submission.status,
        "measurements": json.loads(submission.measurements) if submission.measurements else None,
        "probabilities": json.loads(submission.probabilities) if submission.probabilities else None,
        "error_message": submission.error_message,
        "last_checked_at": submission.last_checked_at.isoformat() if submission.last_checked_at else None
    }


@router.get("/available")
def check_hardware_available():
    """Check if quantum hardware is available"""
    available = ibmq_service.is_available()
    backends = ibmq_service.get_available_backends() if available else []

    return {
        "available": available,
        "default_backend": settings.ibmq_backend if available else None,
        "backends": backends
    }


@router.get("/backends", response_model=List[BackendInfo])
def get_backends():
    """Get list of available quantum hardware backends"""
    if not ibmq_service.is_available():
        return []

    backends = ibmq_service.get_available_backends()
    return [BackendInfo(**b) for b in backends]


class TestCredentialsRequest(BaseModel):
    """Request model for testing IBM credentials"""
    token: str = Field(..., description="IBM Quantum API token")
    channel: str = Field(default="ibm_quantum", description="IBM channel: ibm_cloud or ibm_quantum")
    instance: Optional[str] = Field(default=None, description="IBM Quantum instance")


class TestCredentialsResponse(BaseModel):
    """Response model for credentials test"""
    success: bool
    error: Optional[str] = None
    backends: Optional[List[str]] = None
    message: Optional[str] = None


@router.post("/test-credentials", response_model=TestCredentialsResponse)
def test_user_credentials(data: TestCredentialsRequest):
    """
    Test user-provided IBM Quantum credentials.

    This endpoint attempts to connect to IBM Quantum using the provided
    credentials and returns available backends if successful.
    """
    try:
        from qiskit_ibm_runtime import QiskitRuntimeService

        # Build connection arguments
        connect_args = {
            "channel": data.channel,
            "token": data.token,
        }

        # Add instance if provided
        if data.instance:
            connect_args["instance"] = data.instance

        # Attempt to connect with user's credentials
        service = QiskitRuntimeService(**connect_args)

        # Get available backends to verify connection works
        backends = service.backends()
        backend_names = [b.name for b in backends]

        return TestCredentialsResponse(
            success=True,
            backends=backend_names,
            message=f"Successfully connected! Found {len(backend_names)} backends."
        )

    except ImportError:
        return TestCredentialsResponse(
            success=False,
            error="qiskit-ibm-runtime is not installed on the server"
        )
    except Exception as e:
        error_msg = str(e)
        # Parse common error messages for better user feedback
        if "401" in error_msg or "Unauthorized" in error_msg.lower():
            error_msg = "Invalid API token. Please check your token and try again."
        elif "instance" in error_msg.lower():
            error_msg = "Invalid instance. Leave empty to use default, or use format: hub/group/project"
        elif "channel" in error_msg.lower():
            error_msg = "Invalid channel. Use 'ibm_cloud' or 'ibm_quantum'."

        return TestCredentialsResponse(
            success=False,
            error=error_msg
        )


# ============ Hardware Leaderboard ============

class LeaderboardEntry(BaseModel):
    """Single entry in the hardware leaderboard"""
    rank: int
    user_id: str
    username: str
    avatar_url: Optional[str] = None
    completed_jobs: int
    total_qubits: int
    total_gates: int
    avg_circuit_depth: float
    score: int  # Calculated score
    last_submission: Optional[str] = None


class HardwareLeaderboardResponse(BaseModel):
    """Response model for hardware leaderboard"""
    leaderboard: List[LeaderboardEntry]
    total_users: int
    total_jobs: int
    updated_at: str


@router.get("/leaderboard", response_model=HardwareLeaderboardResponse)
def get_hardware_leaderboard(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100, description="Number of entries to return")
):
    """
    Get the hardware submission leaderboard.

    Ranks users by their quantum hardware submission performance based on:
    - Number of successfully completed jobs
    - Total qubits used across all jobs
    - Circuit complexity (gates x depth)

    Score formula: completed_jobs * 100 + total_qubits * 10 + total_gates
    """
    from sqlalchemy import func
    from ..models import User

    # Query aggregated stats per user for completed jobs only
    stats_query = db.query(
        HardwareSubmission.user_id,
        func.count(HardwareSubmission.id).label('completed_jobs'),
        func.sum(HardwareSubmission.qubit_count).label('total_qubits'),
        func.sum(HardwareSubmission.gate_count).label('total_gates'),
        func.avg(HardwareSubmission.circuit_depth).label('avg_depth'),
        func.max(HardwareSubmission.created_at).label('last_submission')
    ).filter(
        HardwareSubmission.status == 'completed',
        HardwareSubmission.user_id.isnot(None)
    ).group_by(
        HardwareSubmission.user_id
    ).subquery()

    # Join with users to get username and avatar
    results = db.query(
        User.id,
        User.username,
        User.avatar_url,
        stats_query.c.completed_jobs,
        stats_query.c.total_qubits,
        stats_query.c.total_gates,
        stats_query.c.avg_depth,
        stats_query.c.last_submission
    ).join(
        stats_query, User.id == stats_query.c.user_id
    ).all()

    # Calculate scores and sort
    leaderboard_data = []
    for row in results:
        completed_jobs = row.completed_jobs or 0
        total_qubits = row.total_qubits or 0
        total_gates = row.total_gates or 0
        avg_depth = row.avg_depth or 0

        # Score formula: heavily weight completed jobs, then qubits and gates
        score = (completed_jobs * 100) + (total_qubits * 10) + total_gates

        leaderboard_data.append({
            'user_id': row.id,
            'username': row.username,
            'avatar_url': row.avatar_url,
            'completed_jobs': completed_jobs,
            'total_qubits': total_qubits,
            'total_gates': total_gates,
            'avg_circuit_depth': round(avg_depth, 2),
            'score': score,
            'last_submission': row.last_submission.isoformat() if row.last_submission else None
        })

    # Sort by score descending
    leaderboard_data.sort(key=lambda x: x['score'], reverse=True)

    # Add ranks and limit
    leaderboard = []
    for i, entry in enumerate(leaderboard_data[:limit]):
        leaderboard.append(LeaderboardEntry(
            rank=i + 1,
            **entry
        ))

    # Get total counts
    total_users = len(leaderboard_data)
    total_jobs = db.query(HardwareSubmission).filter(
        HardwareSubmission.status == 'completed'
    ).count()

    return HardwareLeaderboardResponse(
        leaderboard=leaderboard,
        total_users=total_users,
        total_jobs=total_jobs,
        updated_at=datetime.utcnow().isoformat()
    )

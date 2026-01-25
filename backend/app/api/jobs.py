"""
IBMQ Job API endpoints
"""
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import JobSubmitRequest, JobResponse, JobResultResponse
from ..services.ibmq_service import ibmq_service
from ..services.submission_service import submission_service
from ..core.deps import get_current_user
from ..models import User

router = APIRouter(prefix="/jobs", tags=["IBMQ Jobs"])


@router.post("/submit", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def submit_job(
    data: JobSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit a job to IBMQ hardware"""
    # Check if IBMQ is available
    if not ibmq_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="IBMQ service is not configured or unavailable"
        )

    # Verify submission exists and belongs to user
    submission = submission_service.get_submission(db, data.submission_id)
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )

    if submission.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Create job record
    job = ibmq_service.create_job_record(
        db,
        submission_id=data.submission_id,
        user_id=current_user.id,
        backend_name=data.backend_name
    )

    # Submit to IBMQ
    job = ibmq_service.submit_circuit(db, job, submission.code)

    return JobResponse(
        id=job.id,
        submission_id=job.submission_id,
        user_id=job.user_id,
        ibmq_job_id=job.ibmq_job_id,
        backend_name=job.backend_name,
        status=job.status,
        error_message=job.error_message,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at
    )


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get job status"""
    job = ibmq_service.get_job(db, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    if job.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Check and update status from IBMQ if job is still running
    if job.status in ["queued", "running"]:
        job = ibmq_service.check_job_status(db, job)

    return JobResponse(
        id=job.id,
        submission_id=job.submission_id,
        user_id=job.user_id,
        ibmq_job_id=job.ibmq_job_id,
        backend_name=job.backend_name,
        status=job.status,
        error_message=job.error_message,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at
    )


@router.get("/{job_id}/result", response_model=JobResultResponse)
def get_job_result(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get job result"""
    job = ibmq_service.get_job(db, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    if job.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Check and update status if still running
    if job.status in ["queued", "running"]:
        job = ibmq_service.check_job_status(db, job)

    result = None
    if job.result:
        try:
            result = json.loads(job.result)
        except:
            result = job.result

    return JobResultResponse(
        id=job.id,
        submission_id=job.submission_id,
        status=job.status,
        result=result,
        error_message=job.error_message,
        completed_at=job.completed_at
    )


@router.get("/", response_model=list[JobResponse])
def get_my_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's IBMQ jobs"""
    jobs = ibmq_service.get_user_jobs(db, current_user.id)
    return [
        JobResponse(
            id=job.id,
            submission_id=job.submission_id,
            user_id=job.user_id,
            ibmq_job_id=job.ibmq_job_id,
            backend_name=job.backend_name,
            status=job.status,
            error_message=job.error_message,
            created_at=job.created_at,
            started_at=job.started_at,
            completed_at=job.completed_at
        )
        for job in jobs
    ]


@router.get("/backends/available")
def get_available_backends():
    """Get list of available IBMQ backends"""
    if not ibmq_service.is_available():
        return {"backends": [], "available": False}

    backends = ibmq_service.get_backend_names()
    return {"backends": backends, "available": True}

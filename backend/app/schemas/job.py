"""
IBMQ Job Pydantic schemas
"""
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel


class JobSubmitRequest(BaseModel):
    """Request to submit a job to IBMQ"""
    submission_id: str
    backend_name: str = "ibm_brisbane"


class JobResponse(BaseModel):
    """Job status response"""
    id: str
    submission_id: str
    user_id: str
    ibmq_job_id: Optional[str] = None
    backend_name: str
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class JobResultResponse(BaseModel):
    """Job result response"""
    id: str
    submission_id: str
    status: str
    result: Optional[Any] = None
    error_message: Optional[str] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class JobStatusUpdate(BaseModel):
    """Schema for updating job status"""
    status: str
    ibmq_job_id: Optional[str] = None
    result: Optional[Any] = None
    error_message: Optional[str] = None

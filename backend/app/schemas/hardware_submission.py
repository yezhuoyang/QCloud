"""
Pydantic schemas for hardware submission history
"""
from datetime import datetime
from typing import Optional, Dict, List
from pydantic import BaseModel, Field


class HardwareSubmissionBase(BaseModel):
    """Base schema for hardware submissions"""
    circuit_code: str = Field(..., description="The quantum circuit code")
    backend_name: str = Field(..., description="IBM backend name")
    shots: int = Field(default=1024, ge=1, le=100000)


class HardwareSubmissionCreate(HardwareSubmissionBase):
    """Schema for creating a hardware submission"""
    pass


class HardwareSubmissionResponse(BaseModel):
    """Schema for hardware submission response"""
    id: str
    user_id: Optional[str] = None
    circuit_code: str
    ibmq_job_id: Optional[str] = None
    backend_name: str
    shots: int
    qubit_count: Optional[int] = None
    gate_count: Optional[int] = None
    circuit_depth: Optional[int] = None
    status: str
    measurements: Optional[Dict[str, int]] = None
    probabilities: Optional[Dict[str, float]] = None
    execution_time: Optional[float] = None
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class HardwareSubmissionListResponse(BaseModel):
    """Schema for list of hardware submissions"""
    submissions: List[HardwareSubmissionResponse]
    total: int
    page: int
    page_size: int


class HardwareJobStatusResponse(BaseModel):
    """Schema for job status check"""
    id: str
    ibmq_job_id: Optional[str] = None
    status: str
    measurements: Optional[Dict[str, int]] = None
    probabilities: Optional[Dict[str, float]] = None
    error_message: Optional[str] = None
    completed_at: Optional[datetime] = None

"""
Submission Pydantic schemas
"""
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field


class SubmissionCreate(BaseModel):
    """Schema for creating a submission"""
    problem_id: str
    code: str
    submission_type: str = Field(default="code", pattern="^(code|circuit)$")
    target: str = Field(default="simulator", pattern="^(simulator|hardware)$")


class SubmissionResponse(BaseModel):
    """Submission response schema"""
    id: str
    user_id: str
    problem_id: str
    code: str
    submission_type: str
    target: str
    status: str
    score: Optional[int] = None
    fidelity: Optional[float] = None
    gate_count: Optional[int] = None
    circuit_depth: Optional[int] = None
    qubit_count: Optional[int] = None
    feedback: Optional[List[Any]] = None
    test_results: Optional[List[Any]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SubmissionListResponse(BaseModel):
    """List of submissions response"""
    submissions: List[SubmissionResponse]
    total: int


class SubmissionResultUpdate(BaseModel):
    """Schema for updating submission results"""
    status: str
    score: Optional[int] = None
    fidelity: Optional[float] = None
    gate_count: Optional[int] = None
    circuit_depth: Optional[int] = None
    qubit_count: Optional[int] = None
    feedback: Optional[List[Any]] = None
    test_results: Optional[List[Any]] = None

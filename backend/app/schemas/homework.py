"""
Pydantic schemas for homework system - token verification, submissions, leaderboard, admin
"""
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field


# ============ Token Verification ============

class HomeworkTokenVerifyRequest(BaseModel):
    """Request to verify a student's homework token"""
    token: str = Field(..., description="Student's homework token (hex string)")


class HomeworkTokenVerifyResponse(BaseModel):
    """Response with homework info and budget after token verification"""
    valid: bool
    homework_id: Optional[str] = None
    homework_title: Optional[str] = None
    course: Optional[str] = None
    description: Optional[str] = None
    budget_total_seconds: Optional[int] = None
    budget_used_seconds: Optional[float] = None
    budget_remaining_seconds: Optional[float] = None
    submission_count: Optional[int] = None
    allowed_backends: Optional[List[str]] = None
    deadline: Optional[datetime] = None
    reference_circuit: Optional[str] = None
    error: Optional[str] = None


# ============ Submission ============

class HomeworkSubmitRequest(BaseModel):
    """Request to submit homework code for hardware execution"""
    token: str = Field(..., description="Student's homework token")
    code: str = Field(..., description="Student's distillation circuit code")
    backend: str = Field(..., description="IBM backend name")
    shots: int = Field(default=1024, ge=1, le=8192)


class HomeworkSubmissionResponse(BaseModel):
    """Response for a homework submission"""
    id: str
    homework_id: str
    status: str
    queue_position: Optional[int] = None
    backend_name: str
    shots: int
    ibmq_job_id_before: Optional[str] = None
    ibmq_job_id_after: Optional[str] = None
    fidelity_before: Optional[float] = None
    fidelity_after: Optional[float] = None
    fidelity_improvement: Optional[float] = None
    score: Optional[int] = None
    measurements_before: Optional[Dict[str, int]] = None
    measurements_after: Optional[Dict[str, int]] = None
    qubit_count: Optional[int] = None
    gate_count: Optional[int] = None
    circuit_depth: Optional[int] = None
    execution_time_seconds: Optional[float] = None
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class HomeworkSubmissionListResponse(BaseModel):
    """Response for list of homework submissions"""
    submissions: List[HomeworkSubmissionResponse]
    total: int


# ============ Queue ============

class QueueEntry(BaseModel):
    """A single entry in the job queue"""
    id: str
    student_label: str  # Anonymized: first 6 chars of UID hash
    position: int
    backend: str
    submitted_at: datetime


class RunningEntry(BaseModel):
    """A currently running job"""
    id: str
    student_label: str
    backend: str
    started_at: Optional[datetime] = None


class MyQueueEntry(BaseModel):
    """Current student's submission in the queue"""
    id: str
    position: Optional[int] = None
    status: str


class HomeworkQueueStatusResponse(BaseModel):
    """Full queue status for a homework"""
    queue: List[QueueEntry]
    running: List[RunningEntry]
    my_submissions: List[MyQueueEntry]
    total_queued: int
    total_running: int
    estimated_wait_minutes: float


# ============ Leaderboard ============

class HomeworkLeaderboardEntry(BaseModel):
    """A single entry on the homework leaderboard"""
    rank: int
    student_label: str  # Anonymized: first 6 chars of UID hash
    fidelity_before: float
    fidelity_after: float
    fidelity_improvement: float
    score: int
    submission_count: int
    best_submission_at: Optional[datetime] = None


class HomeworkLeaderboardResponse(BaseModel):
    """Full homework leaderboard"""
    homework_id: str
    homework_title: str
    leaderboard: List[HomeworkLeaderboardEntry]
    total_students: int
    updated_at: datetime


# ============ Admin ============

class HomeworkCreateRequest(BaseModel):
    """Request to create a new homework (admin only)"""
    title: str = Field(..., description="Homework title")
    description: Optional[str] = Field(None, description="Homework description (markdown)")
    course: str = Field(default="CS 238B")
    ibmq_api_key: str = Field(..., description="Raw IBM API key (will be encrypted)")
    ibmq_channel: str = Field(default="ibm_cloud")
    ibmq_instance: Optional[str] = None
    allowed_backends: List[str] = Field(..., description="List of allowed IBM backend names")
    total_budget_seconds: int = Field(default=21600, description="Total budget in seconds (default 6h)")
    num_students: int = Field(default=30)
    max_concurrent_jobs: int = Field(default=3, ge=1, le=10)
    reference_circuit: Optional[str] = Field(None, description="Reference/baseline circuit code (Qiskit)")
    judge_code: Optional[str] = Field(None, description="Custom Python judging code")
    problem_id: Optional[str] = None
    deadline: Optional[datetime] = None


class HomeworkCreateResponse(BaseModel):
    """Response after creating a homework"""
    id: str
    title: str
    per_student_budget_seconds: int
    max_concurrent_jobs: int


class HomeworkGenerateTokensRequest(BaseModel):
    """Request to generate tokens for a list of student UIDs"""
    student_uids: List[str] = Field(..., min_length=1, description="List of student UIDs")


class HomeworkTokenEntry(BaseModel):
    """A single generated token entry"""
    student_uid: str
    token: str


class HomeworkGenerateTokensResponse(BaseModel):
    """Response with generated tokens"""
    tokens: List[HomeworkTokenEntry]
    count: int


class HomeworkTokenAdminResponse(BaseModel):
    """Token info for admin view (no raw token, includes budget)"""
    id: str
    student_uid_hash: str
    budget_used_seconds: float
    budget_limit_seconds: int
    is_active: bool
    submission_count: int
    last_used_at: Optional[datetime] = None
    created_at: datetime


class HomeworkBudgetSummaryResponse(BaseModel):
    """Budget summary for admin dashboard"""
    homework_id: str
    homework_title: str
    total_budget_seconds: int
    total_used_seconds: float
    total_remaining_seconds: float
    num_students: int
    num_active_tokens: int
    students: List[HomeworkTokenAdminResponse]


class HomeworkUpdateRequest(BaseModel):
    """Request to update homework settings (admin only)"""
    title: Optional[str] = None
    description: Optional[str] = None
    allowed_backends: Optional[List[str]] = None
    max_concurrent_jobs: Optional[int] = Field(None, ge=1, le=10)
    is_active: Optional[bool] = None
    deadline: Optional[datetime] = None
    reference_circuit: Optional[str] = None
    judge_code: Optional[str] = None


class HomeworkTokenUpdateRequest(BaseModel):
    """Request to update a specific token (admin only)"""
    is_active: Optional[bool] = None
    budget_limit_seconds: Optional[int] = None

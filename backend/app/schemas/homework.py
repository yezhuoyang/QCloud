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
    display_name: Optional[str] = None
    method_name: Optional[str] = None
    error: Optional[str] = None


# ============ Student Profile ============

class HomeworkUpdateProfileRequest(BaseModel):
    """Request to update student's leaderboard display name and method name"""
    token: str = Field(..., description="Student's homework token")
    display_name: Optional[str] = Field(None, max_length=30, description="Custom name for leaderboard (max 30 chars)")
    method_name: Optional[str] = Field(None, max_length=50, description="Custom method/approach name (max 50 chars)")


class HomeworkUpdateProfileResponse(BaseModel):
    """Response after updating student profile"""
    display_name: Optional[str] = None
    method_name: Optional[str] = None


# ============ Submission ============

class HomeworkSubmitRequest(BaseModel):
    """Request to submit homework code for hardware execution"""
    token: str = Field(..., description="Student's homework token")
    code: str = Field(..., description="Student's distillation circuit code")
    backend: str = Field(..., description="IBM backend name")
    shots: int = Field(default=1024, ge=1, le=8192)
    eval_method: str = Field(default="inverse_bell", description="'inverse_bell' or 'tomography'")
    ibmq_api_key: Optional[str] = Field(None, description="Optional student-provided IBM API key")


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
    success_probability: Optional[float] = None
    post_selected_shots: Optional[int] = None
    eval_method: str = "inverse_bell"
    tomography_correlators: Optional[Dict[str, float]] = None
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
    """A single entry on the homework leaderboard (one per submission)"""
    rank: int
    submission_id: str
    student_label: str  # Anonymized: first 6 chars of UID hash
    display_name: Optional[str] = None  # Custom name set by student
    method_name: Optional[str] = None   # Custom method/approach name
    fidelity_before: float
    fidelity_after: float
    fidelity_improvement: float
    score: int
    submitted_at: Optional[datetime] = None
    backend_name: Optional[str] = None
    success_probability: Optional[float] = None
    eval_method: Optional[str] = None


class HomeworkLeaderboardResponse(BaseModel):
    """Full homework leaderboard"""
    homework_id: str
    homework_title: str
    leaderboard: List[HomeworkLeaderboardEntry]
    total_students: int
    updated_at: datetime


# ============ Hardware Ranking ============

class HardwareRankingEntry(BaseModel):
    """Aggregated stats for one hardware backend."""
    rank: int
    backend_name: str
    avg_fidelity_before: float
    avg_fidelity_after: float
    avg_fidelity_improvement: float
    best_fidelity_after: float
    worst_fidelity_after: float
    total_jobs: int
    unique_students: int
    avg_success_probability: Optional[float] = None


class HardwareRankingResponse(BaseModel):
    """Hardware ranking across all backends for a homework."""
    homework_id: str
    homework_title: str
    rankings: List[HardwareRankingEntry]
    total_completed_jobs: int
    updated_at: datetime


# ============ Admin ============

class HomeworkCreateRequest(BaseModel):
    """Request to create a new homework (admin only)"""
    title: str = Field(..., description="Homework title")
    description: Optional[str] = Field(None, description="Homework description (markdown)")
    course: str = Field(default="CS 238B")
    ibmq_api_key: str = Field(..., description="Raw IBM API key (will be encrypted)")
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


class StudentEntry(BaseModel):
    """A student UID with optional display name"""
    uid: str = Field(..., description="Student UID")
    display_name: Optional[str] = Field(None, max_length=60, description="Student's real name")


class HomeworkGenerateTokensRequest(BaseModel):
    """Request to generate tokens for a list of students"""
    student_uids: Optional[List[str]] = Field(None, description="List of student UIDs (legacy)")
    students: Optional[List[StudentEntry]] = Field(None, description="List of students with UIDs and names")


class HomeworkTokenEntry(BaseModel):
    """A single generated token entry"""
    student_uid: str
    display_name: Optional[str] = None
    token: str


class HomeworkGenerateTokensResponse(BaseModel):
    """Response with generated tokens"""
    tokens: List[HomeworkTokenEntry]
    count: int


class HomeworkTokenAdminResponse(BaseModel):
    """Token info for admin view, includes budget and raw token"""
    id: str
    student_uid_hash: str
    student_uid_raw: Optional[str] = None  # Decrypted raw UID (admin only)
    display_name: Optional[str] = None
    token: Optional[str] = None  # Decrypted raw token (admin only)
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
    ibmq_api_key: Optional[str] = Field(None, description="New IBM API key (will be re-encrypted)")


class HomeworkTokenUpdateRequest(BaseModel):
    """Request to update a specific token (admin only)"""
    is_active: Optional[bool] = None
    budget_limit_seconds: Optional[int] = None


class AdminSubmissionResponse(BaseModel):
    """Admin view of a submission with full student/token info."""
    id: str
    homework_id: str
    token_id: str
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
    success_probability: Optional[float] = None
    post_selected_shots: Optional[int] = None
    eval_method: str = "inverse_bell"
    tomography_correlators: Optional[Dict[str, float]] = None
    error_message: Optional[str] = None
    code_before: Optional[str] = None
    code_after: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    # Token/student info (joined)
    student_uid_hash: str
    display_name: Optional[str] = None
    method_name: Optional[str] = None
    student_label: str

    class Config:
        from_attributes = True


class AdminSubmissionListResponse(BaseModel):
    """Paginated admin submission list."""
    submissions: List[AdminSubmissionResponse]
    total: int
    page: int
    page_size: int


class AdminDirectSubmitRequest(BaseModel):
    """Admin direct submit to hardware without student token."""
    code: str = Field(..., description="Circuit code")
    backend_name: str = Field(..., description="IBM backend name")
    shots: int = Field(default=1024, ge=1, le=8192)
    eval_method: str = Field(default="inverse_bell")
    label: Optional[str] = Field(None, description="Optional label for this admin submission")


# ============ Public Info & Simulator ============

class HomeworkInfoResponse(BaseModel):
    """Public homework info, no auth required."""
    id: str
    title: str
    course: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    reference_circuit: Optional[str] = None
    allowed_backends: List[str] = []
    default_shots: int = 1024
    is_active: bool = True


class HomeworkSimulateRequest(BaseModel):
    """Run on noisy simulator, no token needed."""
    homework_id: str = Field(..., description="Homework ID")
    code: str = Field(..., description="Student's circuit code")
    shots: int = Field(default=1024, ge=1, le=8192)
    mode: str = Field(default="distillation", description="'distillation' or 'bell_pair'")
    eval_method: str = Field(default="inverse_bell", description="'inverse_bell' or 'tomography'")
    single_qubit_error: float = Field(default=0.01, ge=0.0, le=0.5, description="Single-qubit gate error rate")
    two_qubit_error: float = Field(default=0.02, ge=0.0, le=0.5, description="Two-qubit gate error rate")


class HomeworkSimulateResponse(BaseModel):
    """Immediate noisy simulator result (not saved to DB)."""
    success: bool
    error: Optional[str] = None
    fidelity_before: Optional[float] = None
    fidelity_after: Optional[float] = None
    fidelity_improvement: Optional[float] = None
    score: Optional[int] = None
    measurements_before: Optional[Dict[str, int]] = None
    measurements_after: Optional[Dict[str, int]] = None
    qubit_count: Optional[int] = None
    gate_count: Optional[int] = None
    circuit_depth: Optional[int] = None
    execution_time_ms: Optional[float] = None
    success_probability: Optional[float] = None
    post_selected_shots: Optional[int] = None
    eval_method: str = "inverse_bell"
    tomography_correlators: Optional[Dict[str, float]] = None
    backend: str = "noisy_simulator"


class HomeworkCheckTranspileRequest(BaseModel):
    """Check how code would be transpiled for a specific backend."""
    homework_id: str = Field(..., description="Homework ID")
    code: str = Field(..., description="Student's circuit code")
    backend_name: str = Field(..., description="Target backend name")
    eval_method: str = Field(default="inverse_bell", description="'inverse_bell' or 'tomography'")


class HomeworkCheckTranspileResponse(BaseModel):
    """Transpilation preview result."""
    success: bool
    error: Optional[str] = None
    # Parsed code info
    initial_layout: Optional[List[int]] = None
    post_select: Optional[List[str]] = None
    qubit_count: Optional[int] = None
    gate_count: Optional[int] = None
    circuit_depth: Optional[int] = None
    # Transpiled circuit info
    transpiled_qasm: Optional[str] = None
    transpiled_depth: Optional[int] = None
    transpiled_gate_count: Optional[int] = None
    transpiled_qubit_count: Optional[int] = None
    physical_qubits: Optional[List[int]] = None


# ============ Fake Hardware ============

class FakeHardwareSubmitRequest(BaseModel):
    """Request to submit to the fake 4x4 grid hardware"""
    token: str = Field(..., description="Student's homework token")
    homework_id: str = Field(..., description="Homework ID")
    code: str = Field(..., description="Student's circuit code")
    shots: int = Field(default=1024, ge=1, le=8192)
    eval_method: str = Field(default="inverse_bell", description="'inverse_bell' or 'tomography'")


class FakeHardwareSubmitResponse(BaseModel):
    """Response from fake hardware submission"""
    success: bool
    error: Optional[str] = None
    submission_id: Optional[str] = None
    fidelity_after: Optional[float] = None
    success_probability: Optional[float] = None
    post_selected_shots: Optional[int] = None
    measurements: Optional[Dict[str, int]] = None
    qubit_count: Optional[int] = None
    gate_count: Optional[int] = None
    circuit_depth: Optional[int] = None
    execution_time_ms: Optional[float] = None
    eval_method: str = "inverse_bell"
    tomography_correlators: Optional[Dict[str, float]] = None
    backend: str = "fake_4x4"


class FakeHardwareLeaderboardEntry(BaseModel):
    """Single entry on the fake hardware leaderboard"""
    rank: int
    student_label: str
    display_name: Optional[str] = None
    method_name: Optional[str] = None
    fidelity_after: float
    success_probability: Optional[float] = None
    eval_method: str
    qubit_count: Optional[int] = None
    gate_count: Optional[int] = None
    circuit_depth: Optional[int] = None
    created_at: Optional[str] = None


class FakeHardwareLeaderboardResponse(BaseModel):
    """Fake hardware leaderboard response"""
    entries: List[FakeHardwareLeaderboardEntry]
    total_students: int
    updated_at: Optional[str] = None

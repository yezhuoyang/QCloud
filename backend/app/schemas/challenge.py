"""
Pydantic schemas for challenge system - token verification, submissions, leaderboard, admin
"""
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field


# ============ Token Verification ============

class ChallengeTokenVerifyRequest(BaseModel):
    token: str = Field(..., description="Participant's challenge token (hex string)")


class ChallengeTokenVerifyResponse(BaseModel):
    valid: bool
    challenge_id: Optional[str] = None
    challenge_title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    budget_total_seconds: Optional[int] = None
    budget_used_seconds: Optional[float] = None
    budget_remaining_seconds: Optional[float] = None
    submission_count: Optional[int] = None
    allowed_backends: Optional[List[str]] = None
    deadline: Optional[datetime] = None
    starter_code: Optional[str] = None
    display_name: Optional[str] = None
    method_name: Optional[str] = None
    participant_label: Optional[str] = None
    error: Optional[str] = None


# ============ Participant Profile ============

class ChallengeUpdateProfileRequest(BaseModel):
    token: str = Field(..., description="Participant's challenge token")
    display_name: Optional[str] = Field(None, max_length=30)
    method_name: Optional[str] = Field(None, max_length=50)


class ChallengeUpdateProfileResponse(BaseModel):
    display_name: Optional[str] = None
    method_name: Optional[str] = None


# ============ Submission ============

class ChallengeSubmitRequest(BaseModel):
    token: str = Field(..., description="Participant's challenge token")
    code: str = Field(..., description="Participant's circuit code")
    backend: str = Field(..., description="IBM backend name")
    shots: int = Field(default=1024, ge=1, le=8192)


class ChallengeSubmissionResponse(BaseModel):
    id: str
    challenge_id: str
    status: str
    queue_position: Optional[int] = None
    backend_name: str
    shots: int
    ibmq_job_id: Optional[str] = None
    score: Optional[float] = None
    measurements: Optional[Dict[str, int]] = None
    qubit_count: Optional[int] = None
    gate_count: Optional[int] = None
    circuit_depth: Optional[int] = None
    execution_time_seconds: Optional[float] = None
    code: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChallengeSubmissionListResponse(BaseModel):
    submissions: List[ChallengeSubmissionResponse]
    total: int


# ============ Queue ============

class ChallengeQueueEntry(BaseModel):
    id: str
    participant_label: str
    position: int
    backend: str
    submitted_at: datetime


class ChallengeRunningEntry(BaseModel):
    id: str
    participant_label: str
    backend: str
    started_at: Optional[datetime] = None


class ChallengeMyQueueEntry(BaseModel):
    id: str
    position: Optional[int] = None
    status: str


class ChallengeQueueStatusResponse(BaseModel):
    queue: List[ChallengeQueueEntry]
    running: List[ChallengeRunningEntry]
    my_submissions: List[ChallengeMyQueueEntry]
    total_queued: int
    total_running: int
    estimated_wait_minutes: float


# ============ Leaderboard ============

class ChallengeLeaderboardEntry(BaseModel):
    rank: int
    submission_id: str
    participant_label: str
    display_name: Optional[str] = None
    method_name: Optional[str] = None
    score: float
    submitted_at: Optional[datetime] = None
    backend_name: Optional[str] = None


class ChallengeLeaderboardResponse(BaseModel):
    challenge_id: str
    challenge_title: str
    leaderboard: List[ChallengeLeaderboardEntry]
    total_participants: int
    updated_at: datetime


# ============ Global Leaderboards ============

class GlobalProgrammerEntry(BaseModel):
    rank: int
    participant_label: str
    display_name: Optional[str] = None
    total_score: float
    challenges_solved: int


class GlobalProgrammerLeaderboardResponse(BaseModel):
    leaderboard: List[GlobalProgrammerEntry]
    total_participants: int
    updated_at: datetime


class GlobalHardwareEntry(BaseModel):
    rank: int
    backend_name: str
    avg_score: float
    total_jobs: int
    unique_participants: int


class GlobalHardwareLeaderboardResponse(BaseModel):
    leaderboard: List[GlobalHardwareEntry]
    total_backends: int
    updated_at: datetime


# ============ Challenge List & Search ============

class ChallengePublicInfo(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    difficulty: str = "medium"
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: bool = True
    deadline: Optional[datetime] = None
    total_participants: int = 0
    top_score: Optional[float] = None


class ChallengeListResponse(BaseModel):
    challenges: List[ChallengePublicInfo]
    total: int


# ============ Simulate ============

class ChallengeSimulateRequest(BaseModel):
    challenge_id: str = Field(..., description="Challenge ID")
    code: str = Field(..., description="Participant's circuit code")
    shots: int = Field(default=1024, ge=1, le=8192)
    single_qubit_error: float = Field(default=0.01, ge=0.0, le=0.5)
    two_qubit_error: float = Field(default=0.02, ge=0.0, le=0.5)


class ChallengeSimulateResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    score: Optional[float] = None
    measurements: Optional[Dict[str, int]] = None
    qubit_count: Optional[int] = None
    gate_count: Optional[int] = None
    circuit_depth: Optional[int] = None
    execution_time_ms: Optional[float] = None
    backend: str = "noisy_simulator"


# ============ Admin ============

class ChallengeCreateRequest(BaseModel):
    title: str = Field(..., description="Challenge title")
    description: Optional[str] = Field(None, description="Challenge description (markdown)")
    difficulty: str = Field(default="medium")
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    ibmq_api_key: str = Field(..., description="Raw IBM API key (will be encrypted)")
    allowed_backends: List[str] = Field(..., description="List of allowed IBM backend names")
    total_budget_seconds: int = Field(default=21600)
    num_participants: int = Field(default=50)
    max_concurrent_jobs: int = Field(default=3, ge=1, le=10)
    evaluate_code: str = Field(..., description="Python evaluation code: def evaluate(counts, shots, **kwargs) -> float")
    reference_circuit: Optional[str] = None
    starter_code: Optional[str] = None
    deadline: Optional[datetime] = None


class ChallengeCreateResponse(BaseModel):
    id: str
    title: str
    per_participant_budget_seconds: int
    max_concurrent_jobs: int


class ChallengeUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    allowed_backends: Optional[List[str]] = None
    max_concurrent_jobs: Optional[int] = Field(None, ge=1, le=10)
    is_active: Optional[bool] = None
    deadline: Optional[datetime] = None
    evaluate_code: Optional[str] = None
    reference_circuit: Optional[str] = None
    starter_code: Optional[str] = None
    ibmq_api_key: Optional[str] = Field(None, description="New IBM API key (will be re-encrypted)")


class ParticipantEntry(BaseModel):
    uid: str = Field(..., description="Participant UID")
    display_name: Optional[str] = Field(None, max_length=60)


class ChallengeGenerateTokensRequest(BaseModel):
    participant_uids: Optional[List[str]] = Field(None, description="List of participant UIDs (legacy)")
    participants: Optional[List[ParticipantEntry]] = Field(None, description="List of participants with UIDs and names")


class ChallengeTokenEntry(BaseModel):
    participant_uid: str
    display_name: Optional[str] = None
    token: str


class ChallengeGenerateTokensResponse(BaseModel):
    tokens: List[ChallengeTokenEntry]
    count: int


class ChallengeTokenAdminResponse(BaseModel):
    id: str
    participant_uid_hash: str
    participant_uid_raw: Optional[str] = None
    display_name: Optional[str] = None
    token: Optional[str] = None
    budget_used_seconds: float
    budget_limit_seconds: int
    is_active: bool
    submission_count: int
    last_used_at: Optional[datetime] = None
    created_at: datetime


class ChallengeBudgetSummaryResponse(BaseModel):
    challenge_id: str
    challenge_title: str
    total_budget_seconds: int
    total_used_seconds: float
    total_remaining_seconds: float
    num_participants: int
    num_active_tokens: int
    participants: List[ChallengeTokenAdminResponse]


class ChallengeTokenUpdateRequest(BaseModel):
    is_active: Optional[bool] = None
    budget_limit_seconds: Optional[int] = None


class AdminChallengeSubmissionResponse(BaseModel):
    id: str
    challenge_id: str
    token_id: str
    status: str
    queue_position: Optional[int] = None
    backend_name: str
    shots: int
    ibmq_job_id: Optional[str] = None
    score: Optional[float] = None
    measurements: Optional[Dict[str, int]] = None
    qubit_count: Optional[int] = None
    gate_count: Optional[int] = None
    circuit_depth: Optional[int] = None
    execution_time_seconds: Optional[float] = None
    error_message: Optional[str] = None
    code: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    # Token/participant info (joined)
    participant_uid_hash: str
    display_name: Optional[str] = None
    method_name: Optional[str] = None
    participant_label: str

    class Config:
        from_attributes = True


class AdminChallengeSubmissionListResponse(BaseModel):
    submissions: List[AdminChallengeSubmissionResponse]
    total: int
    page: int
    page_size: int

"""
Pydantic Schemas for API Request/Response
"""
from .user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserStatsResponse,
    UserProblemProgressResponse,
    UserProfileResponse,
    UserPublicResponse
)
from .auth import LoginRequest, TokenResponse, RegisterRequest, TokenData
from .submission import SubmissionCreate, SubmissionResponse, SubmissionListResponse, SubmissionResultUpdate
from .job import JobSubmitRequest, JobResponse, JobResultResponse, JobStatusUpdate
from .problem import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    ProblemCreate,
    ProblemUpdate,
    ProblemResponse,
    ProblemListResponse,
    ExampleCreate,
    ExampleUpdate,
    ExampleResponse
)
from .hardware_submission import (
    HardwareSubmissionCreate,
    HardwareSubmissionResponse,
    HardwareSubmissionListResponse,
    HardwareJobStatusResponse
)
from .homework import (
    HomeworkTokenVerifyRequest,
    HomeworkTokenVerifyResponse,
    HomeworkSubmitRequest,
    HomeworkSubmissionResponse as HomeworkSubResponse,
    HomeworkSubmissionListResponse as HomeworkSubListResponse,
    HomeworkQueueStatusResponse,
    HomeworkLeaderboardEntry,
    HomeworkLeaderboardResponse,
    HomeworkCreateRequest,
    HomeworkCreateResponse,
    HomeworkGenerateTokensRequest,
    HomeworkGenerateTokensResponse,
    HomeworkTokenAdminResponse,
    HomeworkBudgetSummaryResponse,
    HomeworkUpdateRequest,
    HomeworkTokenUpdateRequest,
)

__all__ = [
    # User
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserStatsResponse",
    "UserProblemProgressResponse",
    "UserProfileResponse",
    "UserPublicResponse",
    # Auth
    "LoginRequest",
    "TokenResponse",
    "RegisterRequest",
    "TokenData",
    # Submission
    "SubmissionCreate",
    "SubmissionResponse",
    "SubmissionListResponse",
    "SubmissionResultUpdate",
    # Job
    "JobSubmitRequest",
    "JobResponse",
    "JobResultResponse",
    "JobStatusUpdate",
    # Problem
    "CategoryCreate",
    "CategoryUpdate",
    "CategoryResponse",
    "ProblemCreate",
    "ProblemUpdate",
    "ProblemResponse",
    "ProblemListResponse",
    "ExampleCreate",
    "ExampleUpdate",
    "ExampleResponse",
    # Hardware Submission
    "HardwareSubmissionCreate",
    "HardwareSubmissionResponse",
    "HardwareSubmissionListResponse",
    "HardwareJobStatusResponse",
    # Homework
    "HomeworkTokenVerifyRequest",
    "HomeworkTokenVerifyResponse",
    "HomeworkSubmitRequest",
    "HomeworkSubResponse",
    "HomeworkSubListResponse",
    "HomeworkQueueStatusResponse",
    "HomeworkLeaderboardEntry",
    "HomeworkLeaderboardResponse",
    "HomeworkCreateRequest",
    "HomeworkCreateResponse",
    "HomeworkGenerateTokensRequest",
    "HomeworkGenerateTokensResponse",
    "HomeworkTokenAdminResponse",
    "HomeworkBudgetSummaryResponse",
    "HomeworkUpdateRequest",
    "HomeworkTokenUpdateRequest",
]

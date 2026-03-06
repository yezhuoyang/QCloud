"""
Challenge database models - generalized competition system with admin-defined evaluation
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from ..database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Challenge(Base):
    """
    Challenge configuration model.
    Each challenge has admin-defined evaluate_code that scores submissions.
    """
    __tablename__ = "challenges"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    difficulty = Column(String, default="medium")  # easy, medium, hard
    category = Column(String, nullable=True)  # e.g. "error_correction", "optimization"
    tags = Column(Text, nullable=True)  # JSON list: ["entanglement", "distillation", ...]

    # Hardware config
    ibmq_api_key_encrypted = Column(Text, nullable=False)
    ibmq_channel = Column(String, default="ibm_cloud")
    ibmq_instance = Column(String, nullable=True)
    allowed_backends = Column(Text, nullable=False)  # JSON list

    # Budget
    total_budget_seconds = Column(Integer, nullable=False, default=21600)
    num_participants = Column(Integer, default=50)
    per_participant_budget_seconds = Column(Integer, nullable=False, default=720)

    # Queue concurrency control
    max_concurrent_jobs = Column(Integer, default=3)

    # Token generation secret
    token_secret = Column(String, nullable=False)

    # Admin-defined evaluation code: def evaluate(counts, shots, **kwargs) -> float
    evaluate_code = Column(Text, nullable=False)

    # Optional reference circuit and starter code
    reference_circuit = Column(Text, nullable=True)
    starter_code = Column(Text, nullable=True)

    # Status
    is_active = Column(Boolean, default=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deadline = Column(DateTime, nullable=True)

    # Relationships
    tokens = relationship("ChallengeToken", back_populates="challenge", cascade="all, delete-orphan")
    submissions = relationship("ChallengeSubmission", back_populates="challenge")
    creator = relationship("User")


class ChallengeToken(Base):
    """
    Per-participant token for challenge hardware access.
    Same HMAC-SHA256 pattern as HomeworkToken.
    """
    __tablename__ = "challenge_tokens"

    id = Column(String, primary_key=True, default=generate_uuid)
    challenge_id = Column(String, ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_uid = Column(String, nullable=False, index=True)  # SHA256-hashed
    token_hash = Column(String, nullable=False, unique=True)
    token_encrypted = Column(Text, nullable=True)
    participant_uid_encrypted = Column(Text, nullable=True)

    # Budget tracking
    budget_used_seconds = Column(Float, default=0.0)
    budget_limit_seconds = Column(Integer, nullable=False)

    # Participant profile
    display_name = Column(String, nullable=True)
    method_name = Column(String, nullable=True)

    # Status
    is_active = Column(Boolean, default=True)
    submission_count = Column(Integer, default=0)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    challenge = relationship("Challenge", back_populates="tokens")
    submissions = relationship("ChallengeSubmission", back_populates="token")

    __table_args__ = (
        UniqueConstraint('challenge_id', 'participant_uid', name='uq_challenge_participant'),
    )


class ChallengeSubmission(Base):
    """
    Single-circuit submission for a challenge.
    Score comes from admin-defined evaluate_code.
    """
    __tablename__ = "challenge_submissions"

    id = Column(String, primary_key=True, default=generate_uuid)
    challenge_id = Column(String, ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False, index=True)
    token_id = Column(String, ForeignKey("challenge_tokens.id", ondelete="CASCADE"), nullable=False, index=True)

    # Student code (single circuit)
    code = Column(Text, nullable=False)

    # Execution config
    backend_name = Column(String, nullable=False)
    shots = Column(Integer, default=1024)

    # IBM job tracking (single job)
    ibmq_job_id = Column(String, nullable=True, index=True)

    # Queue
    queue_position = Column(Integer, nullable=True)
    status = Column(String, default="queued", index=True)

    # Results
    measurements = Column(Text, nullable=True)  # JSON: {"00": 512, "11": 512}
    execution_time_seconds = Column(Float, nullable=True)

    # Score from evaluate_code (0.0 to 1.0)
    score = Column(Float, nullable=True)

    # Circuit statistics
    qubit_count = Column(Integer, nullable=True)
    gate_count = Column(Integer, nullable=True)
    circuit_depth = Column(Integer, nullable=True)

    # Error tracking
    error_message = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    last_checked_at = Column(DateTime, nullable=True)

    # Relationships
    challenge = relationship("Challenge", back_populates="submissions")
    token = relationship("ChallengeToken", back_populates="submissions")

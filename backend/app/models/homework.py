"""
Homework database models - for token-gated hardware access with budget management
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from ..database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Homework(Base):
    """
    Homework configuration model.
    Stores the homework definition including the encrypted IBM API key,
    budget allocation, and allowed backends.
    """
    __tablename__ = "homeworks"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    course = Column(String, nullable=False, default="CS 238B")

    # Hardware config - IBM API key is Fernet-encrypted at rest
    ibmq_api_key_encrypted = Column(Text, nullable=False)
    ibmq_channel = Column(String, default="ibm_cloud")
    ibmq_instance = Column(String, nullable=True)
    allowed_backends = Column(Text, nullable=False)  # JSON list: ["ibm_torino", "ibm_fez", ...]

    # Budget
    total_budget_seconds = Column(Integer, nullable=False, default=21600)  # 6 hours
    num_students = Column(Integer, default=30)
    per_student_budget_seconds = Column(Integer, nullable=False, default=720)  # 12 min

    # Queue concurrency control
    max_concurrent_jobs = Column(Integer, default=3)

    # Token generation secret (random per homework, used for HMAC)
    token_secret = Column(String, nullable=False)

    # Optional link to competition problem
    problem_id = Column(String, nullable=True)

    # Reference circuit (admin-defined baseline, run alongside student's circuit)
    reference_circuit = Column(Text, nullable=True)
    # Custom judging code (Python code that computes fidelity/score from measurements)
    judge_code = Column(Text, nullable=True)

    # Status
    is_active = Column(Boolean, default=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deadline = Column(DateTime, nullable=True)

    # Relationships
    tokens = relationship("HomeworkToken", back_populates="homework", cascade="all, delete-orphan")
    submissions = relationship("HomeworkSubmission", back_populates="homework")
    creator = relationship("User")


class HomeworkToken(Base):
    """
    Per-student token for homework hardware access.
    Token is HMAC-SHA256(homework.token_secret, student_uid).
    Only the hash of the token and the hash of the UID are stored.
    """
    __tablename__ = "homework_tokens"

    id = Column(String, primary_key=True, default=generate_uuid)
    homework_id = Column(String, ForeignKey("homeworks.id", ondelete="CASCADE"), nullable=False, index=True)
    student_uid = Column(String, nullable=False, index=True)  # SHA256-hashed
    token_hash = Column(String, nullable=False, unique=True)  # SHA256 of HMAC token
    token_encrypted = Column(Text, nullable=True)  # Fernet-encrypted raw token (for admin view)
    student_uid_encrypted = Column(Text, nullable=True)  # Fernet-encrypted raw UID (for admin view)

    # Budget tracking
    budget_used_seconds = Column(Float, default=0.0)
    budget_limit_seconds = Column(Integer, nullable=False)

    # Student profile (editable by student via token)
    display_name = Column(String, nullable=True)  # Custom name shown on leaderboard
    method_name = Column(String, nullable=True)    # Custom method/approach name for leaderboard

    # Status
    is_active = Column(Boolean, default=True)
    submission_count = Column(Integer, default=0)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    homework = relationship("Homework", back_populates="tokens")
    submissions = relationship("HomeworkSubmission", back_populates="token")

    __table_args__ = (
        UniqueConstraint('homework_id', 'student_uid', name='uq_homework_student'),
    )


class HomeworkSubmission(Base):
    """
    Each hardware run for a homework assignment.
    Tracks the FIFO queue position, IBM job, results, and fidelity scores.
    """
    __tablename__ = "homework_submissions"

    id = Column(String, primary_key=True, default=generate_uuid)
    homework_id = Column(String, ForeignKey("homeworks.id", ondelete="CASCADE"), nullable=False, index=True)
    token_id = Column(String, ForeignKey("homework_tokens.id", ondelete="CASCADE"), nullable=False, index=True)

    # Code (reference circuit from admin + student's distillation circuit)
    code_before = Column(Text, nullable=False)  # Reference circuit (copied from homework config)
    code_after = Column(Text, nullable=False)   # Student's distillation circuit

    # Execution config
    backend_name = Column(String, nullable=False)
    shots = Column(Integer, default=1024)

    # IBM job tracking (two jobs: one for before, one for after)
    ibmq_job_id_before = Column(String, nullable=True, index=True)
    ibmq_job_id_after = Column(String, nullable=True, index=True)

    # Queue position (null when running/completed)
    queue_position = Column(Integer, nullable=True)

    # Status: queued -> running -> completed / failed
    status = Column(String, default="queued", index=True)

    # Results (JSON stored as text)
    measurements_before = Column(Text, nullable=True)  # JSON: {"00": 512, "11": 512}
    measurements_after = Column(Text, nullable=True)
    probabilities_before = Column(Text, nullable=True)
    probabilities_after = Column(Text, nullable=True)
    execution_time_seconds = Column(Float, nullable=True)  # Total IBM execution time

    # Fidelity scoring
    fidelity_before = Column(Float, nullable=True)
    fidelity_after = Column(Float, nullable=True)
    fidelity_improvement = Column(Float, nullable=True)
    score = Column(Integer, nullable=True)
    success_probability = Column(Float, nullable=True)
    post_selected_shots = Column(Integer, nullable=True)
    eval_method = Column(String, default="inverse_bell", nullable=False)
    tomography_correlators = Column(Text, nullable=True)  # JSON: {"XX":0.85,"YY":-0.82,"ZZ":0.88}

    # Circuit statistics
    qubit_count = Column(Integer, nullable=True)
    gate_count = Column(Integer, nullable=True)
    circuit_depth = Column(Integer, nullable=True)

    # Error tracking
    error_message = Column(Text, nullable=True)

    # Optional student-provided IBM API key (encrypted, used only for this job)
    custom_api_key_encrypted = Column(Text, nullable=True)
    custom_ibmq_instance = Column(String, nullable=True)  # Student's IBM instance name

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    last_checked_at = Column(DateTime, nullable=True)

    # Relationships
    homework = relationship("Homework", back_populates="submissions")
    token = relationship("HomeworkToken", back_populates="submissions")

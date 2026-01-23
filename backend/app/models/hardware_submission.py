"""
Hardware Submission database model - for direct hardware submissions from code editor
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base


def generate_uuid():
    return str(uuid.uuid4())


class HardwareSubmission(Base):
    """
    Model for tracking direct quantum hardware submissions from the code editor.
    Unlike IBMQJob which is tied to competition problem submissions, this tracks
    all hardware submissions including anonymous/standalone ones.
    """
    __tablename__ = "hardware_submissions"

    id = Column(String, primary_key=True, default=generate_uuid)

    # User who submitted (nullable for anonymous submissions)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # The quantum circuit code submitted
    circuit_code = Column(Text, nullable=False)

    # IBM job tracking
    ibmq_job_id = Column(String, nullable=True, index=True)  # IBM's job ID (null until submitted)
    backend_name = Column(String, nullable=False)  # e.g., ibm_boston, ibm_torino

    # Execution parameters
    shots = Column(Integer, default=1024)

    # Circuit statistics
    qubit_count = Column(Integer, nullable=True)
    gate_count = Column(Integer, nullable=True)
    circuit_depth = Column(Integer, nullable=True)

    # Job status: queued, running, completed, failed, cancelled
    status = Column(String, default="queued", index=True)

    # Results (JSON stored as text)
    measurements = Column(Text, nullable=True)  # JSON: {"00": 512, "11": 512}
    probabilities = Column(Text, nullable=True)  # JSON: {"00": 0.5, "11": 0.5}
    execution_time = Column(Float, nullable=True)  # Time in seconds

    # Error tracking
    error_message = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    started_at = Column(DateTime, nullable=True)  # When IBM started executing
    completed_at = Column(DateTime, nullable=True)  # When results were received
    last_checked_at = Column(DateTime, nullable=True)  # Last time we polled IBM

    # Relationship
    user = relationship("User", back_populates="hardware_submissions")

"""
IBMQ Job database model
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base


def generate_uuid():
    return str(uuid.uuid4())


class IBMQJob(Base):
    """IBMQ Job model for tracking quantum hardware jobs"""
    __tablename__ = "ibmq_jobs"

    id = Column(String, primary_key=True, default=generate_uuid)
    submission_id = Column(String, ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ibmq_job_id = Column(String, nullable=True, index=True)  # IBM's job ID
    backend_name = Column(String, default="ibm_brisbane")
    status = Column(String, default="queued")  # queued, running, completed, failed, cancelled
    result = Column(Text, nullable=True)  # JSON result data
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    submission = relationship("Submission", back_populates="job")
    user = relationship("User", back_populates="jobs")

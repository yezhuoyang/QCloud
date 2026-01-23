"""
Submission database model
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Submission(Base):
    """User submission model"""
    __tablename__ = "submissions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    problem_id = Column(String, nullable=False, index=True)
    code = Column(Text, nullable=False)
    submission_type = Column(String, default="code")  # code or circuit
    target = Column(String, default="simulator")  # simulator or hardware
    status = Column(String, default="pending")  # pending, running, completed, failed, error
    score = Column(Integer, nullable=True)
    fidelity = Column(Float, nullable=True)
    gate_count = Column(Integer, nullable=True)
    circuit_depth = Column(Integer, nullable=True)
    qubit_count = Column(Integer, nullable=True)
    feedback = Column(Text, nullable=True)  # JSON array stored as text
    test_results = Column(Text, nullable=True)  # JSON array stored as text
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="submissions")
    job = relationship("IBMQJob", back_populates="submission", uselist=False)

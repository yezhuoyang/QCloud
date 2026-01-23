"""
User-related database models
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship

from ..database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    """User account model"""
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    stats = relationship("UserStats", back_populates="user", uselist=False, cascade="all, delete-orphan")
    problem_progress = relationship("UserProblemProgress", back_populates="user", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="user", cascade="all, delete-orphan")
    jobs = relationship("IBMQJob", back_populates="user", cascade="all, delete-orphan")
    hardware_submissions = relationship("HardwareSubmission", back_populates="user")


class UserStats(Base):
    """User statistics model"""
    __tablename__ = "user_stats"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    total_score = Column(Integer, default=0)
    problems_solved = Column(Integer, default=0)
    total_submissions = Column(Integer, default=0)
    global_rank = Column(Integer, nullable=True)
    badges = Column(Text, default="[]")  # JSON array stored as text

    # Relationship
    user = relationship("User", back_populates="stats")


class UserProblemProgress(Base):
    """User's progress on individual problems"""
    __tablename__ = "user_problem_progress"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    problem_id = Column(String, nullable=False, index=True)
    status = Column(String, default="not_started")  # not_started, attempted, solved
    best_score = Column(Integer, default=0)
    submission_count = Column(Integer, default=0)
    last_submitted_at = Column(DateTime, nullable=True)

    # Relationship
    user = relationship("User", back_populates="problem_progress")

    # Unique constraint on user_id + problem_id
    __table_args__ = (
        # SQLAlchemy unique constraint
        {"sqlite_autoincrement": True},
    )

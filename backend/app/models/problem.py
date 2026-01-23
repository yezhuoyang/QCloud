"""
Problem and Category database models
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Category(Base):
    """Problem category model"""
    __tablename__ = "categories"

    id = Column(String, primary_key=True)  # e.g., 'grover', 'vqe'
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String, default="📦")
    color = Column(String, default="blue")
    order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    problems = relationship("Problem", back_populates="category_rel")


class Problem(Base):
    """Competition problem model"""
    __tablename__ = "problems"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)  # Markdown content
    category = Column(String, ForeignKey("categories.id"), nullable=False, index=True)
    difficulty = Column(String, nullable=False)  # Easy, Medium, Hard, Expert

    # Constraints (stored as JSON text)
    max_qubits = Column(Integer, default=10)
    max_gate_count = Column(Integer, default=100)
    max_circuit_depth = Column(Integer, default=50)
    allowed_gates = Column(Text, nullable=True)  # JSON array of gate names
    max_two_qubit_gates = Column(Integer, nullable=True)

    # Fidelity requirements
    min_fidelity = Column(Float, default=0.8)
    target_fidelity = Column(Float, default=0.95)
    fidelity_metric = Column(String, default="state_fidelity")

    # Test cases (stored as JSON text)
    test_cases = Column(Text, nullable=False, default="[]")

    # Hints and code templates
    hints = Column(Text, default="[]")  # JSON array
    starter_code = Column(Text, nullable=True)
    solution_template = Column(Text, nullable=True)  # Hidden solution

    # Metadata
    author = Column(String, default="QCloud Team")
    tags = Column(Text, default="[]")  # JSON array
    max_score = Column(Integer, default=100)
    time_bonus = Column(Boolean, default=False)

    # Statistics
    solve_count = Column(Integer, default=0)
    attempt_count = Column(Integer, default=0)

    # Status
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    order = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    category_rel = relationship("Category", back_populates="problems")


class Example(Base):
    """Code example model for applications/examples page"""
    __tablename__ = "examples"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=False, index=True)  # e.g., 'basic', 'algorithms', 'applications'
    difficulty = Column(String, default="Beginner")  # Beginner, Intermediate, Advanced

    # Code content
    code = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)  # Markdown explanation

    # Metadata
    author = Column(String, default="QCloud Team")
    tags = Column(Text, default="[]")  # JSON array
    icon = Column(String, default="📝")

    # Statistics
    view_count = Column(Integer, default=0)
    copy_count = Column(Integer, default=0)

    # Status
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    order = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

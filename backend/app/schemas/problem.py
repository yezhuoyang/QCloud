"""
Problem, Category, and Example Pydantic schemas
"""
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field


# ============ Category Schemas ============

class CategoryBase(BaseModel):
    """Base category schema"""
    id: str
    name: str
    description: Optional[str] = None
    icon: str = "📦"
    color: str = "blue"
    order: int = 0


class CategoryCreate(CategoryBase):
    """Schema for creating a category"""
    pass


class CategoryUpdate(BaseModel):
    """Schema for updating a category"""
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryResponse(CategoryBase):
    """Category response schema"""
    is_active: bool = True
    problem_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Problem Schemas ============

class ProblemBase(BaseModel):
    """Base problem schema"""
    title: str
    description: str
    category: str
    difficulty: str = Field(..., pattern="^(Easy|Medium|Hard|Expert)$")


class ProblemCreate(ProblemBase):
    """Schema for creating a problem"""
    id: Optional[str] = None  # Auto-generated if not provided

    # Constraints
    max_qubits: int = 10
    max_gate_count: int = 100
    max_circuit_depth: int = 50
    allowed_gates: Optional[List[str]] = None
    max_two_qubit_gates: Optional[int] = None

    # Fidelity
    min_fidelity: float = 0.8
    target_fidelity: float = 0.95
    fidelity_metric: str = "state_fidelity"

    # Content
    test_cases: List[Any] = []
    hints: List[str] = []
    starter_code: Optional[str] = None
    solution_template: Optional[str] = None

    # Metadata
    author: str = "QCloud Team"
    tags: List[str] = []
    max_score: int = 100
    time_bonus: bool = False

    # Status
    is_active: bool = True
    is_featured: bool = False
    order: int = 0


class ProblemUpdate(BaseModel):
    """Schema for updating a problem"""
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None

    max_qubits: Optional[int] = None
    max_gate_count: Optional[int] = None
    max_circuit_depth: Optional[int] = None
    allowed_gates: Optional[List[str]] = None
    max_two_qubit_gates: Optional[int] = None

    min_fidelity: Optional[float] = None
    target_fidelity: Optional[float] = None
    fidelity_metric: Optional[str] = None

    test_cases: Optional[List[Any]] = None
    hints: Optional[List[str]] = None
    starter_code: Optional[str] = None
    solution_template: Optional[str] = None

    author: Optional[str] = None
    tags: Optional[List[str]] = None
    max_score: Optional[int] = None
    time_bonus: Optional[bool] = None

    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    order: Optional[int] = None


class ProblemResponse(BaseModel):
    """Problem response schema"""
    id: str
    title: str
    description: str
    category: str
    difficulty: str

    max_qubits: int
    max_gate_count: int
    max_circuit_depth: int
    allowed_gates: Optional[List[str]] = None
    max_two_qubit_gates: Optional[int] = None

    min_fidelity: float
    target_fidelity: float
    fidelity_metric: str

    test_cases: List[Any] = []
    hints: List[str] = []
    starter_code: Optional[str] = None

    author: str
    tags: List[str] = []
    max_score: int
    time_bonus: bool

    solve_count: int
    attempt_count: int

    is_active: bool
    is_featured: bool
    order: int

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProblemListResponse(BaseModel):
    """Problem list response (without full description)"""
    id: str
    title: str
    category: str
    difficulty: str
    max_qubits: int
    solve_count: int
    attempt_count: int
    is_active: bool
    is_featured: bool
    order: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Example Schemas ============

class ExampleBase(BaseModel):
    """Base example schema"""
    title: str
    description: Optional[str] = None
    category: str
    difficulty: str = "Beginner"
    code: str


class ExampleCreate(ExampleBase):
    """Schema for creating an example"""
    explanation: Optional[str] = None
    author: str = "QCloud Team"
    tags: List[str] = []
    icon: str = "📝"
    is_active: bool = True
    is_featured: bool = False
    order: int = 0


class ExampleUpdate(BaseModel):
    """Schema for updating an example"""
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    code: Optional[str] = None
    explanation: Optional[str] = None
    author: Optional[str] = None
    tags: Optional[List[str]] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    order: Optional[int] = None


class ExampleResponse(ExampleBase):
    """Example response schema"""
    id: str
    explanation: Optional[str] = None
    author: str
    tags: List[str] = []
    icon: str
    view_count: int
    copy_count: int
    is_active: bool
    is_featured: bool
    order: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

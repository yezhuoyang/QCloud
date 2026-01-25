"""
Admin API endpoints for managing problems, categories, examples, and users
"""
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Category, Problem, Example
from ..schemas import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    ProblemCreate,
    ProblemUpdate,
    ProblemResponse,
    ProblemListResponse,
    ExampleCreate,
    ExampleUpdate,
    ExampleResponse,
    UserResponse
)
from ..core.deps import get_admin_user

router = APIRouter(prefix="/admin", tags=["Admin"])


# ============ Category Endpoints ============

@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
    include_inactive: bool = Query(default=False)
):
    """List all categories (admin only)"""
    query = db.query(Category)
    if not include_inactive:
        query = query.filter(Category.is_active == True)
    categories = query.order_by(Category.order).all()

    # Add problem count
    result = []
    for cat in categories:
        cat_dict = {
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "icon": cat.icon,
            "color": cat.color,
            "order": cat.order,
            "is_active": cat.is_active,
            "problem_count": db.query(Problem).filter(Problem.category == cat.id).count(),
            "created_at": cat.created_at,
            "updated_at": cat.updated_at
        }
        result.append(cat_dict)

    return result


@router.get("/categories/{category_id}", response_model=CategoryResponse)
def get_category(
    category_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get a single category (admin only)"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    return {
        **category.__dict__,
        "problem_count": db.query(Problem).filter(Problem.category == category.id).count()
    }


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Create a new category (admin only)"""
    # Check if category ID already exists
    existing = db.query(Category).filter(Category.id == data.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this ID already exists"
        )

    category = Category(
        id=data.id,
        name=data.name,
        description=data.description,
        icon=data.icon,
        color=data.color,
        order=data.order
    )
    db.add(category)
    db.commit()
    db.refresh(category)

    return {
        **category.__dict__,
        "problem_count": 0
    }


@router.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: str,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Update a category (admin only)"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(category, key, value)

    db.commit()
    db.refresh(category)

    return {
        **category.__dict__,
        "problem_count": db.query(Problem).filter(Problem.category == category.id).count()
    }


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Delete a category (admin only)"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Check if category has problems
    problem_count = db.query(Problem).filter(Problem.category == category_id).count()
    if problem_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete category with {problem_count} problems. Move or delete problems first."
        )

    db.delete(category)
    db.commit()

    return {"message": "Category deleted successfully"}


# ============ Problem Endpoints ============

def _format_problem(problem: Problem) -> dict:
    """Format problem for response"""
    return {
        "id": problem.id,
        "title": problem.title,
        "description": problem.description,
        "category": problem.category,
        "difficulty": problem.difficulty,
        "max_qubits": problem.max_qubits,
        "max_gate_count": problem.max_gate_count,
        "max_circuit_depth": problem.max_circuit_depth,
        "allowed_gates": json.loads(problem.allowed_gates) if problem.allowed_gates else None,
        "max_two_qubit_gates": problem.max_two_qubit_gates,
        "min_fidelity": problem.min_fidelity,
        "target_fidelity": problem.target_fidelity,
        "fidelity_metric": problem.fidelity_metric,
        "test_cases": json.loads(problem.test_cases) if problem.test_cases else [],
        "hints": json.loads(problem.hints) if problem.hints else [],
        "starter_code": problem.starter_code,
        "author": problem.author,
        "tags": json.loads(problem.tags) if problem.tags else [],
        "max_score": problem.max_score,
        "time_bonus": problem.time_bonus,
        "solve_count": problem.solve_count,
        "attempt_count": problem.attempt_count,
        "is_active": problem.is_active,
        "is_featured": problem.is_featured,
        "order": problem.order,
        "created_at": problem.created_at,
        "updated_at": problem.updated_at
    }


@router.get("/problems", response_model=List[ProblemListResponse])
def list_problems(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
    category: Optional[str] = Query(default=None),
    include_inactive: bool = Query(default=True)
):
    """List all problems (admin only)"""
    query = db.query(Problem)
    if category:
        query = query.filter(Problem.category == category)
    if not include_inactive:
        query = query.filter(Problem.is_active == True)

    problems = query.order_by(Problem.order, Problem.created_at.desc()).all()
    return problems


@router.get("/problems/{problem_id}", response_model=ProblemResponse)
def get_problem(
    problem_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get a problem with full details including solution (admin only)"""
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found"
        )

    result = _format_problem(problem)
    # Include solution template for admins
    result["solution_template"] = problem.solution_template
    return result


@router.post("/problems", response_model=ProblemResponse, status_code=status.HTTP_201_CREATED)
def create_problem(
    data: ProblemCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Create a new problem (admin only)"""
    # Verify category exists
    if not db.query(Category).filter(Category.id == data.category).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category does not exist"
        )

    problem = Problem(
        id=data.id if data.id else None,
        title=data.title,
        description=data.description,
        category=data.category,
        difficulty=data.difficulty,
        max_qubits=data.max_qubits,
        max_gate_count=data.max_gate_count,
        max_circuit_depth=data.max_circuit_depth,
        allowed_gates=json.dumps(data.allowed_gates) if data.allowed_gates else None,
        max_two_qubit_gates=data.max_two_qubit_gates,
        min_fidelity=data.min_fidelity,
        target_fidelity=data.target_fidelity,
        fidelity_metric=data.fidelity_metric,
        test_cases=json.dumps(data.test_cases),
        hints=json.dumps(data.hints),
        starter_code=data.starter_code,
        solution_template=data.solution_template,
        author=data.author,
        tags=json.dumps(data.tags),
        max_score=data.max_score,
        time_bonus=data.time_bonus,
        is_active=data.is_active,
        is_featured=data.is_featured,
        order=data.order
    )
    db.add(problem)
    db.commit()
    db.refresh(problem)

    return _format_problem(problem)


@router.put("/problems/{problem_id}", response_model=ProblemResponse)
def update_problem(
    problem_id: str,
    data: ProblemUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Update a problem (admin only)"""
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found"
        )

    update_data = data.model_dump(exclude_unset=True)

    # Handle JSON fields
    json_fields = ['allowed_gates', 'test_cases', 'hints', 'tags']
    for field in json_fields:
        if field in update_data and update_data[field] is not None:
            update_data[field] = json.dumps(update_data[field])

    for key, value in update_data.items():
        setattr(problem, key, value)

    db.commit()
    db.refresh(problem)

    return _format_problem(problem)


@router.delete("/problems/{problem_id}")
def delete_problem(
    problem_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Delete a problem (admin only)"""
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found"
        )

    db.delete(problem)
    db.commit()

    return {"message": "Problem deleted successfully"}


# ============ Example Endpoints ============

def _format_example(example: Example) -> dict:
    """Format example for response"""
    return {
        "id": example.id,
        "title": example.title,
        "description": example.description,
        "category": example.category,
        "difficulty": example.difficulty,
        "code": example.code,
        "explanation": example.explanation,
        "author": example.author,
        "tags": json.loads(example.tags) if example.tags else [],
        "icon": example.icon,
        "view_count": example.view_count,
        "copy_count": example.copy_count,
        "is_active": example.is_active,
        "is_featured": example.is_featured,
        "order": example.order,
        "created_at": example.created_at,
        "updated_at": example.updated_at
    }


@router.get("/examples", response_model=List[ExampleResponse])
def list_examples(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
    category: Optional[str] = Query(default=None),
    include_inactive: bool = Query(default=True)
):
    """List all examples (admin only)"""
    query = db.query(Example)
    if category:
        query = query.filter(Example.category == category)
    if not include_inactive:
        query = query.filter(Example.is_active == True)

    examples = query.order_by(Example.order, Example.created_at.desc()).all()
    return [_format_example(e) for e in examples]


@router.get("/examples/{example_id}", response_model=ExampleResponse)
def get_example(
    example_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get a single example (admin only)"""
    example = db.query(Example).filter(Example.id == example_id).first()
    if not example:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Example not found"
        )

    return _format_example(example)


@router.post("/examples", response_model=ExampleResponse, status_code=status.HTTP_201_CREATED)
def create_example(
    data: ExampleCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Create a new example (admin only)"""
    example = Example(
        title=data.title,
        description=data.description,
        category=data.category,
        difficulty=data.difficulty,
        code=data.code,
        explanation=data.explanation,
        author=data.author,
        tags=json.dumps(data.tags),
        icon=data.icon,
        is_active=data.is_active,
        is_featured=data.is_featured,
        order=data.order
    )
    db.add(example)
    db.commit()
    db.refresh(example)

    return _format_example(example)


@router.put("/examples/{example_id}", response_model=ExampleResponse)
def update_example(
    example_id: str,
    data: ExampleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Update an example (admin only)"""
    example = db.query(Example).filter(Example.id == example_id).first()
    if not example:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Example not found"
        )

    update_data = data.model_dump(exclude_unset=True)

    # Handle JSON fields
    if 'tags' in update_data and update_data['tags'] is not None:
        update_data['tags'] = json.dumps(update_data['tags'])

    for key, value in update_data.items():
        setattr(example, key, value)

    db.commit()
    db.refresh(example)

    return _format_example(example)


@router.delete("/examples/{example_id}")
def delete_example(
    example_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Delete an example (admin only)"""
    example = db.query(Example).filter(Example.id == example_id).first()
    if not example:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Example not found"
        )

    db.delete(example)
    db.commit()

    return {"message": "Example deleted successfully"}


# ============ User Management Endpoints ============

@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0)
):
    """List all users (admin only)"""
    users = db.query(User).order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    return users


@router.put("/users/{user_id}/admin")
def toggle_admin(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Toggle admin status for a user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent removing own admin status
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify your own admin status"
        )

    user.is_admin = not user.is_admin
    db.commit()

    return {"message": f"User is now {'an admin' if user.is_admin else 'not an admin'}", "is_admin": user.is_admin}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Delete a user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent self-deletion
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    db.delete(user)
    db.commit()

    return {"message": "User deleted successfully"}

"""
Public API endpoints for problems and examples
"""
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Category, Problem, Example

router = APIRouter(prefix="/problems", tags=["Problems"])


# ============ Category Endpoints ============

@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    """List all active problem categories with problem counts"""
    categories = db.query(Category).filter(
        Category.id.like("problem-%"),
        Category.is_active == True
    ).order_by(Category.order).all()

    result = []
    for cat in categories:
        problem_count = db.query(Problem).filter(
            Problem.category == cat.id,
            Problem.is_active == True
        ).count()
        result.append({
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "icon": cat.icon,
            "color": cat.color,
            "problemCount": problem_count
        })

    return result


# ============ Problem Endpoints ============

@router.get("/")
def list_problems(
    db: Session = Depends(get_db),
    category: Optional[str] = Query(default=None),
    difficulty: Optional[str] = Query(default=None),
    featured: Optional[bool] = Query(default=None)
):
    """List all active problems"""
    query = db.query(Problem).filter(Problem.is_active == True)

    if category:
        # Support both full ID and short ID
        full_id = category if category.startswith("problem-") else f"problem-{category}"
        query = query.filter(Problem.category == full_id)
    if difficulty:
        query = query.filter(Problem.difficulty == difficulty)
    if featured is not None:
        query = query.filter(Problem.is_featured == featured)

    problems = query.order_by(Problem.order, Problem.created_at.desc()).all()

    result = []
    for p in problems:
        result.append({
            "id": p.id,
            "title": p.title,
            "description": p.description[:500] + "..." if len(p.description) > 500 else p.description,
            "category": p.category,
            "difficulty": p.difficulty,
            "solveCount": p.solve_count or 0,
            "attemptCount": p.attempt_count or 0,
            "maxScore": p.max_score,
            "tags": json.loads(p.tags) if p.tags else [],
            "isFeatured": p.is_featured,
            "timeBonus": p.time_bonus,
            "constraints": {
                "maxQubits": p.max_qubits,
                "maxGateCount": p.max_gate_count,
                "maxCircuitDepth": p.max_circuit_depth
            },
            "fidelityRequirement": {
                "minFidelity": p.min_fidelity,
                "targetFidelity": p.target_fidelity,
                "metric": p.fidelity_metric
            },
            "createdAt": p.created_at.isoformat() if p.created_at else None
        })

    return result


@router.get("/grouped")
def list_problems_grouped(db: Session = Depends(get_db)):
    """List all active problems grouped by category"""
    categories = db.query(Category).filter(
        Category.id.like("problem-%"),
        Category.is_active == True
    ).order_by(Category.order).all()

    result = []
    for cat in categories:
        problems = db.query(Problem).filter(
            Problem.category == cat.id,
            Problem.is_active == True
        ).order_by(Problem.order).all()

        problem_list = []
        for p in problems:
            problem_list.append({
                "id": p.id,
                "title": p.title,
                "description": p.description[:500] + "..." if len(p.description) > 500 else p.description,
                "category": p.category,
                "difficulty": p.difficulty,
                "solveCount": p.solve_count or 0,
                "attemptCount": p.attempt_count or 0,
                "maxScore": p.max_score,
                "tags": json.loads(p.tags) if p.tags else [],
                "isFeatured": p.is_featured,
                "timeBonus": p.time_bonus,
                "constraints": {
                    "maxQubits": p.max_qubits,
                    "maxGateCount": p.max_gate_count,
                    "maxCircuitDepth": p.max_circuit_depth
                },
                "fidelityRequirement": {
                    "minFidelity": p.min_fidelity,
                    "targetFidelity": p.target_fidelity,
                    "metric": p.fidelity_metric
                },
                "createdAt": p.created_at.isoformat() if p.created_at else None
            })

        result.append({
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "icon": cat.icon,
            "color": cat.color,
            "problems": problem_list
        })

    return result


@router.get("/stats")
def get_problems_stats(db: Session = Depends(get_db)):
    """Get overview statistics for problems"""
    total_problems = db.query(Problem).filter(Problem.is_active == True).count()

    by_difficulty = {}
    for difficulty in ["Easy", "Medium", "Hard", "Expert"]:
        count = db.query(Problem).filter(
            Problem.is_active == True,
            Problem.difficulty == difficulty
        ).count()
        by_difficulty[difficulty] = count

    categories = db.query(Category).filter(
        Category.id.like("problem-%"),
        Category.is_active == True
    ).all()

    by_category = []
    for cat in categories:
        count = db.query(Problem).filter(
            Problem.category == cat.id,
            Problem.is_active == True
        ).count()
        by_category.append({
            "category": cat.id,
            "name": cat.name,
            "count": count
        })

    return {
        "totalProblems": total_problems,
        "byDifficulty": by_difficulty,
        "byCategory": by_category
    }


@router.get("/{problem_id}")
def get_problem(problem_id: str, db: Session = Depends(get_db)):
    """Get a problem with full details (excluding solution)"""
    problem = db.query(Problem).filter(
        Problem.id == problem_id,
        Problem.is_active == True
    ).first()

    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found"
        )

    # Parse test cases but hide hidden ones
    test_cases = json.loads(problem.test_cases) if problem.test_cases else []
    visible_test_cases = [tc for tc in test_cases if not tc.get("isHidden", False)]

    return {
        "id": problem.id,
        "title": problem.title,
        "description": problem.description,
        "category": problem.category,
        "difficulty": problem.difficulty,
        "constraints": {
            "maxQubits": problem.max_qubits,
            "maxGateCount": problem.max_gate_count,
            "maxCircuitDepth": problem.max_circuit_depth,
            "allowedGates": json.loads(problem.allowed_gates) if problem.allowed_gates else None,
            "maxTwoQubitGates": problem.max_two_qubit_gates
        },
        "fidelityRequirement": {
            "minFidelity": problem.min_fidelity,
            "targetFidelity": problem.target_fidelity,
            "metric": problem.fidelity_metric
        },
        "testCases": visible_test_cases,
        "hints": json.loads(problem.hints) if problem.hints else [],
        "starterCode": problem.starter_code,
        "author": problem.author,
        "tags": json.loads(problem.tags) if problem.tags else [],
        "maxScore": problem.max_score,
        "timeBonus": problem.time_bonus,
        "solveCount": problem.solve_count or 0,
        "attemptCount": problem.attempt_count or 0,
        "createdAt": problem.created_at.isoformat() if problem.created_at else None
    }


# ============ Example Endpoints ============

@router.get("/examples/categories")
def list_example_categories(db: Session = Depends(get_db)):
    """List all active example categories with example counts"""
    categories = db.query(Category).filter(
        Category.id.like("example-%"),
        Category.is_active == True
    ).order_by(Category.order).all()

    result = []
    for cat in categories:
        example_count = db.query(Example).filter(
            Example.category == cat.id,
            Example.is_active == True
        ).count()
        result.append({
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "icon": cat.icon,
            "color": cat.color,
            "exampleCount": example_count
        })

    return result


@router.get("/examples/")
def list_examples(
    db: Session = Depends(get_db),
    category: Optional[str] = Query(default=None),
    difficulty: Optional[str] = Query(default=None),
    featured: Optional[bool] = Query(default=None)
):
    """List all active examples"""
    query = db.query(Example).filter(Example.is_active == True)

    if category:
        # Support both full ID and short ID
        full_id = category if category.startswith("example-") else f"example-{category}"
        query = query.filter(Example.category == full_id)
    if difficulty:
        query = query.filter(Example.difficulty == difficulty)
    if featured is not None:
        query = query.filter(Example.is_featured == featured)

    examples = query.order_by(Example.order, Example.created_at.desc()).all()

    result = []
    for e in examples:
        result.append({
            "id": e.id,
            "title": e.title,
            "description": e.description,
            "category": e.category,
            "difficulty": e.difficulty,
            "code": e.code,
            "explanation": e.explanation,
            "author": e.author,
            "tags": json.loads(e.tags) if e.tags else [],
            "icon": e.icon or "📝",
            "viewCount": e.view_count or 0,
            "copyCount": e.copy_count or 0,
            "isFeatured": e.is_featured
        })

    return result


@router.get("/examples/grouped")
def list_examples_grouped(db: Session = Depends(get_db)):
    """List all active examples grouped by category"""
    categories = db.query(Category).filter(
        Category.id.like("example-%"),
        Category.is_active == True
    ).order_by(Category.order).all()

    result = []
    for cat in categories:
        examples = db.query(Example).filter(
            Example.category == cat.id,
            Example.is_active == True
        ).order_by(Example.order).all()

        example_list = []
        for e in examples:
            example_list.append({
                "id": e.id,
                "title": e.title,
                "description": e.description,
                "category": e.category,
                "difficulty": e.difficulty,
                "code": e.code,
                "explanation": e.explanation,
                "author": e.author,
                "tags": json.loads(e.tags) if e.tags else [],
                "icon": e.icon or "📝",
                "viewCount": e.view_count or 0,
                "copyCount": e.copy_count or 0,
                "isFeatured": e.is_featured
            })

        result.append({
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "icon": cat.icon,
            "color": cat.color,
            "examples": example_list
        })

    return result


@router.get("/examples/{example_id}")
def get_example(example_id: str, db: Session = Depends(get_db)):
    """Get an example with full details"""
    example = db.query(Example).filter(
        Example.id == example_id,
        Example.is_active == True
    ).first()

    if not example:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Example not found"
        )

    # Increment view count
    example.view_count = (example.view_count or 0) + 1
    db.commit()

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
        "icon": example.icon or "📝",
        "viewCount": example.view_count,
        "copyCount": example.copy_count or 0,
        "isFeatured": example.is_featured,
        "createdAt": example.created_at.isoformat() if example.created_at else None
    }


@router.post("/examples/{example_id}/copy")
def track_example_copy(example_id: str, db: Session = Depends(get_db)):
    """Track when an example is copied"""
    example = db.query(Example).filter(Example.id == example_id).first()
    if example:
        example.copy_count = (example.copy_count or 0) + 1
        db.commit()
    return {"success": True}

"""
Homework service - token generation, encryption, budget management, fidelity computation.
"""
import hmac
import hashlib
import json
import os
import base64
from datetime import datetime
from typing import Optional, Tuple

from cryptography.fernet import Fernet
from sqlalchemy.orm import Session

from ..config import settings
from ..models.homework import Homework, HomeworkToken, HomeworkSubmission


# ============ Token System ============

def generate_student_token(homework_secret: str, student_uid: str) -> str:
    """
    Derive a deterministic token from the homework secret and student UID.
    Returns hex-encoded HMAC-SHA256 digest.
    """
    return hmac.new(
        homework_secret.encode("utf-8"),
        student_uid.strip().encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def hash_token(token: str) -> str:
    """Hash a token for storage (so we never store raw tokens)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_student_uid(student_uid: str) -> str:
    """Hash a student UID for storage."""
    return hashlib.sha256(student_uid.strip().encode("utf-8")).hexdigest()


def verify_homework_token(db: Session, token: str) -> Optional[HomeworkToken]:
    """
    Verify a homework token and return the token record if valid.
    Returns None if token is invalid, inactive, or homework is expired.
    """
    token_h = hash_token(token)
    token_record = (
        db.query(HomeworkToken)
        .filter(HomeworkToken.token_hash == token_h, HomeworkToken.is_active == True)
        .first()
    )
    if not token_record:
        return None

    homework = token_record.homework
    if not homework.is_active:
        return None

    if homework.deadline and datetime.utcnow() > homework.deadline:
        return None

    return token_record


# ============ API Key Encryption ============

def _get_fernet_key(secret_key: str) -> bytes:
    """Derive a Fernet key from the app's SECRET_KEY."""
    key_bytes = hashlib.sha256(secret_key.encode()).digest()
    return base64.urlsafe_b64encode(key_bytes)


def encrypt_api_key(api_key: str, secret_key: str = None) -> str:
    """Encrypt an API key using Fernet symmetric encryption."""
    sk = secret_key or settings.secret_key
    f = Fernet(_get_fernet_key(sk))
    return f.encrypt(api_key.encode()).decode()


def decrypt_api_key(encrypted_key: str, secret_key: str = None) -> str:
    """Decrypt an API key."""
    sk = secret_key or settings.secret_key
    f = Fernet(_get_fernet_key(sk))
    return f.decrypt(encrypted_key.encode()).decode()


# ============ Budget Management ============

def check_budget(token_record: HomeworkToken) -> Tuple[bool, float]:
    """
    Check if student has remaining budget.
    Returns (has_budget, remaining_seconds).
    Requires at least 30 seconds remaining for a submission.
    """
    remaining = token_record.budget_limit_seconds - token_record.budget_used_seconds
    return remaining >= 30, max(0.0, remaining)


def deduct_budget(db: Session, token_record: HomeworkToken, execution_time_seconds: float):
    """Deduct actual execution time from student's budget."""
    token_record.budget_used_seconds += execution_time_seconds
    token_record.last_used_at = datetime.utcnow()
    token_record.submission_count += 1
    db.commit()


# ============ Fidelity Computation ============

def compute_bell_fidelity(counts: dict, total_shots: int) -> float:
    """
    Compute Bell pair fidelity from measurement counts.
    For |Phi+> = (|00> + |11>)/sqrt(2), the ideal distribution is:
    P(00) = 0.5, P(11) = 0.5, P(01) = 0, P(10) = 0

    Fidelity = (counts['00'] + counts['11']) / total_shots
    This is a lower bound on the actual state fidelity.
    """
    if total_shots <= 0:
        return 0.0
    bell_counts = counts.get("00", 0) + counts.get("11", 0)
    return bell_counts / total_shots


def compute_homework_score(fidelity_before: float, fidelity_after: float) -> int:
    """
    Score based on final distilled fidelity and improvement.
    Max score: 100
    - 70 points from fidelity_after (0.5 -> 0 pts, 1.0 -> 70 pts)
    - 30 points from fidelity_improvement (0 -> 0 pts, 0.3+ -> 30 pts)
    """
    fidelity_score = max(0, (fidelity_after - 0.5) / 0.5) * 70
    improvement = max(0, fidelity_after - fidelity_before)
    improvement_score = min(1.0, improvement / 0.3) * 30
    return min(100, int(fidelity_score + improvement_score))


def execute_judge_code(
    judge_code: str,
    counts_before: dict,
    total_before: int,
    counts_after: dict,
    total_after: int,
) -> dict:
    """
    Execute admin-defined judge code in a sandboxed namespace.
    The judge code receives:
      - counts_before, total_before (reference circuit results)
      - counts_after, total_after (student circuit results)
    Must set: fidelity_before (float), fidelity_after (float), score (int 0-100)
    """
    import math
    namespace = {
        '__builtins__': {
            'range': range, 'len': len, 'int': int, 'float': float,
            'abs': abs, 'round': round, 'min': min, 'max': max, 'sum': sum,
            'sorted': sorted, 'list': list, 'dict': dict, 'set': set, 'tuple': tuple,
            'True': True, 'False': False, 'None': None,
            'print': lambda *a, **kw: None,
            'enumerate': enumerate, 'zip': zip, 'map': map, 'filter': filter,
        },
        'math': math,
        'pi': math.pi,
        'sqrt': math.sqrt,
        'log': math.log,
        'log2': math.log2,
        'counts_before': counts_before,
        'total_before': total_before,
        'counts_after': counts_after,
        'total_after': total_after,
    }

    exec(judge_code, namespace)

    return {
        'fidelity_before': float(namespace.get('fidelity_before', 0.0)),
        'fidelity_after': float(namespace.get('fidelity_after', 0.0)),
        'score': max(0, min(100, int(namespace.get('score', 0)))),
    }


# ============ Homework CRUD ============

def create_homework(
    db: Session,
    title: str,
    ibmq_api_key: str,
    allowed_backends: list,
    created_by: str,
    description: str = None,
    course: str = "CS 238B",
    ibmq_channel: str = "ibm_cloud",
    ibmq_instance: str = None,
    total_budget_seconds: int = 21600,
    num_students: int = 30,
    max_concurrent_jobs: int = 3,
    problem_id: str = None,
    deadline: datetime = None,
    reference_circuit: str = None,
    judge_code: str = None,
) -> Homework:
    """Create a new homework with encrypted API key and random token secret."""
    token_secret = os.urandom(32).hex()
    encrypted_key = encrypt_api_key(ibmq_api_key)
    per_student = total_budget_seconds // num_students

    homework = Homework(
        title=title,
        description=description,
        course=course,
        ibmq_api_key_encrypted=encrypted_key,
        ibmq_channel=ibmq_channel,
        ibmq_instance=ibmq_instance,
        allowed_backends=json.dumps(allowed_backends),
        total_budget_seconds=total_budget_seconds,
        num_students=num_students,
        per_student_budget_seconds=per_student,
        max_concurrent_jobs=max_concurrent_jobs,
        token_secret=token_secret,
        problem_id=problem_id,
        is_active=True,
        created_by=created_by,
        deadline=deadline,
        reference_circuit=reference_circuit,
        judge_code=judge_code,
    )
    db.add(homework)
    db.commit()
    db.refresh(homework)
    return homework


def generate_tokens_for_homework(
    db: Session, homework: Homework, student_uids: list
) -> list:
    """
    Generate tokens for a list of student UIDs.
    Returns list of dicts: [{"student_uid": "...", "token": "..."}]
    The raw tokens are only returned once — they are never stored.
    """
    results = []
    for uid in student_uids:
        uid = uid.strip()
        if not uid:
            continue

        uid_hash = hash_student_uid(uid)
        token = generate_student_token(homework.token_secret, uid)
        token_h = hash_token(token)

        existing = (
            db.query(HomeworkToken)
            .filter(
                HomeworkToken.homework_id == homework.id,
                HomeworkToken.student_uid == uid_hash,
            )
            .first()
        )

        if not existing:
            token_record = HomeworkToken(
                homework_id=homework.id,
                student_uid=uid_hash,
                token_hash=token_h,
                budget_limit_seconds=homework.per_student_budget_seconds,
                is_active=True,
            )
            db.add(token_record)

        results.append({"student_uid": uid, "token": token})

    db.commit()
    return results


def get_homework(db: Session, homework_id: str) -> Optional[Homework]:
    """Get homework by ID."""
    return db.query(Homework).filter(Homework.id == homework_id).first()


def get_student_label(token_record: HomeworkToken) -> str:
    """Get anonymized student label (first 6 chars of UID hash)."""
    return token_record.student_uid[:6]

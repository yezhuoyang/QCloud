"""
Challenge service - token generation, budget management, custom evaluation.
Reuses crypto/token patterns from homework_service.
"""
import json
import os
from datetime import datetime
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from ..models.challenge import Challenge, ChallengeToken, ChallengeSubmission
from .homework_service import (
    generate_student_token as generate_participant_token,
    hash_token,
    hash_student_uid as hash_participant_uid,
    encrypt_api_key,
    decrypt_api_key,
)


# ============ Token System ============

def verify_challenge_token(db: Session, token: str) -> Optional[ChallengeToken]:
    """
    Verify a challenge token and return the token record if valid.
    Returns None if token is invalid, inactive, or challenge is expired.
    """
    token_h = hash_token(token)
    token_record = (
        db.query(ChallengeToken)
        .filter(ChallengeToken.token_hash == token_h, ChallengeToken.is_active == True)
        .first()
    )
    if not token_record:
        return None

    challenge = token_record.challenge
    if not challenge.is_active:
        return None

    if challenge.deadline and datetime.utcnow() > challenge.deadline:
        return None

    return token_record


def get_participant_label(token_record: ChallengeToken) -> str:
    """Get anonymized participant label (first 6 chars of UID hash)."""
    return token_record.participant_uid[:6]


# ============ Budget Management ============

def check_budget(token_record: ChallengeToken) -> Tuple[bool, float]:
    """Check if participant has remaining budget. Requires at least 30 seconds."""
    remaining = token_record.budget_limit_seconds - token_record.budget_used_seconds
    return remaining >= 30, max(0.0, remaining)


def deduct_budget(db: Session, token_record: ChallengeToken, execution_time_seconds: float):
    """Deduct actual execution time from participant's budget."""
    token_record.budget_used_seconds += execution_time_seconds
    token_record.last_used_at = datetime.utcnow()
    token_record.submission_count += 1
    db.commit()


# ============ Custom Evaluation ============

def execute_evaluate_code(evaluate_code: str, counts: dict, shots: int, **kwargs) -> float:
    """
    Execute admin-defined evaluation code in a sandboxed namespace.
    The evaluate code must define: def evaluate(counts, shots, **kwargs) -> float
    Returns a score between 0.0 and 1.0.
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
            'str': str, 'bool': bool, 'type': type,
        },
        'math': math,
        'pi': math.pi,
        'sqrt': math.sqrt,
        'log': math.log,
        'log2': math.log2,
    }

    # Execute the evaluate_code to define the evaluate function
    exec(evaluate_code, namespace)

    if 'evaluate' not in namespace or not callable(namespace['evaluate']):
        raise ValueError("evaluate_code must define a callable 'evaluate' function")

    score = namespace['evaluate'](counts, shots, **kwargs)
    return max(0.0, min(1.0, float(score)))


# ============ Noisy Simulator ============

def simulate_challenge_noisy(
    challenge: Challenge,
    student_circuit_code: str,
    shots: int = 1024,
    single_qubit_error: float = 0.01,
    two_qubit_error: float = 0.02,
) -> dict:
    """
    Run student circuit on AerSimulator with noise, then evaluate with challenge's evaluate_code.
    """
    import time
    from .code_validator import execute_circuit_code

    try:
        from qiskit_aer import AerSimulator
    except ImportError:
        from qiskit.providers.aer import AerSimulator

    from qiskit_aer.noise import NoiseModel, depolarizing_error
    from qiskit import transpile

    start_time = time.time()

    # Build noise model
    noise_model = NoiseModel()
    error_1q = depolarizing_error(single_qubit_error, 1)
    error_2q = depolarizing_error(two_qubit_error, 2)
    noise_model.add_all_qubit_quantum_error(error_1q, [
        'u1', 'u2', 'u3', 'rx', 'ry', 'rz', 'x', 'y', 'z',
        'h', 's', 't', 'sdg', 'tdg', 'id', 'sx', 'sxdg',
    ])
    noise_model.add_all_qubit_quantum_error(error_2q, ['cx', 'cz', 'swap', 'ecr'])
    simulator = AerSimulator(noise_model=noise_model)

    # Parse student circuit
    circuit, post_select, initial_layout, err = execute_circuit_code(student_circuit_code)
    if circuit is None:
        return {"success": False, "error": f"Circuit error: {err}"}

    qubit_count = circuit.num_qubits
    gate_count = sum(1 for _ in circuit)
    circuit_depth = circuit.depth()

    # Ensure circuit has measurements
    from qiskit.circuit import Measure
    has_measure = any(isinstance(inst.operation, Measure) for inst in circuit)
    if not has_measure:
        circuit.measure_all()

    # Transpile and run
    transpiled = transpile(circuit, simulator)
    job = simulator.run(transpiled, shots=shots)
    counts = job.result().get_counts()

    # Run custom evaluation
    try:
        score = execute_evaluate_code(challenge.evaluate_code, counts, shots)
    except Exception as e:
        return {"success": False, "error": f"Evaluation error: {str(e)}"}

    elapsed_ms = (time.time() - start_time) * 1000

    return {
        "success": True,
        "score": score,
        "measurements": counts,
        "qubit_count": qubit_count,
        "gate_count": gate_count,
        "circuit_depth": circuit_depth,
        "execution_time_ms": elapsed_ms,
        "backend": "noisy_simulator",
    }


# ============ Challenge CRUD ============

def create_challenge(
    db: Session,
    title: str,
    ibmq_api_key: str,
    allowed_backends: list,
    evaluate_code: str,
    created_by: str,
    description: str = None,
    difficulty: str = "medium",
    category: str = None,
    tags: list = None,
    total_budget_seconds: int = 21600,
    num_participants: int = 50,
    max_concurrent_jobs: int = 3,
    deadline: datetime = None,
    reference_circuit: str = None,
    starter_code: str = None,
) -> Challenge:
    """Create a new challenge with encrypted API key and random token secret."""
    token_secret = os.urandom(32).hex()
    encrypted_key = encrypt_api_key(ibmq_api_key)
    per_participant = total_budget_seconds // num_participants

    challenge = Challenge(
        title=title,
        description=description,
        difficulty=difficulty,
        category=category,
        tags=json.dumps(tags) if tags else None,
        ibmq_api_key_encrypted=encrypted_key,
        ibmq_channel="ibm_cloud",
        allowed_backends=json.dumps(allowed_backends),
        total_budget_seconds=total_budget_seconds,
        num_participants=num_participants,
        per_participant_budget_seconds=per_participant,
        max_concurrent_jobs=max_concurrent_jobs,
        token_secret=token_secret,
        evaluate_code=evaluate_code,
        is_active=True,
        created_by=created_by,
        deadline=deadline,
        reference_circuit=reference_circuit,
        starter_code=starter_code,
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge


def generate_tokens_for_challenge(
    db: Session, challenge: Challenge, participant_entries: list
) -> list:
    """
    Generate tokens for a list of participant entries.
    Accepts list of (uid, display_name) tuples.
    Returns list of dicts: [{"participant_uid": "...", "display_name": "...", "token": "..."}]
    """
    results = []
    for entry in participant_entries:
        if isinstance(entry, (list, tuple)):
            uid, display_name = entry[0], entry[1] if len(entry) > 1 else None
        else:
            uid, display_name = entry, None

        uid = uid.strip()
        if not uid:
            continue

        uid_hash = hash_participant_uid(uid)
        token = generate_participant_token(challenge.token_secret, uid)
        token_h = hash_token(token)

        existing = (
            db.query(ChallengeToken)
            .filter(
                ChallengeToken.challenge_id == challenge.id,
                ChallengeToken.participant_uid == uid_hash,
            )
            .first()
        )

        encrypted_token = encrypt_api_key(token)
        encrypted_uid = encrypt_api_key(uid)

        if not existing:
            token_record = ChallengeToken(
                challenge_id=challenge.id,
                participant_uid=uid_hash,
                token_hash=token_h,
                token_encrypted=encrypted_token,
                participant_uid_encrypted=encrypted_uid,
                budget_limit_seconds=challenge.per_participant_budget_seconds,
                is_active=True,
                display_name=display_name.strip()[:60] if display_name else None,
            )
            db.add(token_record)
        else:
            if not existing.token_encrypted:
                existing.token_encrypted = encrypted_token
            if not existing.participant_uid_encrypted:
                existing.participant_uid_encrypted = encrypted_uid
            if display_name and not existing.display_name:
                existing.display_name = display_name.strip()[:60]

        results.append({
            "participant_uid": uid,
            "display_name": display_name,
            "token": token,
        })

    db.commit()
    return results


def get_challenge(db: Session, challenge_id: str) -> Optional[Challenge]:
    """Get challenge by ID."""
    return db.query(Challenge).filter(Challenge.id == challenge_id).first()

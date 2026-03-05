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

    Works for any N-qubit circuit: extracts the rightmost 2 bits (q0, q1)
    from each bitstring (Qiskit little-endian convention).
    """
    if total_shots <= 0:
        return 0.0
    bell_counts = 0
    for bitstring, count in counts.items():
        output = bitstring.replace(" ", "")[-2:]  # q0, q1 (rightmost 2 bits)
        if output in ("00", "11"):
            bell_counts += count
    return bell_counts / total_shots


def compute_bell_fidelity_postselected(counts: dict, total_shots: int) -> Tuple[float, int]:
    """
    Compute Bell pair fidelity with post-selection on ancilla qubits.
    For distillation protocols (e.g., BBPSSW):
    - Output: q0, q1 (rightmost 2 bits)
    - Ancilla: q2, q3, ... (remaining bits)
    - Post-selection: keep shots where ancilla pairs agree (q2==q3, q4==q5, ...)
    Returns (fidelity, post_selected_shot_count).
    """
    bell_counts = 0
    post_total = 0
    for bitstring, count in counts.items():
        bits = bitstring.replace(" ", "")
        if len(bits) <= 2:
            # 2-qubit circuit: no ancilla, no post-selection
            post_total += count
            if bits[-2:] in ("00", "11"):
                bell_counts += count
            continue
        output = bits[-2:]       # q0, q1
        ancilla = bits[:-2]      # q2, q3, ... (leftmost bits)
        # Post-selection: ancilla pairs must agree
        keep = True
        for i in range(0, len(ancilla) - 1, 2):
            if ancilla[i] != ancilla[i + 1]:
                keep = False
                break
        if keep:
            post_total += count
            if output in ("00", "11"):
                bell_counts += count
    if post_total <= 0:
        return 0.0, 0
    return bell_counts / post_total, post_total


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


# ============ Noisy Simulator ============

def _apply_post_selection(counts: dict, post_select: Optional[set]) -> Tuple[float, int, int]:
    """
    Apply post-selection to measurement counts and compute Bell fidelity.

    Args:
        counts: measurement outcome counts (bitstring -> count)
        post_select: set of ancilla bitstrings to keep, or None for no filtering

    Returns:
        (fidelity, post_selected_shots, total_shots)
    """
    bell_counts = 0
    post_total = 0
    total = sum(counts.values())

    for bitstring, count in counts.items():
        bits = bitstring.replace(" ", "")
        output = bits[-2:]  # q0, q1 (rightmost 2 bits)
        ancilla = bits[:-2]  # everything else

        # Apply post-selection if defined
        if post_select is not None and ancilla:
            if ancilla not in post_select:
                continue

        post_total += count
        if output in ("00", "11"):
            bell_counts += count

    if post_total <= 0:
        return 0.0, 0, total
    return bell_counts / post_total, post_total, total


# ============ Evaluation Methods ============

def _strip_classical_bits(circuit):
    """
    Rebuild circuit with only quantum registers, removing any leftover
    classical bits (e.g. from QuantumCircuit(n, m)). This ensures
    measure_all() produces clean bitstrings with exactly num_qubits bits.
    """
    from qiskit import QuantumCircuit
    fresh = QuantumCircuit(circuit.num_qubits)
    # Build index mapping: original qubit object -> integer index
    qubit_map = {q: i for i, q in enumerate(circuit.qubits)}
    for inst in circuit.data:
        if inst.operation.name not in ('measure', 'barrier'):
            qubit_indices = [qubit_map[q] for q in inst.qubits]
            fresh.append(inst.operation, qubit_indices)
    return fresh


def prepare_inverse_bell_circuit(circuit):
    """
    Append inverse Bell verification to a circuit.
    Maps |Phi+> -> |00>, |Phi-> -> |10>, |Psi+> -> |01>, |Psi-> -> |11>.
    Then F(Phi+) = P(00 on output qubits).

    A barrier is inserted between the student circuit and the verification
    gates so the transpiler cannot algebraically cancel them (which would
    erase the noise those gates should introduce in simulation).
    """
    clean = _strip_classical_bits(circuit.remove_final_measurements(inplace=False))
    clean.barrier()
    clean.cx(0, 1)
    clean.h(0)
    clean.measure_all()
    return clean


def prepare_tomography_circuits(circuit):
    """
    Create 3 circuit variants for Pauli correlator tomography on q0, q1.
    Ancilla qubits are always measured in the computational basis.
    Returns {"ZZ": circuit, "XX": circuit, "YY": circuit}.

    A barrier separates the student circuit from the measurement-basis
    rotation gates so the transpiler cannot cancel them algebraically.
    """
    clean = _strip_classical_bits(circuit.remove_final_measurements(inplace=False))
    clean.barrier()

    # ZZ basis: measure in computational basis
    zz = clean.copy()
    zz.measure_all()

    # XX basis: H on output qubits before measurement
    xx = clean.copy()
    xx.h(0)
    xx.h(1)
    xx.measure_all()

    # YY basis: Sdg+H on output qubits before measurement
    yy = clean.copy()
    yy.sdg(0)
    yy.h(0)
    yy.sdg(1)
    yy.h(1)
    yy.measure_all()

    return {"ZZ": zz, "XX": xx, "YY": yy}


def compute_fidelity_inverse_bell(counts: dict, post_select: Optional[set] = None) -> Tuple[float, int, int]:
    """
    Compute F(Phi+) = P(00 on output qubits) after inverse Bell transform and post-selection.
    Returns (fidelity, post_selected_shots, total_shots).
    """
    target_count = 0
    post_total = 0
    total = sum(counts.values())

    for bitstring, count in counts.items():
        bits = bitstring.replace(" ", "")
        output = bits[-2:]   # q0, q1
        ancilla = bits[:-2]

        if post_select is not None and ancilla:
            if ancilla not in post_select:
                continue

        post_total += count
        if output == "00":
            target_count += count

    if post_total <= 0:
        return 0.0, 0, total
    return target_count / post_total, post_total, total


def compute_pauli_correlator(counts: dict, post_select: Optional[set] = None) -> Tuple[float, int]:
    """
    Compute <PQ> correlator = (N_same_parity - N_diff_parity) / N_postselected.
    Same parity: output q0q1 in {00, 11}. Different: {01, 10}.
    Returns (correlator_value, post_selected_shots).
    """
    same_parity = 0
    diff_parity = 0

    for bitstring, count in counts.items():
        bits = bitstring.replace(" ", "")
        output = bits[-2:]
        ancilla = bits[:-2]

        if post_select is not None and ancilla:
            if ancilla not in post_select:
                continue

        if output in ("00", "11"):
            same_parity += count
        else:
            diff_parity += count

    post_total = same_parity + diff_parity
    if post_total <= 0:
        return 0.0, 0
    return (same_parity - diff_parity) / post_total, post_total


def compute_fidelity_tomography(
    counts_zz: dict, counts_xx: dict, counts_yy: dict,
    post_select: Optional[set] = None,
) -> Tuple[float, dict, int]:
    """
    F(Phi+) = (1 + <XX> - <YY> + <ZZ>) / 4
    Returns (fidelity, {"XX": val, "YY": val, "ZZ": val}, min_post_selected_shots).
    """
    zz, ps_zz = compute_pauli_correlator(counts_zz, post_select)
    xx, ps_xx = compute_pauli_correlator(counts_xx, post_select)
    yy, ps_yy = compute_pauli_correlator(counts_yy, post_select)

    fidelity = (1.0 + xx - yy + zz) / 4.0
    fidelity = max(0.0, min(1.0, fidelity))

    correlators = {"XX": round(xx, 6), "YY": round(yy, 6), "ZZ": round(zz, 6)}
    min_ps = min(ps_zz, ps_xx, ps_yy)

    return fidelity, correlators, min_ps


def _run_noisy_simulation(circuit, simulator, shots):
    """Transpile and run a circuit on a noisy simulator, return counts."""
    from qiskit import transpile
    transpiled = transpile(circuit, simulator)
    job = simulator.run(transpiled, shots=shots)
    counts = job.result().get_counts()
    return counts


def simulate_homework_noisy(
    reference_circuit_code: Optional[str],
    student_circuit_code: str,
    shots: int = 1024,
    judge_code: Optional[str] = None,
    mode: str = "distillation",
    single_qubit_error: float = 0.01,
    two_qubit_error: float = 0.02,
    eval_method: str = "inverse_bell",
) -> dict:
    """
    Run student circuit (and optionally reference) on AerSimulator with depolarization noise.

    Modes:
      - "distillation": runs both reference + student circuits
      - "bell_pair": runs only student circuit, no reference

    Eval methods (for distillation):
      - "inverse_bell": append CNOT+H to output qubits, F = P(00)
      - "tomography": measure in XX, YY, ZZ bases, F = (1+<XX>-<YY>+<ZZ>)/4
    """
    import time
    from .code_validator import execute_circuit_code

    try:
        from qiskit_aer import AerSimulator
    except ImportError:
        from qiskit.providers.aer import AerSimulator

    from qiskit_aer.noise import NoiseModel, depolarizing_error

    start_time = time.time()

    # Build depolarization noise model
    noise_model = NoiseModel()
    error_1q = depolarizing_error(single_qubit_error, 1)
    error_2q = depolarizing_error(two_qubit_error, 2)
    noise_model.add_all_qubit_quantum_error(error_1q, [
        'u1', 'u2', 'u3', 'rx', 'ry', 'rz', 'x', 'y', 'z',
        'h', 's', 't', 'sdg', 'tdg', 'id', 'sx', 'sxdg',
    ])
    noise_model.add_all_qubit_quantum_error(error_2q, ['cx', 'cz', 'swap', 'ecr'])
    simulator = AerSimulator(noise_model=noise_model)

    # Parse student circuit (always needed)
    circuit_after, post_select, _, err = execute_circuit_code(student_circuit_code)
    if circuit_after is None:
        return {"success": False, "error": f"Student circuit error: {err}"}

    # Record circuit stats (from original circuit, before eval transforms)
    qubit_count = circuit_after.num_qubits
    gate_count = sum(1 for _ in circuit_after)
    circuit_depth = circuit_after.depth()

    # Ensure student circuit has measurements (needed for remove_final_measurements)
    from qiskit.circuit import Measure
    has_measure = any(isinstance(inst.operation, Measure) for inst in circuit_after)
    if not has_measure:
        circuit_after.measure_all()

    if mode == "bell_pair":
        # Simple Bell pair test: use inverse_bell to get correct fidelity
        ib_circuit = prepare_inverse_bell_circuit(circuit_after)
        counts = _run_noisy_simulation(ib_circuit, simulator, shots)
        fidelity, _, _ = compute_fidelity_inverse_bell(counts, post_select=None)
        elapsed_ms = (time.time() - start_time) * 1000
        return {
            "success": True,
            "fidelity_before": None,
            "fidelity_after": fidelity,
            "fidelity_improvement": None,
            "score": None,
            "measurements_before": None,
            "measurements_after": counts,
            "qubit_count": qubit_count,
            "gate_count": gate_count,
            "circuit_depth": circuit_depth,
            "execution_time_ms": elapsed_ms,
            "success_probability": None,
            "post_selected_shots": None,
            "eval_method": "inverse_bell",
            "tomography_correlators": None,
            "backend": "noisy_simulator",
        }

    # === Distillation mode ===

    has_reference = bool(reference_circuit_code and reference_circuit_code.strip())

    circuit_before = None
    if has_reference:
        circuit_before, _, _, err = execute_circuit_code(reference_circuit_code)
        if circuit_before is None:
            return {"success": False, "error": f"Reference circuit error: {err}"}
        has_measure_before = any(isinstance(inst.operation, Measure) for inst in circuit_before)
        if not has_measure_before:
            circuit_before.measure_all()

    tomography_correlators = None
    fidelity_before = 0.0
    counts_before_display = None

    if eval_method == "tomography":
        tomo_after = prepare_tomography_circuits(circuit_after)
        counts_after_zz = _run_noisy_simulation(tomo_after["ZZ"], simulator, shots)
        counts_after_xx = _run_noisy_simulation(tomo_after["XX"], simulator, shots)
        counts_after_yy = _run_noisy_simulation(tomo_after["YY"], simulator, shots)

        if has_reference:
            tomo_before = prepare_tomography_circuits(circuit_before)
            counts_before_zz = _run_noisy_simulation(tomo_before["ZZ"], simulator, shots)
            counts_before_xx = _run_noisy_simulation(tomo_before["XX"], simulator, shots)
            counts_before_yy = _run_noisy_simulation(tomo_before["YY"], simulator, shots)
            fidelity_before, _, _ = compute_fidelity_tomography(
                counts_before_zz, counts_before_xx, counts_before_yy, post_select=None
            )
            counts_before_display = counts_before_zz

        fidelity_after, tomography_correlators, post_selected_shots = compute_fidelity_tomography(
            counts_after_zz, counts_after_xx, counts_after_yy, post_select
        )
        counts_after_display = counts_after_zz
        total_after = sum(counts_after_zz.values())

    else:
        ib_after = prepare_inverse_bell_circuit(circuit_after)
        counts_after_display = _run_noisy_simulation(ib_after, simulator, shots)
        total_after = sum(counts_after_display.values())

        if has_reference:
            ib_before = prepare_inverse_bell_circuit(circuit_before)
            counts_before_display = _run_noisy_simulation(ib_before, simulator, shots)
            fidelity_before, _, _ = compute_fidelity_inverse_bell(
                counts_before_display, post_select=None
            )

        fidelity_after, post_selected_shots, _ = compute_fidelity_inverse_bell(
            counts_after_display, post_select
        )

    score = compute_homework_score(fidelity_before, fidelity_after)
    success_probability = post_selected_shots / total_after if total_after > 0 else 0.0
    elapsed_ms = (time.time() - start_time) * 1000

    return {
        "success": True,
        "fidelity_before": fidelity_before,
        "fidelity_after": fidelity_after,
        "fidelity_improvement": fidelity_after - fidelity_before,
        "score": score,
        "measurements_before": counts_before_display,
        "measurements_after": counts_after_display,
        "qubit_count": qubit_count,
        "gate_count": gate_count,
        "circuit_depth": circuit_depth,
        "execution_time_ms": elapsed_ms,
        "success_probability": success_probability,
        "post_selected_shots": post_selected_shots,
        "eval_method": eval_method,
        "tomography_correlators": tomography_correlators,
        "backend": "noisy_simulator",
    }


def simulate_fake_hardware(
    student_circuit_code: str,
    shots: int = 1024,
    eval_method: str = "inverse_bell",
    single_qubit_error: float = 0.01,
    two_qubit_error: float = 0.02,
) -> dict:
    """
    Run student circuit on a fake 4x4 grid hardware (16 qubits) with noisy simulation.
    The circuit is transpiled to the grid topology before simulation.
    Students can specify INITIAL_LAYOUT in their code for qubit placement.
    """
    import time
    from .code_validator import execute_circuit_code

    try:
        from qiskit_aer import AerSimulator
    except ImportError:
        from qiskit.providers.aer import AerSimulator

    from qiskit_aer.noise import NoiseModel, depolarizing_error
    from qiskit import transpile
    from qiskit.transpiler import CouplingMap

    start_time = time.time()

    # Build 4x4 grid coupling map (16 qubits)
    grid_edges = []
    for row in range(4):
        for col in range(4):
            qubit = row * 4 + col
            if col < 3:  # horizontal neighbor
                grid_edges.append((qubit, qubit + 1))
            if row < 3:  # vertical neighbor
                grid_edges.append((qubit, qubit + 4))
    coupling_map = CouplingMap(grid_edges)

    # Build depolarization noise model
    noise_model = NoiseModel()
    error_1q = depolarizing_error(single_qubit_error, 1)
    error_2q = depolarizing_error(two_qubit_error, 2)
    noise_model.add_all_qubit_quantum_error(error_1q, [
        'u1', 'u2', 'u3', 'rx', 'ry', 'rz', 'x', 'y', 'z',
        'h', 's', 't', 'sdg', 'tdg', 'id', 'sx', 'sxdg',
    ])
    noise_model.add_all_qubit_quantum_error(error_2q, ['cx', 'cz', 'swap', 'ecr'])

    simulator = AerSimulator(
        noise_model=noise_model,
        coupling_map=coupling_map,
    )

    # Parse student circuit
    circuit, post_select, initial_layout, err = execute_circuit_code(student_circuit_code)
    if circuit is None:
        return {"success": False, "error": f"Circuit error: {err}"}

    # Record circuit stats before transpilation
    qubit_count = circuit.num_qubits
    gate_count = sum(1 for _ in circuit)
    circuit_depth = circuit.depth()

    if qubit_count > 16:
        return {"success": False, "error": f"Circuit uses {qubit_count} qubits but fake hardware only has 16"}

    # Transpile to 4x4 grid topology with NO optimization.
    # Level 0: only routing/mapping, preserves every student gate as-is.
    # Pass coupling_map explicitly — AerSimulator may not expose it to the transpiler.
    transpile_kwargs = {
        "coupling_map": coupling_map,
        "optimization_level": 0,
    }
    if initial_layout:
        transpile_kwargs["initial_layout"] = initial_layout

    tomography_correlators = None

    if eval_method == "tomography":
        tomo_circuits = prepare_tomography_circuits(circuit)
        counts_zz = _run_fake_hw_simulation(tomo_circuits["ZZ"], simulator, shots, transpile_kwargs)
        counts_xx = _run_fake_hw_simulation(tomo_circuits["XX"], simulator, shots, transpile_kwargs)
        counts_yy = _run_fake_hw_simulation(tomo_circuits["YY"], simulator, shots, transpile_kwargs)

        fidelity_after, tomography_correlators, post_selected_shots = compute_fidelity_tomography(
            counts_zz, counts_xx, counts_yy, post_select
        )
        counts_display = counts_zz
        total_shots = sum(counts_zz.values())
    else:
        ib_circuit = prepare_inverse_bell_circuit(circuit)
        counts_display = _run_fake_hw_simulation(ib_circuit, simulator, shots, transpile_kwargs)
        total_shots = sum(counts_display.values())
        fidelity_after, post_selected_shots, _ = compute_fidelity_inverse_bell(
            counts_display, post_select
        )

    success_probability = post_selected_shots / total_shots if total_shots > 0 else 0.0
    elapsed_ms = (time.time() - start_time) * 1000

    return {
        "success": True,
        "fidelity_after": fidelity_after,
        "measurements": counts_display,
        "qubit_count": qubit_count,
        "gate_count": gate_count,
        "circuit_depth": circuit_depth,
        "execution_time_ms": elapsed_ms,
        "success_probability": success_probability,
        "post_selected_shots": post_selected_shots,
        "eval_method": eval_method,
        "tomography_correlators": tomography_correlators,
        "initial_layout": initial_layout,
        "backend": "fake_4x4",
    }


def _run_fake_hw_simulation(circuit, simulator, shots, transpile_kwargs):
    """Transpile to fake hardware topology and run noisy simulation."""
    import logging
    logger = logging.getLogger(__name__)
    from qiskit import transpile

    # Adjust initial_layout to match the (possibly rebuilt) circuit's qubit count
    kwargs = dict(transpile_kwargs)
    layout = kwargs.get("initial_layout")
    if layout and len(layout) != circuit.num_qubits:
        # Layout was for original student circuit but the eval circuit may
        # have a different qubit count after _strip_classical_bits rebuild.
        # Truncate or skip layout if it doesn't match.
        if len(layout) > circuit.num_qubits:
            kwargs["initial_layout"] = layout[:circuit.num_qubits]
        else:
            # Layout has fewer entries than circuit qubits — can't map, skip it
            logger.warning(
                f"[FakeHW] Skipping initial_layout: layout len={len(layout)} != circuit qubits={circuit.num_qubits}"
            )
            kwargs.pop("initial_layout", None)

    logger.info(
        f"[FakeHW] PRE-TRANSPILE: initial_layout={kwargs.get('initial_layout')}, "
        f"circuit_qubits={circuit.num_qubits}, circuit_depth={circuit.depth()}"
    )
    try:
        transpiled = transpile(circuit, **kwargs)
    except Exception as e:
        logger.error(f"[FakeHW] Transpile failed: {e}, falling back without initial_layout")
        kwargs.pop("initial_layout", None)
        transpiled = transpile(circuit, **kwargs)
    logger.info(
        f"[FakeHW] POST-TRANSPILE: transpiled_depth={transpiled.depth()}, "
        f"transpiled_gates={len(transpiled.data)}, transpiled_qubits={transpiled.num_qubits}"
    )
    job = simulator.run(transpiled, shots=shots)
    return job.result().get_counts()


# ============ Homework CRUD ============

def create_homework(
    db: Session,
    title: str,
    ibmq_api_key: str,
    allowed_backends: list,
    created_by: str,
    description: str = None,
    course: str = "CS 238B",
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
        ibmq_channel="ibm_cloud",
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
    db: Session, homework: Homework, student_entries: list
) -> list:
    """
    Generate tokens for a list of student entries.
    Accepts list of (uid, display_name) tuples.
    Returns list of dicts: [{"student_uid": "...", "display_name": "...", "token": "..."}]
    The raw tokens are only returned once — they are never stored.
    """
    results = []
    for entry in student_entries:
        if isinstance(entry, (list, tuple)):
            uid, display_name = entry[0], entry[1] if len(entry) > 1 else None
        else:
            uid, display_name = entry, None

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

        encrypted_token = encrypt_api_key(token)
        encrypted_uid = encrypt_api_key(uid)

        if not existing:
            token_record = HomeworkToken(
                homework_id=homework.id,
                student_uid=uid_hash,
                token_hash=token_h,
                token_encrypted=encrypted_token,
                student_uid_encrypted=encrypted_uid,
                budget_limit_seconds=homework.per_student_budget_seconds,
                is_active=True,
                display_name=display_name.strip()[:60] if display_name else None,
            )
            db.add(token_record)
        else:
            # Backfill encrypted fields if missing
            if not existing.token_encrypted:
                existing.token_encrypted = encrypted_token
            if not existing.student_uid_encrypted:
                existing.student_uid_encrypted = encrypted_uid
            if display_name and not existing.display_name:
                existing.display_name = display_name.strip()[:60]

        results.append({
            "student_uid": uid,
            "display_name": display_name,
            "token": token,
        })

    db.commit()
    return results


def get_homework(db: Session, homework_id: str) -> Optional[Homework]:
    """Get homework by ID or problem_id slug."""
    hw = db.query(Homework).filter(Homework.id == homework_id).first()
    if not hw:
        hw = db.query(Homework).filter(Homework.problem_id == homework_id).first()
    return hw


def get_student_label(token_record: HomeworkToken) -> str:
    """Get anonymized student label (first 6 chars of UID hash)."""
    return token_record.student_uid[:6]

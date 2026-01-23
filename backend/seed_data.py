"""
Seed the database with initial examples and problems from the frontend static data.
Run this script after setting up the database to populate it with the existing content.
"""
import json
from datetime import datetime
from app.database import SessionLocal, engine, Base
from app.models import Category, Problem, Example

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)


# ============ EXAMPLE CATEGORIES AND EXAMPLES ============

EXAMPLE_CATEGORIES = [
    {
        "id": "grover",
        "name": "Grover's Algorithm",
        "description": "Quantum search algorithm providing quadratic speedup for unstructured search problems",
        "icon": "🔍",
        "color": "blue",
        "order": 1,
    },
    {
        "id": "shor",
        "name": "Shor's Algorithm",
        "description": "Quantum algorithm for integer factorization with exponential speedup",
        "icon": "🔐",
        "color": "purple",
        "order": 2,
    },
    {
        "id": "hhl",
        "name": "HHL Algorithm",
        "description": "Quantum algorithm for solving linear systems of equations",
        "icon": "📊",
        "color": "green",
        "order": 3,
    },
    {
        "id": "hamiltonian",
        "name": "Hamiltonian Simulation",
        "description": "Simulate quantum systems and their time evolution",
        "icon": "⚛️",
        "color": "amber",
        "order": 4,
    },
]

EXAMPLES = [
    # Grover's Algorithm examples
    {
        "id": "grover-2qubit",
        "title": "2-Qubit Search",
        "description": "Search for |11⟩ state in a 2-qubit system",
        "category": "grover",
        "difficulty": "Beginner",
        "code": '''# Grover's Algorithm - 2 Qubit Search for |11⟩
# This circuit searches for the state |11⟩ among 4 possible states

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

# Create circuit with 2 qubits and 2 classical bits
qc = QuantumCircuit(2, 2)

# Initialize superposition
qc.h([0, 1])

# Oracle: Mark |11⟩ state (CZ gate)
qc.cz(0, 1)

# Diffusion operator
qc.h([0, 1])
qc.z([0, 1])
qc.cz(0, 1)
qc.h([0, 1])

# Measure
qc.measure([0, 1], [0, 1])

print("Grover's Search Circuit (2 qubits):")
print(qc.draw())

# Simulate
simulator = AerSimulator()
result = simulator.run(transpile(qc, simulator), shots=1000).result()
counts = result.get_counts()

print("\\nResults (should favor |11⟩):")
print(counts)
''',
        "explanation": "This example demonstrates Grover's algorithm on a 2-qubit system searching for the |11⟩ state. The algorithm uses an oracle to mark the target state and a diffusion operator to amplify its amplitude.",
        "author": "QCloud Team",
        "tags": ["grover", "search", "beginner"],
        "order": 1,
    },
    {
        "id": "grover-3qubit",
        "title": "3-Qubit Search",
        "description": "Search for |101⟩ state in a 3-qubit system",
        "category": "grover",
        "difficulty": "Intermediate",
        "code": '''# Grover's Algorithm - 3 Qubit Search for |101⟩
# Searching among 8 possible states

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

qc = QuantumCircuit(3, 3)

# Initialize superposition
qc.h([0, 1, 2])

# Number of Grover iterations (optimal for 3 qubits searching 1 item)
num_iterations = 2

for _ in range(num_iterations):
    # Oracle for |101⟩
    qc.x(1)  # Flip qubit 1
    qc.ccz(0, 1, 2)  # Multi-controlled Z
    qc.x(1)  # Flip back

    # Diffusion operator
    qc.h([0, 1, 2])
    qc.x([0, 1, 2])
    qc.ccz(0, 1, 2)
    qc.x([0, 1, 2])
    qc.h([0, 1, 2])

# Measure
qc.measure([0, 1, 2], [0, 1, 2])

print("Grover's Search Circuit (3 qubits, target |101⟩):")
print(qc.draw())

# Simulate
simulator = AerSimulator()
result = simulator.run(transpile(qc, simulator), shots=1000).result()
counts = result.get_counts()

print("\\nResults (should favor |101⟩):")
print(counts)
''',
        "explanation": "Extended Grover's algorithm for 3 qubits. With 8 possible states, we need approximately 2 iterations to maximize the probability of finding the marked state.",
        "author": "QCloud Team",
        "tags": ["grover", "search", "intermediate"],
        "order": 2,
    },
    {
        "id": "grover-multi-target",
        "title": "Multi-Target Search",
        "description": "Search for multiple marked states simultaneously",
        "category": "grover",
        "difficulty": "Advanced",
        "code": '''# Grover's Algorithm - Multi-Target Search
# Search for both |01⟩ and |10⟩ states

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import numpy as np

qc = QuantumCircuit(2, 2)

# Initialize superposition
qc.h([0, 1])

# Oracle marking both |01⟩ and |10⟩
# This is equivalent to a controlled-Z with controls swapped
qc.x(0)
qc.cz(0, 1)
qc.x(0)
qc.x(1)
qc.cz(0, 1)
qc.x(1)

# Diffusion operator
qc.h([0, 1])
qc.z([0, 1])
qc.cz(0, 1)
qc.h([0, 1])

# Measure
qc.measure([0, 1], [0, 1])

print("Multi-Target Grover's Search:")
print(qc.draw())

# Simulate
simulator = AerSimulator()
result = simulator.run(transpile(qc, simulator), shots=1000).result()
counts = result.get_counts()

print("\\nResults (should favor |01⟩ and |10⟩):")
print(counts)
''',
        "explanation": "When searching for multiple targets, the oracle marks all target states. The number of iterations needed decreases as the number of targets increases.",
        "author": "QCloud Team",
        "tags": ["grover", "search", "multi-target", "advanced"],
        "order": 3,
    },
    # Shor's Algorithm examples
    {
        "id": "shor-period-finding",
        "title": "Period Finding (N=15)",
        "description": "Quantum period finding subroutine for factoring 15",
        "category": "shor",
        "difficulty": "Advanced",
        "code": '''# Shor's Algorithm - Period Finding for N=15
# Demonstrates the quantum part of Shor's algorithm

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import numpy as np

# Simplified period finding for a=7, N=15
# The period r of 7^x mod 15 is 4

def c_amod15(a, power):
    """Controlled multiplication by a mod 15"""
    U = QuantumCircuit(4)
    for _ in range(power):
        if a == 7:
            U.swap(0, 1)
            U.swap(1, 2)
            U.swap(2, 3)
    U = U.to_gate()
    U.name = f"{a}^{power} mod 15"
    return U.control()

# Create circuit
n_count = 3  # Counting qubits
qc = QuantumCircuit(n_count + 4, n_count)

# Initialize counting qubits in superposition
qc.h(range(n_count))

# Initialize auxiliary register to |1⟩
qc.x(n_count)

# Controlled unitary operations
for q in range(n_count):
    qc.append(c_amod15(7, 2**q), [q] + list(range(n_count, n_count + 4)))

# Inverse QFT
qc.swap(0, 2)
qc.h(0)
qc.cp(-np.pi/2, 0, 1)
qc.cp(-np.pi/4, 0, 2)
qc.h(1)
qc.cp(-np.pi/2, 1, 2)
qc.h(2)

# Measure
qc.measure(range(n_count), range(n_count))

print("Shor's Period Finding Circuit (N=15, a=7):")
print(qc.draw())

# Simulate
simulator = AerSimulator()
result = simulator.run(transpile(qc, simulator), shots=1000).result()
counts = result.get_counts()

print("\\nResults (peaks indicate period r=4):")
print(counts)
''',
        "explanation": "The period finding subroutine is the quantum core of Shor's algorithm. It uses quantum Fourier transform to find the period of modular exponentiation.",
        "author": "QCloud Team",
        "tags": ["shor", "factoring", "period-finding", "advanced"],
        "order": 1,
    },
    {
        "id": "shor-qft",
        "title": "Quantum Fourier Transform",
        "description": "QFT circuit - key component of Shor's algorithm",
        "category": "shor",
        "difficulty": "Intermediate",
        "code": '''# Quantum Fourier Transform (QFT)
# Essential subroutine for Shor's algorithm

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import numpy as np

def qft_circuit(n):
    """Create QFT circuit for n qubits"""
    qc = QuantumCircuit(n)

    for i in range(n):
        qc.h(i)
        for j in range(i + 1, n):
            qc.cp(np.pi / 2**(j - i), i, j)

    # Swap qubits for correct ordering
    for i in range(n // 2):
        qc.swap(i, n - i - 1)

    return qc

# Create 4-qubit QFT
n = 4
qft = qft_circuit(n)

# Test circuit: Apply QFT to |5⟩ = |0101⟩
test_circuit = QuantumCircuit(n, n)
test_circuit.x(0)  # Set to |0101⟩
test_circuit.x(2)
test_circuit.barrier()
test_circuit.compose(qft, inplace=True)
test_circuit.measure(range(n), range(n))

print(f"QFT Circuit ({n} qubits):")
print(qft.draw())

print("\\nTest: QFT of |0101⟩:")
print(test_circuit.draw())

# Simulate
simulator = AerSimulator()
result = simulator.run(transpile(test_circuit, simulator), shots=1000).result()
counts = result.get_counts()

print("\\nMeasurement Results:")
print(counts)
''',
        "explanation": "The Quantum Fourier Transform is the quantum analog of the discrete Fourier transform. It's a key building block for many quantum algorithms including Shor's algorithm.",
        "author": "QCloud Team",
        "tags": ["shor", "qft", "fourier", "intermediate"],
        "order": 2,
    },
    {
        "id": "shor-modular-exp",
        "title": "Modular Exponentiation",
        "description": "Quantum modular exponentiation circuit",
        "category": "shor",
        "difficulty": "Advanced",
        "code": '''# Modular Exponentiation for Shor's Algorithm
# Computes a^x mod N in superposition

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

# Simplified modular exponentiation for a=2, N=15
# Demonstrates the concept with a small example

def create_mod_exp_circuit():
    """Create circuit for 2^x mod 15"""
    qc = QuantumCircuit(7, 3)

    # Control qubits (x register) in superposition
    qc.h(0)
    qc.h(1)
    qc.h(2)

    # Work register initialized to |0001⟩ = 1
    qc.x(3)

    # Controlled operations for 2^(2^i) mod 15
    # 2^1 mod 15 = 2
    qc.cswap(0, 3, 4)

    # 2^2 mod 15 = 4
    qc.cswap(1, 3, 5)
    qc.cswap(1, 4, 6)

    # 2^4 mod 15 = 1 (identity, no operation needed)

    # Measure control register
    qc.measure([0, 1, 2], [0, 1, 2])

    return qc

qc = create_mod_exp_circuit()

print("Modular Exponentiation Circuit (2^x mod 15):")
print(qc.draw())

# Simulate
simulator = AerSimulator()
result = simulator.run(transpile(qc, simulator), shots=1000).result()
counts = result.get_counts()

print("\\nMeasurement Results:")
print(counts)
print("\\nThe pattern reveals the period of 2^x mod 15")
''',
        "explanation": "Modular exponentiation computes a^x mod N for all values of x in superposition simultaneously, which is essential for the period finding step of Shor's algorithm.",
        "author": "QCloud Team",
        "tags": ["shor", "modular", "exponentiation", "advanced"],
        "order": 3,
    },
    # HHL Algorithm examples
    {
        "id": "hhl-2x2",
        "title": "2x2 Linear System",
        "description": "Solve a simple 2x2 system Ax=b",
        "category": "hhl",
        "difficulty": "Advanced",
        "code": '''# HHL Algorithm - 2x2 Linear System
# Solves Ax = b for a 2x2 Hermitian matrix

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import numpy as np

# For a 2x2 system, we need:
# - 1 qubit for the solution register
# - 2 qubits for eigenvalue register (phase estimation)
# - 1 ancilla qubit for controlled rotation

qc = QuantumCircuit(4, 1)

# Prepare |b⟩ state (example: |0⟩ + |1⟩)/√2
qc.h(0)

# Phase estimation would go here
# (Simplified for demonstration)
qc.h(1)
qc.h(2)

# Controlled rotation based on eigenvalues
# This is the key step that inverts the eigenvalues
qc.cry(np.pi/4, 1, 3)
qc.cry(np.pi/8, 2, 3)

# Inverse phase estimation
qc.h(1)
qc.h(2)

# Measure ancilla to post-select successful runs
qc.measure(3, 0)

print("Simplified HHL Circuit (2x2 system):")
print(qc.draw())

# Simulate
simulator = AerSimulator()
result = simulator.run(transpile(qc, simulator), shots=1000).result()
counts = result.get_counts()

print("\\nMeasurement Results:")
print(counts)
print("\\nNote: Full HHL requires post-selection on ancilla = |1⟩")
''',
        "explanation": "The HHL algorithm solves linear systems of equations exponentially faster than classical algorithms for certain problem instances.",
        "author": "QCloud Team",
        "tags": ["hhl", "linear-systems", "advanced"],
        "order": 1,
    },
    {
        "id": "hhl-phase-estimation",
        "title": "Eigenvalue Estimation",
        "description": "Phase estimation component of HHL",
        "category": "hhl",
        "difficulty": "Intermediate",
        "code": '''# Eigenvalue Estimation for HHL
# Estimates eigenvalues of a Hermitian matrix

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import numpy as np

def create_eigenvalue_circuit():
    """Phase estimation for eigenvalue extraction"""
    qc = QuantumCircuit(4, 3)

    # Counting register in superposition
    qc.h(0)
    qc.h(1)
    qc.h(2)

    # Prepare eigenstate in qubit 3
    qc.h(3)

    # Controlled unitary operations
    # U = e^(iAt) for some Hermitian A
    qc.cp(np.pi/4, 0, 3)
    qc.cp(np.pi/2, 1, 3)
    qc.cp(np.pi, 2, 3)

    # Inverse QFT on counting register
    qc.swap(0, 2)
    qc.h(0)
    qc.cp(-np.pi/2, 0, 1)
    qc.cp(-np.pi/4, 0, 2)
    qc.h(1)
    qc.cp(-np.pi/2, 1, 2)
    qc.h(2)

    # Measure counting register
    qc.measure([0, 1, 2], [0, 1, 2])

    return qc

qc = create_eigenvalue_circuit()

print("Eigenvalue Estimation Circuit:")
print(qc.draw())

# Simulate
simulator = AerSimulator()
result = simulator.run(transpile(qc, simulator), shots=1000).result()
counts = result.get_counts()

print("\\nMeasurement Results (eigenvalue estimates):")
print(counts)
''',
        "explanation": "Phase estimation is used in HHL to extract eigenvalues of the matrix A, which are then inverted through controlled rotations.",
        "author": "QCloud Team",
        "tags": ["hhl", "phase-estimation", "eigenvalues", "intermediate"],
        "order": 2,
    },
    {
        "id": "hhl-controlled-rotation",
        "title": "Controlled Rotation",
        "description": "Eigenvalue inversion through controlled rotation",
        "category": "hhl",
        "difficulty": "Intermediate",
        "code": '''# Controlled Rotation for HHL
# Inverts eigenvalues using controlled Y-rotations

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import numpy as np

def controlled_rotation_circuit():
    """Demonstrates eigenvalue inversion via controlled rotation"""
    qc = QuantumCircuit(3, 2)

    # Eigenvalue register (simplified: 2 qubits)
    # Assume eigenvalues are encoded in these qubits
    qc.h(0)
    qc.h(1)

    # Ancilla qubit for rotation
    # Rotation angle θ = arcsin(C/λ) where λ is eigenvalue

    # Controlled rotations based on eigenvalue register
    # If |λ⟩ = |00⟩: small eigenvalue -> large rotation
    # If |λ⟩ = |11⟩: large eigenvalue -> small rotation

    qc.x(0)
    qc.x(1)
    qc.mcry(np.pi/2, [0, 1], 2)  # Large rotation for small λ
    qc.x(0)
    qc.x(1)

    qc.mcry(np.pi/8, [0, 1], 2)  # Small rotation for large λ

    # Measure
    qc.measure([1, 2], [0, 1])

    return qc

qc = controlled_rotation_circuit()

print("Controlled Rotation Circuit (HHL core):")
print(qc.draw())

# Simulate
simulator = AerSimulator()
result = simulator.run(transpile(qc, simulator), shots=1000).result()
counts = result.get_counts()

print("\\nMeasurement Results:")
print(counts)
print("\\nAncilla |1⟩ indicates successful inversion")
''',
        "explanation": "The controlled rotation step inverts the eigenvalues by rotating an ancilla qubit by an angle proportional to C/λ, where C is a constant and λ is the eigenvalue.",
        "author": "QCloud Team",
        "tags": ["hhl", "controlled-rotation", "intermediate"],
        "order": 3,
    },
    # Hamiltonian Simulation examples
    {
        "id": "ham-single-qubit",
        "title": "Single Qubit Evolution",
        "description": "Time evolution under a single-qubit Hamiltonian",
        "category": "hamiltonian",
        "difficulty": "Beginner",
        "code": '''# Single Qubit Hamiltonian Simulation
# Simulates H = σ_z (Pauli-Z Hamiltonian)

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import numpy as np

def simulate_sz(t):
    """Simulate e^(-i*σ_z*t)"""
    qc = QuantumCircuit(1, 1)

    # Prepare superposition state
    qc.h(0)

    # Time evolution: e^(-i*σ_z*t) = Rz(2t)
    qc.rz(2*t, 0)

    # Measure in X basis to see oscillation
    qc.h(0)
    qc.measure(0, 0)

    return qc

# Simulate for different times
simulator = AerSimulator()
times = [0, np.pi/4, np.pi/2, 3*np.pi/4, np.pi]

print("Single Qubit Evolution under H = σ_z")
print("=" * 50)

for t in times:
    qc = simulate_sz(t)
    result = simulator.run(transpile(qc, simulator), shots=1000).result()
    counts = result.get_counts()
    prob_0 = counts.get('0', 0) / 1000
    print(f"t = {t:.4f}: P(|+⟩) = {prob_0:.3f}")

print("\\nCircuit for t = π/2:")
print(simulate_sz(np.pi/2).draw())
''',
        "explanation": "The simplest Hamiltonian simulation - evolution under Pauli-Z. The state oscillates between |+⟩ and |-⟩ as time evolves.",
        "author": "QCloud Team",
        "tags": ["hamiltonian", "simulation", "beginner"],
        "order": 1,
    },
    {
        "id": "ham-ising",
        "title": "Ising Model",
        "description": "Two-qubit Ising interaction simulation",
        "category": "hamiltonian",
        "difficulty": "Intermediate",
        "code": '''# Ising Model Simulation
# H = J*σ_z⊗σ_z + h*(σ_x⊗I + I⊗σ_x)

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import numpy as np

def ising_evolution(J, h, t, steps=1):
    """Trotterized evolution under Ising Hamiltonian"""
    qc = QuantumCircuit(2, 2)

    # Initial state: |00⟩
    dt = t / steps

    for _ in range(steps):
        # ZZ interaction: e^(-i*J*dt*σ_z⊗σ_z)
        qc.cx(0, 1)
        qc.rz(2*J*dt, 1)
        qc.cx(0, 1)

        # Transverse field: e^(-i*h*dt*σ_x) on each qubit
        qc.rx(2*h*dt, 0)
        qc.rx(2*h*dt, 1)

    qc.measure([0, 1], [0, 1])
    return qc

# Parameters
J = 1.0   # Coupling strength
h = 0.5   # Transverse field
t = np.pi/2  # Evolution time
steps = 4    # Trotter steps

qc = ising_evolution(J, h, t, steps)

print("Ising Model Circuit:")
print(f"H = {J}*ZZ + {h}*(XI + IX)")
print(f"Evolution time t = {t:.4f}, Trotter steps = {steps}")
print(qc.draw())

# Simulate
simulator = AerSimulator()
result = simulator.run(transpile(qc, simulator), shots=1000).result()
counts = result.get_counts()

print("\\nMeasurement Results:")
print(counts)
''',
        "explanation": "The Ising model describes interacting spins in a magnetic field. We use Trotterization to decompose the time evolution into small steps.",
        "author": "QCloud Team",
        "tags": ["hamiltonian", "ising", "trotter", "intermediate"],
        "order": 2,
    },
    {
        "id": "ham-heisenberg",
        "title": "Heisenberg Model",
        "description": "XXX Heisenberg spin chain simulation",
        "category": "hamiltonian",
        "difficulty": "Advanced",
        "code": '''# Heisenberg XXX Model Simulation
# H = J*(σ_x⊗σ_x + σ_y⊗σ_y + σ_z⊗σ_z)

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import numpy as np

def heisenberg_evolution(J, t, steps=2):
    """Trotterized evolution under Heisenberg XXX Hamiltonian"""
    qc = QuantumCircuit(2, 2)

    # Start with |01⟩ to see spin exchange
    qc.x(1)
    qc.barrier()

    dt = t / steps

    for _ in range(steps):
        # XX interaction
        qc.h(0)
        qc.h(1)
        qc.cx(0, 1)
        qc.rz(2*J*dt, 1)
        qc.cx(0, 1)
        qc.h(0)
        qc.h(1)

        # YY interaction
        qc.sdg(0)
        qc.sdg(1)
        qc.h(0)
        qc.h(1)
        qc.cx(0, 1)
        qc.rz(2*J*dt, 1)
        qc.cx(0, 1)
        qc.h(0)
        qc.h(1)
        qc.s(0)
        qc.s(1)

        # ZZ interaction
        qc.cx(0, 1)
        qc.rz(2*J*dt, 1)
        qc.cx(0, 1)

    qc.measure([0, 1], [0, 1])
    return qc

# Parameters
J = 1.0
simulator = AerSimulator()

print("Heisenberg XXX Model")
print("Initial state: |01⟩ (one spin up, one spin down)")
print("=" * 50)

# Evolve for different times to see spin exchange
for t in [0, np.pi/4, np.pi/2]:
    qc = heisenberg_evolution(J, t, steps=4)
    result = simulator.run(transpile(qc, simulator), shots=1000).result()
    counts = result.get_counts()
    print(f"t = {t:.4f}: {counts}")

print("\\nCircuit for t = π/4:")
print(heisenberg_evolution(J, np.pi/4, steps=2).draw())
''',
        "explanation": "The Heisenberg XXX model has isotropic spin-spin interactions. Starting from |01⟩, we observe spin exchange as time evolves.",
        "author": "QCloud Team",
        "tags": ["hamiltonian", "heisenberg", "spin-chain", "advanced"],
        "order": 3,
    },
    {
        "id": "ham-vqe",
        "title": "VQE Ansatz",
        "description": "Variational ansatz for ground state finding",
        "category": "hamiltonian",
        "difficulty": "Intermediate",
        "code": '''# VQE Ansatz for Hamiltonian Ground State
# Variational circuit for finding ground state energy

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import numpy as np

def vqe_ansatz(params):
    """Hardware-efficient VQE ansatz"""
    qc = QuantumCircuit(2, 2)

    # Layer 1: Single qubit rotations
    qc.ry(params[0], 0)
    qc.ry(params[1], 1)
    qc.rz(params[2], 0)
    qc.rz(params[3], 1)

    # Entangling layer
    qc.cx(0, 1)

    # Layer 2: Single qubit rotations
    qc.ry(params[4], 0)
    qc.ry(params[5], 1)
    qc.rz(params[6], 0)
    qc.rz(params[7], 1)

    return qc

def measure_expectation(qc, observable='ZZ'):
    """Measure expectation value of an observable"""
    qc_measure = qc.copy()

    if observable == 'ZZ':
        qc_measure.measure([0, 1], [0, 1])
    elif observable == 'XX':
        qc_measure.h(0)
        qc_measure.h(1)
        qc_measure.measure([0, 1], [0, 1])
    elif observable == 'YY':
        qc_measure.sdg(0)
        qc_measure.sdg(1)
        qc_measure.h(0)
        qc_measure.h(1)
        qc_measure.measure([0, 1], [0, 1])

    return qc_measure

# Example parameters (would be optimized in real VQE)
params = [np.pi/4, np.pi/3, np.pi/6, np.pi/5,
          np.pi/7, np.pi/8, np.pi/9, np.pi/10]

ansatz = vqe_ansatz(params)
print("VQE Ansatz Circuit:")
print(ansatz.draw())

# Measure in different bases
simulator = AerSimulator()

print("\\nExpectation value measurements:")
for obs in ['ZZ', 'XX', 'YY']:
    qc = measure_expectation(ansatz, obs)
    result = simulator.run(transpile(qc, simulator), shots=1000).result()
    counts = result.get_counts()

    # Calculate expectation
    exp_val = 0
    for bitstring, count in counts.items():
        parity = (-1) ** (int(bitstring[0]) ^ int(bitstring[1]))
        exp_val += parity * count / 1000

    print(f"<{obs}> = {exp_val:.4f}")
''',
        "explanation": "VQE uses a parameterized quantum circuit (ansatz) to prepare trial states. A classical optimizer adjusts parameters to minimize energy.",
        "author": "QCloud Team",
        "tags": ["vqe", "variational", "optimization", "intermediate"],
        "order": 4,
    },
]


# ============ COMPETITION CATEGORIES AND PROBLEMS ============

COMPETITION_CATEGORIES = [
    {
        "id": "grover",
        "name": "Grover's Search",
        "description": "Implement quantum search algorithms to find marked states",
        "icon": "🔍",
        "color": "blue",
        "order": 1,
    },
    {
        "id": "vqe",
        "name": "VQE & Variational",
        "description": "Variational quantum algorithms for optimization",
        "icon": "📊",
        "color": "purple",
        "order": 2,
    },
    {
        "id": "error",
        "name": "Error Correction",
        "description": "Quantum error correction codes and fault tolerance",
        "icon": "🛡️",
        "color": "red",
        "order": 3,
    },
    {
        "id": "optimization",
        "name": "QAOA & Optimization",
        "description": "Quantum approximate optimization algorithms",
        "icon": "⚡",
        "color": "amber",
        "order": 4,
    },
    {
        "id": "shor",
        "name": "Quantum Fourier",
        "description": "Shor's algorithm and quantum phase estimation",
        "icon": "🔢",
        "color": "indigo",
        "order": 5,
    },
]

COMPETITION_PROBLEMS = [
    {
        "id": "grover-2qubit-basic",
        "title": "Find the Marked State",
        "description": """## Problem

Given a 2-qubit system where one of the four basis states is "marked", implement Grover's algorithm to find the marked state with high probability.

## Background

Grover's algorithm provides a quadratic speedup for unstructured search problems. For N items, classical search requires O(N) queries, while Grover's algorithm only needs O(√N) queries.

## Input

Your circuit will be tested with different oracle functions that mark one of the states: |00⟩, |01⟩, |10⟩, or |11⟩.

The oracle applies a phase flip (multiplies by -1) to the marked state.

## Output

Your circuit should measure the marked state with probability ≥ 90%.

## Algorithm Outline

1. Initialize all qubits in superposition using Hadamard gates
2. Apply the Grover iteration:
   - Oracle: Applies phase flip to marked state
   - Diffusion: Reflects about the mean amplitude
3. Measure

For 2 qubits, a single Grover iteration is optimal.

## Diffusion Operator

The diffusion operator can be implemented as:
```
H ⊗ H → X ⊗ X → CZ → X ⊗ X → H ⊗ H
```""",
        "category": "grover",
        "difficulty": "Easy",
        "max_qubits": 3,
        "max_gate_count": 25,
        "max_circuit_depth": 20,
        "min_fidelity": 0.9,
        "target_fidelity": 0.99,
        "fidelity_metric": "probability_overlap",
        "test_cases": [
            {"id": "tc-00", "name": "Find |00⟩", "markedStates": ["00"], "weight": 25, "isHidden": False},
            {"id": "tc-11", "name": "Find |11⟩", "markedStates": ["11"], "weight": 25, "isHidden": False},
            {"id": "tc-01", "name": "Find |01⟩", "markedStates": ["01"], "weight": 25, "isHidden": True},
            {"id": "tc-10", "name": "Find |10⟩", "markedStates": ["10"], "weight": 25, "isHidden": True},
        ],
        "hints": [
            "Start by putting all qubits in equal superposition with H gates",
            "For 2 qubits, only one Grover iteration is needed",
            "The diffusion operator reflects amplitudes about their mean",
            "Remember: Oracle flips phase, Diffusion amplifies marked state"
        ],
        "starter_code": """# Grover's Algorithm - 2 Qubit Search
from qiskit import QuantumCircuit
import numpy as np

def grover_circuit(oracle):
    \"\"\"
    Implement Grover's algorithm to find the marked state.

    Args:
        oracle: A function that takes (qc, qubits) and applies the oracle

    Returns:
        QuantumCircuit: Complete Grover circuit with measurements
    \"\"\"
    qc = QuantumCircuit(2, 2)

    # Step 1: Initialize superposition
    # TODO: Apply H to all qubits

    # Step 2: Grover iteration
    # TODO: Apply oracle
    # oracle(qc, [0, 1])

    # TODO: Apply diffusion operator

    # Step 3: Measure
    qc.measure([0, 1], [0, 1])

    return qc
""",
        "author": "QCloud Team",
        "tags": ["grover", "search", "oracle", "beginner"],
        "max_score": 100,
        "time_bonus": False,
        "order": 1,
    },
    {
        "id": "grover-3qubit-multi",
        "title": "Multi-Target Quantum Search",
        "description": """## Problem

Implement Grover's algorithm for a 3-qubit system with multiple marked states.

## Background

When there are multiple marked states, Grover's algorithm still works but requires a different number of iterations. For k marked states out of N total states, the optimal number of iterations is approximately (π/4)√(N/k).

## Input

Your circuit will be tested with an oracle that marks exactly 2 states out of 8.

## Output

Your circuit should measure one of the marked states with total probability ≥ 85%.

## Challenge

With 2 marked states out of 8, the optimal number of iterations is approximately 1.""",
        "category": "grover",
        "difficulty": "Medium",
        "max_qubits": 4,
        "max_gate_count": 50,
        "max_circuit_depth": 35,
        "min_fidelity": 0.85,
        "target_fidelity": 0.95,
        "fidelity_metric": "probability_overlap",
        "test_cases": [
            {"id": "tc-multi-1", "name": "Find |001⟩ or |110⟩", "markedStates": ["001", "110"], "weight": 50, "isHidden": False},
            {"id": "tc-multi-2", "name": "Find |000⟩ or |111⟩", "markedStates": ["000", "111"], "weight": 50, "isHidden": True},
        ],
        "hints": [
            "For k=2 marked states out of N=8, use approximately 1 iteration",
            "The 3-qubit diffusion operator is similar to 2-qubit but larger",
            "Multi-controlled Z gate can be decomposed using Toffoli and CNOT"
        ],
        "starter_code": """# Grover's Algorithm - 3 Qubit Multi-Target Search
from qiskit import QuantumCircuit
import numpy as np

def grover_multi_target(oracle):
    \"\"\"
    Implement Grover's algorithm for multiple marked states.

    Args:
        oracle: A function that marks multiple target states

    Returns:
        QuantumCircuit: Complete Grover circuit
    \"\"\"
    qc = QuantumCircuit(3, 3)

    # Your implementation here

    qc.measure([0, 1, 2], [0, 1, 2])
    return qc
""",
        "author": "QCloud Team",
        "tags": ["grover", "search", "multi-target", "intermediate"],
        "max_score": 100,
        "time_bonus": True,
        "order": 2,
    },
    {
        "id": "vqe-h2-ground",
        "title": "H₂ Ground State Energy",
        "description": """## Problem

Use the Variational Quantum Eigensolver (VQE) approach to prepare a quantum state that approximates the ground state of the hydrogen molecule (H₂).

## Background

VQE is a hybrid quantum-classical algorithm used to find the ground state energy of molecules. It uses a parameterized quantum circuit (ansatz) and classical optimization to minimize the energy expectation value.

For H₂ at bond distance 0.735 Å, the Hamiltonian can be mapped to a 2-qubit system:

`H = g₀I + g₁Z₀ + g₂Z₁ + g₃Z₀Z₁ + g₄X₀X₁ + g₅Y₀Y₁`

The exact ground state energy is approximately **-1.137 Hartree**.

## Requirements

Design a variational ansatz that can prepare a state with energy within **0.1 Hartree** of the exact ground state.

## Ansatz Suggestions

A simple but effective ansatz is:
```
|ψ(θ)⟩ = RY(θ₁)|0⟩ ⊗ RY(θ₂)|0⟩ → CNOT → RY(θ₃) ⊗ RY(θ₄)
```""",
        "category": "vqe",
        "difficulty": "Medium",
        "max_qubits": 2,
        "max_gate_count": 20,
        "max_circuit_depth": 15,
        "min_fidelity": 0.0,
        "target_fidelity": 0.0,
        "fidelity_metric": "expectation_value",
        "test_cases": [
            {"id": "tc-h2-energy", "name": "H₂ Ground State Energy", "expectedValue": -1.137, "tolerance": 0.1, "weight": 100, "isHidden": False},
        ],
        "hints": [
            "The RY-CNOT-RY ansatz is simple but powerful for H₂",
            "You need to find optimal rotation angles through classical optimization",
            "The state |01⟩ - |10⟩ (singlet state) is close to the ground state"
        ],
        "starter_code": """# VQE for H2 Ground State
from qiskit import QuantumCircuit
import numpy as np

def vqe_ansatz(params):
    \"\"\"
    Create a parameterized ansatz for VQE.

    Args:
        params: List of rotation angles [theta1, theta2, ...]

    Returns:
        QuantumCircuit: Parameterized ansatz circuit
    \"\"\"
    qc = QuantumCircuit(2)

    # Example: Simple RY-CNOT ansatz
    # qc.ry(params[0], 0)
    # qc.ry(params[1], 1)
    # qc.cx(0, 1)

    # Your implementation here

    return qc

# Optimal parameters (to be found via classical optimization)
# Expected energy: -1.137 Hartree
""",
        "author": "QCloud Team",
        "tags": ["vqe", "chemistry", "optimization", "variational"],
        "max_score": 100,
        "time_bonus": True,
        "order": 3,
    },
    {
        "id": "error-3qubit-bitflip",
        "title": "Three-Qubit Bit-Flip Code",
        "description": """## Problem

Implement the 3-qubit bit-flip error correction code that can detect and correct a single X (bit-flip) error on any of the three qubits.

## Background

The 3-qubit bit-flip code encodes a single logical qubit into 3 physical qubits:

- |0⟩_L = |000⟩
- |1⟩_L = |111⟩

Using majority voting, a single bit-flip error can be detected and corrected.

## Encoding

```
|ψ⟩ = α|0⟩ + β|1⟩  →  α|000⟩ + β|111⟩
```

This is done with two CNOT gates from the data qubit to the ancilla qubits.

## Error Detection (Syndrome Measurement)

Use two ancilla qubits to measure the parity:
- Ancilla 1: Parity of qubits 0 and 1
- Ancilla 2: Parity of qubits 1 and 2

The syndrome tells us which qubit had an error (if any).

## Requirements

Your circuit must:
1. Encode a logical qubit
2. Detect and correct a single bit-flip error
3. Decode back to the original state""",
        "category": "error",
        "difficulty": "Hard",
        "max_qubits": 5,
        "max_gate_count": 30,
        "max_circuit_depth": 25,
        "min_fidelity": 0.95,
        "target_fidelity": 0.99,
        "fidelity_metric": "state_fidelity",
        "test_cases": [
            {"id": "tc-no-error", "name": "No Error", "inputState": "|+⟩", "errorQubit": -1, "weight": 25, "isHidden": False},
            {"id": "tc-error-q0", "name": "Error on Qubit 0", "inputState": "|0⟩", "errorQubit": 0, "weight": 25, "isHidden": False},
            {"id": "tc-error-q1", "name": "Error on Qubit 1", "inputState": "|1⟩", "errorQubit": 1, "weight": 25, "isHidden": True},
            {"id": "tc-error-q2", "name": "Error on Qubit 2", "inputState": "|+⟩", "errorQubit": 2, "weight": 25, "isHidden": True},
        ],
        "hints": [
            "Encoding: CNOT from qubit 0 to qubit 1, then CNOT from qubit 0 to qubit 2",
            "Syndrome measurement uses ancilla qubits and controlled operations",
            "Correction is conditional on the syndrome measurement results"
        ],
        "starter_code": """# 3-Qubit Bit-Flip Error Correction Code
from qiskit import QuantumCircuit

def bit_flip_code():
    \"\"\"
    Implement the 3-qubit bit-flip error correction code.

    Returns:
        QuantumCircuit: Complete encoding, error detection, and correction circuit
    \"\"\"
    # 3 data qubits + 2 syndrome qubits
    qc = QuantumCircuit(5, 1)

    # Encoding: |ψ⟩ → |ψψψ⟩
    # TODO: Implement encoding

    # (Error would be applied here by the tester)

    # Syndrome measurement
    # TODO: Implement syndrome extraction

    # Error correction
    # TODO: Apply correction based on syndrome

    # Decode and measure
    # TODO: Decode back to single qubit

    qc.measure(0, 0)
    return qc
""",
        "author": "QCloud Team",
        "tags": ["error-correction", "bit-flip", "syndrome", "advanced"],
        "max_score": 100,
        "time_bonus": False,
        "order": 4,
    },
    {
        "id": "qaoa-maxcut-3node",
        "title": "MaxCut with QAOA",
        "description": """## Problem

Use the Quantum Approximate Optimization Algorithm (QAOA) to solve the MaxCut problem on a simple 3-node graph.

## Background

MaxCut: Given a graph, partition the vertices into two sets to maximize the number of edges between the sets.

QAOA alternates between:
1. **Cost layer**: Encodes the problem (ZZ interactions for each edge)
2. **Mixer layer**: Enables exploration (X rotations on all qubits)

## Graph

```
    (0)
   /   \\
  /     \\
(1)-----(2)
```

A triangle graph with 3 nodes and 3 edges.

## Optimal Solutions

The maximum cut has value 2 (cut 2 edges). Optimal solutions: |001⟩, |010⟩, |011⟩, |100⟩, |101⟩, |110⟩

## Requirements

Implement a QAOA circuit with at least 1 layer (p=1) that finds a maximum cut with probability ≥ 60%.""",
        "category": "optimization",
        "difficulty": "Hard",
        "max_qubits": 3,
        "max_gate_count": 40,
        "max_circuit_depth": 30,
        "min_fidelity": 0.6,
        "target_fidelity": 0.9,
        "fidelity_metric": "probability_overlap",
        "test_cases": [
            {"id": "tc-triangle", "name": "Triangle Graph MaxCut", "edges": [[0, 1], [1, 2], [0, 2]], "weight": 100, "isHidden": False},
        ],
        "hints": [
            "The cost Hamiltonian uses ZZ interactions: exp(-iγ Z_i Z_j) for each edge",
            "The mixer uses RX gates: exp(-iβ X_i) for each qubit",
            "Start in uniform superposition using H gates",
            "Typical good parameters for p=1: γ ≈ π/4, β ≈ π/4"
        ],
        "starter_code": """# QAOA for MaxCut
from qiskit import QuantumCircuit
import numpy as np

def qaoa_maxcut(gamma, beta, edges):
    \"\"\"
    Implement QAOA for the MaxCut problem.

    Args:
        gamma: Cost layer parameter
        beta: Mixer layer parameter
        edges: List of edges [(i,j), ...]

    Returns:
        QuantumCircuit: QAOA circuit for MaxCut
    \"\"\"
    n_qubits = 3
    qc = QuantumCircuit(n_qubits, n_qubits)

    # Initial superposition
    for i in range(n_qubits):
        qc.h(i)

    # Cost layer: exp(-i*gamma*Z_i*Z_j) for each edge
    # Hint: ZZ interaction = CNOT - RZ - CNOT
    # TODO: Implement cost layer

    # Mixer layer: exp(-i*beta*X_i) for each qubit
    # Hint: This is just RX(2*beta) on each qubit
    # TODO: Implement mixer layer

    # Measure
    qc.measure(range(n_qubits), range(n_qubits))

    return qc
""",
        "author": "QCloud Team",
        "tags": ["qaoa", "optimization", "maxcut", "variational"],
        "max_score": 100,
        "time_bonus": True,
        "order": 5,
    },
    {
        "id": "qpe-basic",
        "title": "Quantum Phase Estimation",
        "description": """## Problem

Implement Quantum Phase Estimation (QPE) to estimate the eigenvalue phase of a unitary operator.

## Background

Given a unitary operator U with eigenstate |ψ⟩ and eigenvalue e^(2πiθ), QPE estimates θ using n ancilla qubits to achieve precision of 1/2^n.

## Setup

For this problem, U = T gate (π/4 phase gate), and |ψ⟩ = |1⟩.

The T gate has eigenvalue e^(iπ/4) for |1⟩, so θ = 1/8.

With 3 ancilla qubits, you should estimate θ with precision 1/8.

## Algorithm

1. Initialize ancillas in |+⟩ state
2. Apply controlled-U^(2^k) for k = 0, 1, ..., n-1
3. Apply inverse QFT to ancillas
4. Measure ancillas to get binary representation of θ

## Expected Output

The measurement should give |001⟩ (representing 1/8) with high probability.""",
        "category": "shor",
        "difficulty": "Expert",
        "max_qubits": 4,
        "max_gate_count": 60,
        "max_circuit_depth": 45,
        "min_fidelity": 0.8,
        "target_fidelity": 0.95,
        "fidelity_metric": "probability_overlap",
        "test_cases": [
            {"id": "tc-t-gate", "name": "T Gate Phase (θ=1/8)", "unitary": "T", "targetPhase": 0.125, "weight": 50, "isHidden": False},
            {"id": "tc-s-gate", "name": "S Gate Phase (θ=1/4)", "unitary": "S", "targetPhase": 0.25, "weight": 50, "isHidden": True},
        ],
        "hints": [
            "Controlled-T can be implemented directly in Qiskit",
            "The inverse QFT includes swap gates and controlled rotations",
            "For T^(2^k), you need k applications of controlled-T",
            "Remember to reverse bit order in measurement interpretation"
        ],
        "starter_code": """# Quantum Phase Estimation
from qiskit import QuantumCircuit
import numpy as np

def qpe_circuit(n_ancilla=3):
    \"\"\"
    Implement Quantum Phase Estimation for the T gate.

    Args:
        n_ancilla: Number of ancilla qubits for precision

    Returns:
        QuantumCircuit: QPE circuit
    \"\"\"
    # n_ancilla counting qubits + 1 eigenstate qubit
    qc = QuantumCircuit(n_ancilla + 1, n_ancilla)

    # Prepare eigenstate |1⟩ on last qubit
    qc.x(n_ancilla)

    # Initialize ancillas in superposition
    for i in range(n_ancilla):
        qc.h(i)

    # Apply controlled-U^(2^k) operations
    # TODO: Implement controlled phase applications

    # Inverse QFT on ancillas
    # TODO: Implement inverse QFT

    # Measure ancillas
    qc.measure(range(n_ancilla), range(n_ancilla))

    return qc
""",
        "author": "QCloud Team",
        "tags": ["qpe", "phase-estimation", "qft", "expert"],
        "max_score": 100,
        "time_bonus": True,
        "order": 6,
    },
]


def seed_database():
    """Seed the database with initial data"""
    db = SessionLocal()

    try:
        # Check if data already exists
        existing_categories = db.query(Category).count()
        existing_examples = db.query(Example).count()
        existing_problems = db.query(Problem).count()

        if existing_categories > 0 or existing_examples > 0 or existing_problems > 0:
            print(f"Database already has data:")
            print(f"  - {existing_categories} categories")
            print(f"  - {existing_examples} examples")
            print(f"  - {existing_problems} problems")

            response = input("Do you want to clear existing data and re-seed? (y/N): ")
            if response.lower() != 'y':
                print("Aborted. No changes made.")
                return

            # Clear existing data
            db.query(Example).delete()
            db.query(Problem).delete()
            db.query(Category).delete()
            db.commit()
            print("Cleared existing data.")

        # Seed categories (for both examples and problems)
        print("\nSeeding categories...")
        all_categories = {}

        # Add example categories
        for cat_data in EXAMPLE_CATEGORIES:
            cat = Category(
                id=f"example-{cat_data['id']}",
                name=cat_data["name"],
                description=cat_data["description"],
                icon=cat_data["icon"],
                color=cat_data.get("color", "blue"),
                order=cat_data["order"],
                is_active=True,
            )
            db.add(cat)
            all_categories[cat_data["id"]] = cat.id
            print(f"  + Category: {cat.name} (examples)")

        # Add competition categories
        for cat_data in COMPETITION_CATEGORIES:
            cat = Category(
                id=f"problem-{cat_data['id']}",
                name=cat_data["name"],
                description=cat_data["description"],
                icon=cat_data["icon"],
                color=cat_data.get("color", "blue"),
                order=cat_data["order"] + 10,  # Offset to separate from example categories
                is_active=True,
            )
            db.add(cat)
            print(f"  + Category: {cat.name} (problems)")

        db.commit()

        # Seed examples
        print("\nSeeding examples...")
        for ex_data in EXAMPLES:
            example = Example(
                id=ex_data["id"],
                title=ex_data["title"],
                description=ex_data["description"],
                category=f"example-{ex_data['category']}",
                difficulty=ex_data["difficulty"],
                code=ex_data["code"],
                explanation=ex_data.get("explanation"),
                author=ex_data["author"],
                tags=json.dumps(ex_data.get("tags", [])),
                icon=ex_data.get("icon", "📝"),
                order=ex_data["order"],
                is_active=True,
                is_featured=False,
            )
            db.add(example)
            print(f"  + Example: {example.title}")

        db.commit()

        # Seed problems
        print("\nSeeding problems...")
        for prob_data in COMPETITION_PROBLEMS:
            problem = Problem(
                id=prob_data["id"],
                title=prob_data["title"],
                description=prob_data["description"],
                category=f"problem-{prob_data['category']}",
                difficulty=prob_data["difficulty"],
                max_qubits=prob_data["max_qubits"],
                max_gate_count=prob_data["max_gate_count"],
                max_circuit_depth=prob_data["max_circuit_depth"],
                min_fidelity=prob_data["min_fidelity"],
                target_fidelity=prob_data["target_fidelity"],
                fidelity_metric=prob_data["fidelity_metric"],
                test_cases=json.dumps(prob_data["test_cases"]),
                hints=json.dumps(prob_data["hints"]),
                starter_code=prob_data.get("starter_code"),
                author=prob_data["author"],
                tags=json.dumps(prob_data.get("tags", [])),
                max_score=prob_data["max_score"],
                time_bonus=prob_data["time_bonus"],
                order=prob_data["order"],
                is_active=True,
                is_featured=False,
            )
            db.add(problem)
            print(f"  + Problem: {problem.title}")

        db.commit()

        print("\n✅ Database seeded successfully!")
        print(f"   - {len(EXAMPLE_CATEGORIES) + len(COMPETITION_CATEGORIES)} categories")
        print(f"   - {len(EXAMPLES)} examples")
        print(f"   - {len(COMPETITION_PROBLEMS)} problems")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()

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
    {
        "id": "cs238b",
        "name": "CS 238B Quantum Algorithms",
        "description": "UCLA CS 238B Quantum Algorithms course homework assignments by Prof. Jens Palsberg",
        "icon": "🎓",
        "color": "teal",
        "order": 6,
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
    # ============ CS 238B Quantum Algorithms Homework ============
    {
        "id": "cs238b-gottesman-knill",
        "title": "Prove Gottesman-Knill Theorem",
        "description": """## Problem

Give a clear, complete, and detailed proof of the Gottesman-Knill theorem.

## Background

The Gottesman-Knill theorem states that a quantum circuit using only the following operations can be efficiently simulated on a classical computer:
- Preparation of qubits in computational basis states
- Clifford gates (Hadamard, Phase, CNOT)
- Measurements in the computational basis

This is a fundamental result in quantum computing that delineates the boundary between classically simulable and potentially quantum-advantaged computations.

## Requirements

1. State the theorem precisely
2. Define the stabilizer formalism
3. Show how each allowed operation transforms stabilizer states
4. Prove that the state can be tracked efficiently classically
5. Discuss the implications for quantum advantage

## Submission

Submit your proof as a PDF file, preferably written in LaTeX.""",
        "category": "cs238b",
        "difficulty": "Hard",
        "max_qubits": 0,
        "max_gate_count": 0,
        "max_circuit_depth": 0,
        "min_fidelity": 0.0,
        "target_fidelity": 1.0,
        "fidelity_metric": "manual_review",
        "test_cases": [
            {"id": "tc-proof", "name": "Proof Completeness", "weight": 100, "isHidden": False},
        ],
        "hints": [
            "Start by defining the Pauli group and stabilizer states",
            "Show that Clifford gates map Pauli operators to Pauli operators",
            "The key insight is that n-qubit stabilizer states can be described by n generators",
            "Each generator requires O(n) bits to store"
        ],
        "starter_code": """% LaTeX Template for Gottesman-Knill Proof
\\documentclass{article}
\\usepackage{amsmath, amssymb, amsthm}
\\usepackage{braket}

\\newtheorem{theorem}{Theorem}
\\newtheorem{lemma}{Lemma}
\\newtheorem{definition}{Definition}

\\title{Proof of the Gottesman-Knill Theorem}
\\author{Your Name}

\\begin{document}
\\maketitle

\\begin{theorem}[Gottesman-Knill]
% State the theorem here
\\end{theorem}

\\section{Preliminaries}
% Define stabilizer formalism

\\section{Proof}
% Your proof here

\\end{document}
""",
        "author": "Prof. Jens Palsberg",
        "tags": ["cs238b", "stabilizer", "clifford", "theory", "proof"],
        "max_score": 100,
        "time_bonus": False,
        "order": 101,
    },
    {
        "id": "cs238b-surface-code",
        "title": "Validation of Surface Code",
        "description": """## Problem

Use both Stim and ScaLERQEC to determine the logical error rate of a surface code with distance 7.

## Background

Surface codes are a leading candidate for fault-tolerant quantum computing. The logical error rate depends on:
- Physical error rate
- Code distance
- Decoder performance

## Tasks

1. Load the distance-7 surface code from the provided Stim-format file
2. Use both Stim and ScaLERQEC with the PyMatching decoder
3. Use the standard depolarizing noise model
4. Run experiments with physical error rates: 10⁻³ and 5×10⁻⁴
5. Compare outputs and running times from both tools
6. Calculate confidence intervals for each logical error rate estimate

## Requirements

- Clear experimental methodology
- Statistical analysis with confidence intervals
- Comparison of the two simulation tools
- Discussion of results

## Submission

Submit a report describing your experiments, comparing outputs and running times.""",
        "category": "cs238b",
        "difficulty": "Hard",
        "max_qubits": 0,
        "max_gate_count": 0,
        "max_circuit_depth": 0,
        "min_fidelity": 0.0,
        "target_fidelity": 1.0,
        "fidelity_metric": "manual_review",
        "test_cases": [
            {"id": "tc-stim", "name": "Stim Implementation", "weight": 40, "isHidden": False},
            {"id": "tc-scalerqec", "name": "ScaLERQEC Implementation", "weight": 40, "isHidden": False},
            {"id": "tc-analysis", "name": "Statistical Analysis", "weight": 20, "isHidden": False},
        ],
        "hints": [
            "Install Stim with: pip install stim",
            "PyMatching is the default decoder in both tools",
            "Use enough samples to get tight confidence intervals",
            "The logical error rate should decrease with lower physical error rate"
        ],
        "starter_code": """# Surface Code Validation
import stim
import numpy as np

# Load the surface code circuit
# circuit = stim.Circuit.from_file('surface_code_d7.stim')

def estimate_logical_error_rate(circuit, num_shots=10000):
    \"\"\"
    Estimate the logical error rate of a surface code.

    Args:
        circuit: Stim circuit for the surface code
        num_shots: Number of Monte Carlo samples

    Returns:
        Estimated logical error rate with confidence interval
    \"\"\"
    # TODO: Implement using Stim's sampler
    # TODO: Use PyMatching decoder
    # TODO: Calculate error rate and confidence interval
    pass

# Physical error rates to test
error_rates = [1e-3, 5e-4]

for p in error_rates:
    # TODO: Modify circuit with depolarizing noise
    # TODO: Run experiments
    # TODO: Compare Stim vs ScaLERQEC
    pass
""",
        "author": "Prof. Jens Palsberg",
        "tags": ["cs238b", "surface-code", "error-correction", "stim", "decoder"],
        "max_score": 100,
        "time_bonus": False,
        "order": 102,
    },
    {
        "id": "cs238b-eigensolver",
        "title": "Build an Eigensolver",
        "description": """## Problem

Implement the quantum eigensolver from the lecture notes and demonstrate that it works correctly for matrices up to size 16×16.

## Background

Quantum eigensolvers find eigenvalues and eigenvectors of matrices, which is fundamental to many quantum algorithms including:
- Quantum Phase Estimation (QPE)
- Variational Quantum Eigensolver (VQE)
- Quantum chemistry simulations

## Requirements

1. Implement the eigensolver algorithm from lecture notes
2. Test on matrices of sizes 2×2, 4×4, 8×8, and 16×16
3. Verify results against classical eigensolvers
4. Document precision and convergence behavior

## Experiments

- Use both Hermitian and unitary matrices
- Compare quantum results with numpy.linalg.eig
- Analyze circuit depth and qubit requirements

## Submission

Submit your program together with a report detailing your implementation, experiments, and results.""",
        "category": "cs238b",
        "difficulty": "Medium",
        "max_qubits": 8,
        "max_gate_count": 200,
        "max_circuit_depth": 100,
        "min_fidelity": 0.8,
        "target_fidelity": 0.95,
        "fidelity_metric": "eigenvalue_accuracy",
        "test_cases": [
            {"id": "tc-2x2", "name": "2×2 Matrix", "size": 2, "weight": 20, "isHidden": False},
            {"id": "tc-4x4", "name": "4×4 Matrix", "size": 4, "weight": 25, "isHidden": False},
            {"id": "tc-8x8", "name": "8×8 Matrix", "size": 8, "weight": 25, "isHidden": True},
            {"id": "tc-16x16", "name": "16×16 Matrix", "size": 16, "weight": 30, "isHidden": True},
        ],
        "hints": [
            "Start with Quantum Phase Estimation as the core",
            "For n×n matrices, you need log₂(n) qubits to encode the eigenvector",
            "Use additional ancilla qubits for precision in phase estimation",
            "Verify eigenvalues: Av = λv"
        ],
        "starter_code": """# Quantum Eigensolver
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import numpy as np

def quantum_eigensolver(matrix, n_precision_qubits=3):
    \"\"\"
    Find eigenvalues of a unitary matrix using quantum phase estimation.

    Args:
        matrix: Unitary matrix (numpy array)
        n_precision_qubits: Number of qubits for precision

    Returns:
        List of estimated eigenvalues
    \"\"\"
    n = int(np.log2(matrix.shape[0]))
    total_qubits = n_precision_qubits + n

    qc = QuantumCircuit(total_qubits, n_precision_qubits)

    # Initialize precision qubits in superposition
    for i in range(n_precision_qubits):
        qc.h(i)

    # Prepare eigenstate on target qubits
    # TODO: Initialize to a superposition of eigenstates

    # Apply controlled-U^(2^k) operations
    # TODO: Implement controlled unitary powers

    # Inverse QFT on precision qubits
    # TODO: Implement inverse QFT

    # Measure precision qubits
    qc.measure(range(n_precision_qubits), range(n_precision_qubits))

    return qc

# Test matrices
def test_eigensolver():
    # 2x2 test
    pauli_z = np.array([[1, 0], [0, -1]])
    # TODO: Test with larger matrices
    pass
""",
        "author": "Prof. Jens Palsberg",
        "tags": ["cs238b", "eigensolver", "qpe", "phase-estimation"],
        "max_score": 100,
        "time_bonus": False,
        "order": 103,
    },
    {
        "id": "cs238b-amplitude-amplification",
        "title": "Demonstrate Amplitude Amplification",
        "description": """## Problem

Demonstrate an impressive use of amplitude amplification by designing and implementing a custom quantum search problem.

## Baseline

The baseline example uses a function f : {0,1}² → {0,1} where f(11) = 1 and f(x) = 0 otherwise.

The circuit defines a unitary U on 2 qubits plus 1 helper qubit:
```
|0⟩ ─[H]─●───●─[R]─
|0⟩ ─[H]───●───[R]─
|1⟩ ────[S†]─[S†]──
```

Where R = (1/√2) * [[1, -i], [-i, 1]]

For U|001⟩, the probability of measuring |11⟩ is 62.5%. Amplitude amplification boosts this to 97.7%.

## Your Tasks

1. **Pick n**: Choose n ≥ 3 qubits
2. **Define g**: Create a function g : {0,1}ⁿ → {0,1} where g(x) = 1 for exactly one bitstring x
3. **Define V**: Create a unitary V such that measuring V|0ⁿ...⟩ gives g(x)=1 with probability between 20% and 30%
4. **Amplify**: Show amplitude amplification boosts the success probability to >70%

## Requirements

- Demonstrate with quantum circuit simulation
- Show probability improvements clearly
- Explain your design choices""",
        "category": "cs238b",
        "difficulty": "Medium",
        "max_qubits": 8,
        "max_gate_count": 100,
        "max_circuit_depth": 50,
        "min_fidelity": 0.7,
        "target_fidelity": 0.9,
        "fidelity_metric": "probability_overlap",
        "test_cases": [
            {"id": "tc-initial", "name": "Initial Probability 20-30%", "weight": 30, "isHidden": False},
            {"id": "tc-amplified", "name": "Amplified Probability >70%", "weight": 50, "isHidden": False},
            {"id": "tc-complexity", "name": "Design Complexity", "weight": 20, "isHidden": False},
        ],
        "hints": [
            "For initial amplitude a, sin²(θ) = a gives the rotation angle",
            "Number of iterations: approximately π/(4θ) - 1/2",
            "The Grover diffusion operator: 2|ψ⟩⟨ψ| - I",
            "Design V carefully to achieve 20-30% initial probability"
        ],
        "starter_code": """# Amplitude Amplification Demonstration
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
import numpy as np

def create_initial_state(n_qubits, target_state):
    \"\"\"
    Create a unitary V that prepares a state with 20-30% probability
    on the target state.

    Args:
        n_qubits: Number of qubits
        target_state: The bitstring to mark (e.g., '101')

    Returns:
        QuantumCircuit implementing V
    \"\"\"
    qc = QuantumCircuit(n_qubits)

    # TODO: Design V to achieve 20-30% probability on target
    # Hint: Use rotations instead of pure Hadamards

    return qc

def oracle(qc, n_qubits, target_state):
    \"\"\"Apply oracle that marks the target state with a phase flip.\"\"\"
    # TODO: Implement oracle for target_state
    pass

def diffusion(qc, n_qubits):
    \"\"\"Apply the Grover diffusion operator.\"\"\"
    # TODO: Implement diffusion operator
    pass

def amplitude_amplification(n_qubits, target_state, n_iterations):
    \"\"\"
    Full amplitude amplification circuit.

    Args:
        n_qubits: Number of qubits
        target_state: Target bitstring
        n_iterations: Number of Grover iterations

    Returns:
        QuantumCircuit with amplification
    \"\"\"
    qc = QuantumCircuit(n_qubits, n_qubits)

    # Initial state preparation
    # TODO: Append create_initial_state

    # Grover iterations
    for _ in range(n_iterations):
        # TODO: Apply oracle and diffusion
        pass

    qc.measure_all()
    return qc

# Demonstrate your results
n = 3  # Your choice of n
target = '101'  # Your target state

# Show initial probability
# Show amplified probability
""",
        "author": "Prof. Jens Palsberg",
        "tags": ["cs238b", "amplitude-amplification", "grover", "search"],
        "max_score": 100,
        "time_bonus": False,
        "order": 104,
    },
    {
        "id": "cs238b-block-encoding",
        "title": "Implement Block Encoding",
        "description": """## Problem

Implement block encoding of banded circulant matrices as described in the paper by Camps et al.

## Background

A banded circulant matrix BCMₙ(α, β, γ) of size 2ⁿ × 2ⁿ has the form:

```
    ⎛ α  γ  0  ...  β ⎞
    ⎜ β  α  .       0 ⎟
    ⎜ 0  β  .   γ   . ⎟
    ⎜ .  .  .   α   γ ⎟
    ⎝ γ  0  ... β   α ⎠
```

## Parameters

Use: α = 0.2, β = 0.3, γ = 0.4

## Tasks

1. Implement block encoding of BCM₃(α, β, γ) (8×8 matrix)
2. Implement block encoding of BCM₄(α, β, γ) (16×16 matrix)
3. Verify implementations with simulation experiments

## Reference

Daan Camps et al., "Explicit Quantum Circuits for Block Encodings of Certain Sparse Matrices", 2022, Section 4.2 (pages 9-13)

## Verification

The block encoding U satisfies: ⟨0|⊗ᵐ U |0⟩⊗ᵐ = A/||A||

Test by measuring the upper-left block of your unitary.""",
        "category": "cs238b",
        "difficulty": "Hard",
        "max_qubits": 10,
        "max_gate_count": 150,
        "max_circuit_depth": 80,
        "min_fidelity": 0.9,
        "target_fidelity": 0.99,
        "fidelity_metric": "matrix_fidelity",
        "test_cases": [
            {"id": "tc-bcm3", "name": "BCM₃ Encoding", "n": 3, "weight": 50, "isHidden": False},
            {"id": "tc-bcm4", "name": "BCM₄ Encoding", "n": 4, "weight": 50, "isHidden": False},
        ],
        "hints": [
            "Block encoding uses ancilla qubits to embed the matrix",
            "The matrix A appears in the upper-left block of a larger unitary",
            "Use the explicit circuit construction from Section 4.2",
            "Verify by extracting the matrix elements via state tomography"
        ],
        "starter_code": """# Block Encoding of Banded Circulant Matrices
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
from qiskit.quantum_info import Operator
import numpy as np

def banded_circulant_matrix(n, alpha, beta, gamma):
    \"\"\"
    Construct a banded circulant matrix BCM_n(α, β, γ).

    Args:
        n: Matrix is 2^n x 2^n
        alpha, beta, gamma: Matrix parameters

    Returns:
        numpy array of the matrix
    \"\"\"
    size = 2**n
    matrix = np.zeros((size, size))
    for i in range(size):
        matrix[i, i] = alpha
        matrix[i, (i + 1) % size] = gamma
        matrix[i, (i - 1) % size] = beta
    return matrix

def block_encoding_circuit(n, alpha, beta, gamma):
    \"\"\"
    Create a block encoding circuit for BCM_n(α, β, γ).

    Following Camps et al., Section 4.2

    Args:
        n: Size parameter (matrix is 2^n x 2^n)
        alpha, beta, gamma: Matrix parameters

    Returns:
        QuantumCircuit implementing the block encoding
    \"\"\"
    # Number of ancilla qubits needed
    n_ancilla = 2  # Adjust based on the paper
    total_qubits = n + n_ancilla

    qc = QuantumCircuit(total_qubits)

    # TODO: Implement block encoding following Section 4.2
    # Step 1: State preparation on ancillas
    # Step 2: Controlled operations
    # Step 3: Uncompute ancillas

    return qc

def verify_block_encoding(qc, target_matrix):
    \"\"\"Verify the block encoding is correct.\"\"\"
    # Get the unitary matrix
    op = Operator(qc)
    U = op.data

    # Extract the upper-left block
    n = int(np.log2(target_matrix.shape[0]))
    block = U[:2**n, :2**n]

    # Compare (accounting for normalization)
    norm = np.linalg.norm(target_matrix)
    error = np.linalg.norm(block - target_matrix / norm)

    return error

# Parameters
alpha, beta, gamma = 0.2, 0.3, 0.4

# Test BCM_3
A3 = banded_circulant_matrix(3, alpha, beta, gamma)
qc3 = block_encoding_circuit(3, alpha, beta, gamma)
# Verify...

# Test BCM_4
A4 = banded_circulant_matrix(4, alpha, beta, gamma)
qc4 = block_encoding_circuit(4, alpha, beta, gamma)
# Verify...
""",
        "author": "Prof. Jens Palsberg",
        "tags": ["cs238b", "block-encoding", "sparse-matrix", "qsvt"],
        "max_score": 100,
        "time_bonus": False,
        "order": 105,
    },
    {
        "id": "cs238b-trotter",
        "title": "Hamiltonian Simulation by Trotterization",
        "description": """## Problem

Implement Hamiltonian simulation using the Trotter-Suzuki decomposition and demonstrate correctness with quantum circuit simulation.

## Background

Given a Hamiltonian H = Σᵢ Hᵢ, time evolution e^(-iHt) can be approximated by:

**First-order Trotter:**
e^(-iHt) ≈ (∏ᵢ e^(-iHᵢt/n))ⁿ

**Second-order Trotter:**
e^(-iHt) ≈ (∏ᵢ e^(-iHᵢt/2n) ∏ᵢ e^(-iHᵢt/2n))ⁿ

The error scales as O(t²/n) for first-order and O(t³/n²) for second-order.

## Requirements

1. Implement first and second order Trotterization
2. Test on a physically meaningful Hamiltonian (e.g., Heisenberg model, transverse-field Ising)
3. Show convergence as number of Trotter steps increases
4. Compare with exact time evolution

## Experiments

- Vary the number of Trotter steps
- Plot error vs. circuit depth
- Demonstrate on 2-4 qubit systems""",
        "category": "cs238b",
        "difficulty": "Medium",
        "max_qubits": 6,
        "max_gate_count": 200,
        "max_circuit_depth": 100,
        "min_fidelity": 0.9,
        "target_fidelity": 0.99,
        "fidelity_metric": "state_fidelity",
        "test_cases": [
            {"id": "tc-first-order", "name": "First-Order Trotter", "weight": 30, "isHidden": False},
            {"id": "tc-second-order", "name": "Second-Order Trotter", "weight": 30, "isHidden": False},
            {"id": "tc-convergence", "name": "Convergence Analysis", "weight": 40, "isHidden": False},
        ],
        "hints": [
            "For Pauli terms, e^(-iθP) can be implemented with basis change + RZ",
            "ZZ interaction: CNOT - RZ - CNOT",
            "XX interaction: H⊗H - ZZ - H⊗H",
            "Track fidelity with exact evolution computed classically"
        ],
        "starter_code": """# Hamiltonian Simulation by Trotterization
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
from qiskit.quantum_info import Statevector, Operator
import numpy as np
from scipy.linalg import expm

def exact_evolution(H, t, initial_state):
    \"\"\"Compute exact time evolution e^(-iHt)|ψ⟩.\"\"\"
    U = expm(-1j * H * t)
    return U @ initial_state

def trotter_step_first_order(qc, terms, dt):
    \"\"\"
    Apply one first-order Trotter step.

    Args:
        qc: QuantumCircuit to append to
        terms: List of (coefficient, pauli_string) tuples
        dt: Time step
    \"\"\"
    for coeff, pauli in terms:
        # TODO: Implement e^(-i * coeff * pauli * dt)
        pass

def trotter_step_second_order(qc, terms, dt):
    \"\"\"
    Apply one second-order Trotter step.

    Args:
        qc: QuantumCircuit to append to
        terms: List of (coefficient, pauli_string) tuples
        dt: Time step
    \"\"\"
    # Forward sweep with dt/2
    for coeff, pauli in terms:
        # TODO: Implement with dt/2
        pass

    # Backward sweep with dt/2
    for coeff, pauli in reversed(terms):
        # TODO: Implement with dt/2
        pass

def trotter_simulation(n_qubits, hamiltonian_terms, t, n_steps, order=1):
    \"\"\"
    Full Trotter simulation circuit.

    Args:
        n_qubits: Number of qubits
        hamiltonian_terms: List of (coeff, pauli) terms
        t: Total evolution time
        n_steps: Number of Trotter steps
        order: 1 for first-order, 2 for second-order

    Returns:
        QuantumCircuit implementing time evolution
    \"\"\"
    qc = QuantumCircuit(n_qubits)
    dt = t / n_steps

    for _ in range(n_steps):
        if order == 1:
            trotter_step_first_order(qc, hamiltonian_terms, dt)
        else:
            trotter_step_second_order(qc, hamiltonian_terms, dt)

    return qc

# Example: 2-qubit Heisenberg model
# H = J(XX + YY + ZZ)
J = 1.0
heisenberg_terms = [
    (J, 'XX'),
    (J, 'YY'),
    (J, 'ZZ'),
]

# Run experiments
t = 1.0
for n_steps in [1, 2, 4, 8, 16]:
    qc = trotter_simulation(2, heisenberg_terms, t, n_steps, order=1)
    # TODO: Compare with exact evolution
    # TODO: Calculate fidelity
""",
        "author": "Prof. Jens Palsberg",
        "tags": ["cs238b", "hamiltonian", "trotter", "simulation"],
        "max_score": 100,
        "time_bonus": False,
        "order": 106,
    },
    {
        "id": "cs238b-lcu",
        "title": "Hamiltonian Simulation by LCU",
        "description": """## Problem

Implement Hamiltonian simulation using the Linear Combination of Unitaries (LCU) method.

## Background

The LCU method expresses a non-unitary operator as:
A = Σᵢ αᵢ Uᵢ

where αᵢ are coefficients and Uᵢ are unitaries. For Hamiltonians:
e^(-iHt) ≈ Σⱼ βⱼ Vⱼ

The LCU circuit uses:
1. **PREPARE**: Prepares |+⟩ = Σᵢ √(αᵢ/s)|i⟩ where s = Σᵢ αᵢ
2. **SELECT**: Applies Uᵢ controlled on |i⟩
3. **PREPARE†**: Uncomputes the preparation

## Requirements

1. Implement the LCU framework
2. Apply to Hamiltonian simulation (Taylor series or other decomposition)
3. Demonstrate correctness via simulation
4. Compare with exact evolution

## Submission

Submit your program and a report with experimental results.""",
        "category": "cs238b",
        "difficulty": "Hard",
        "max_qubits": 8,
        "max_gate_count": 250,
        "max_circuit_depth": 120,
        "min_fidelity": 0.85,
        "target_fidelity": 0.95,
        "fidelity_metric": "state_fidelity",
        "test_cases": [
            {"id": "tc-lcu-basic", "name": "Basic LCU Implementation", "weight": 40, "isHidden": False},
            {"id": "tc-hamiltonian", "name": "Hamiltonian Simulation", "weight": 40, "isHidden": False},
            {"id": "tc-accuracy", "name": "Accuracy Analysis", "weight": 20, "isHidden": False},
        ],
        "hints": [
            "PREPARE circuit can use amplitude encoding techniques",
            "SELECT is a multi-controlled operation",
            "For Pauli Hamiltonians, each Uᵢ is a Pauli string",
            "Post-selection on ancilla being |0⟩ gives the result"
        ],
        "starter_code": """# Hamiltonian Simulation by LCU
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
from qiskit.quantum_info import Statevector
import numpy as np

def prepare_circuit(coefficients):
    \"\"\"
    Create PREPARE circuit that maps |0⟩ to Σᵢ √(αᵢ/s)|i⟩.

    Args:
        coefficients: List of αᵢ values (positive)

    Returns:
        QuantumCircuit for state preparation
    \"\"\"
    n_terms = len(coefficients)
    n_ancilla = int(np.ceil(np.log2(n_terms)))

    qc = QuantumCircuit(n_ancilla)

    # Normalize coefficients
    s = sum(coefficients)
    amplitudes = [np.sqrt(c / s) for c in coefficients]

    # Pad to power of 2
    while len(amplitudes) < 2**n_ancilla:
        amplitudes.append(0)

    # TODO: Implement amplitude encoding
    # Option 1: Use qiskit's initialize (not efficient)
    # Option 2: Use explicit rotation angles

    return qc

def select_circuit(unitaries, n_system):
    \"\"\"
    Create SELECT circuit: |i⟩|ψ⟩ → |i⟩Uᵢ|ψ⟩.

    Args:
        unitaries: List of unitary operations
        n_system: Number of system qubits

    Returns:
        QuantumCircuit for controlled unitary selection
    \"\"\"
    n_terms = len(unitaries)
    n_ancilla = int(np.ceil(np.log2(n_terms)))

    qc = QuantumCircuit(n_ancilla + n_system)

    # TODO: Implement controlled application of each Uᵢ
    # Use multi-controlled gates based on ancilla state

    return qc

def lcu_circuit(coefficients, unitaries, n_system):
    \"\"\"
    Complete LCU circuit: PREPARE - SELECT - PREPARE†.

    Args:
        coefficients: LCU coefficients αᵢ
        unitaries: Unitary operators Uᵢ
        n_system: Number of system qubits

    Returns:
        QuantumCircuit implementing LCU
    \"\"\"
    n_ancilla = int(np.ceil(np.log2(len(coefficients))))
    total_qubits = n_ancilla + n_system

    qc = QuantumCircuit(total_qubits, n_system)

    # PREPARE
    prep = prepare_circuit(coefficients)
    qc.compose(prep, range(n_ancilla), inplace=True)

    # SELECT
    sel = select_circuit(unitaries, n_system)
    qc.compose(sel, range(total_qubits), inplace=True)

    # PREPARE†
    qc.compose(prep.inverse(), range(n_ancilla), inplace=True)

    # Measure system (post-select ancilla = 0)
    qc.measure(range(n_ancilla, total_qubits), range(n_system))

    return qc

# Example: Implement e^(-iHt) for simple Hamiltonian
# H = Z₀ + X₁ (two Pauli terms)

# Taylor expansion: e^(-iHt) ≈ I - iHt - H²t²/2 + ...
# LCU decomposition of truncated Taylor series
""",
        "author": "Prof. Jens Palsberg",
        "tags": ["cs238b", "lcu", "hamiltonian", "simulation"],
        "max_score": 100,
        "time_bonus": False,
        "order": 107,
    },
    {
        "id": "cs238b-hhl",
        "title": "Solving Linear Equations with HHL",
        "description": """## Problem

Work through a small example of solving linear equations Ax = b using the HHL (Harrow-Hassidim-Lloyd) algorithm.

## Background

The HHL algorithm solves linear systems exponentially faster than classical methods (under certain conditions). Key steps:

1. **Encode b**: Prepare quantum state |b⟩
2. **Phase Estimation**: Find eigenvalues of A
3. **Controlled Rotation**: Rotate ancilla by 1/λᵢ
4. **Inverse Phase Estimation**: Uncompute eigenvalue register
5. **Measurement**: Post-select on ancilla = |1⟩

## Requirements

1. Pick a 2×2 or 4×4 system of linear equations
2. Show how to represent Ax = b for HHL input
3. Execute the algorithm step by step
4. Verify the solution

## Notes

- A must be Hermitian (or embed in larger Hermitian matrix)
- A must be efficiently simulable
- Solution is encoded in quantum state (amplitude encoding)

## Submission

This should be written by hand, though you may use computers for calculations.""",
        "category": "cs238b",
        "difficulty": "Hard",
        "max_qubits": 6,
        "max_gate_count": 150,
        "max_circuit_depth": 80,
        "min_fidelity": 0.8,
        "target_fidelity": 0.95,
        "fidelity_metric": "solution_accuracy",
        "test_cases": [
            {"id": "tc-setup", "name": "Problem Setup", "weight": 25, "isHidden": False},
            {"id": "tc-execution", "name": "Algorithm Execution", "weight": 50, "isHidden": False},
            {"id": "tc-verification", "name": "Solution Verification", "weight": 25, "isHidden": False},
        ],
        "hints": [
            "Start with a diagonal A for simplicity",
            "Eigenvalues must be powers of 2 for exact phase estimation",
            "The solution |x⟩ ∝ A⁻¹|b⟩",
            "Success probability depends on overlap with eigenvectors"
        ],
        "starter_code": """# HHL Algorithm for Solving Linear Equations
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
from qiskit.quantum_info import Statevector
import numpy as np

# Example: Solve Ax = b
# Let A = [[1, 0], [0, 2]] (diagonal, eigenvalues 1 and 2)
# Let b = [1, 1] (normalized: [1/√2, 1/√2])

A = np.array([[1, 0], [0, 2]])
b = np.array([1, 1]) / np.sqrt(2)

# Classical solution for verification
x_classical = np.linalg.solve(A, b)
print(f"Classical solution: {x_classical}")
print(f"Normalized: {x_classical / np.linalg.norm(x_classical)}")

def hhl_circuit(n_clock_qubits=2):
    \"\"\"
    Implement HHL for the example system.

    Circuit layout:
    - Clock qubits: for phase estimation (eigenvalue storage)
    - System qubit: encodes |b⟩ and output |x⟩
    - Ancilla: for controlled rotation and post-selection

    Args:
        n_clock_qubits: Precision for eigenvalue estimation

    Returns:
        QuantumCircuit implementing HHL
    \"\"\"
    n_system = 1  # log2(dimension of A)
    total_qubits = n_clock_qubits + n_system + 1  # +1 for ancilla

    qc = QuantumCircuit(total_qubits, 1)  # Measure ancilla

    # Qubit assignment
    clock = list(range(n_clock_qubits))
    system = [n_clock_qubits]
    ancilla = [n_clock_qubits + 1]

    # Step 1: Prepare |b⟩ on system register
    # |b⟩ = |+⟩ = H|0⟩ for our example
    qc.h(system[0])

    # Step 2: Phase Estimation
    # Initialize clock qubits
    for q in clock:
        qc.h(q)

    # Controlled-U^(2^k) operations
    # TODO: Implement controlled e^(iAt) for eigenvalue estimation

    # Inverse QFT on clock
    # TODO: Implement

    # Step 3: Controlled rotation on ancilla
    # Rotate by angle depending on eigenvalue in clock register
    # TODO: Implement rotations proportional to 1/λ

    # Step 4: Inverse Phase Estimation
    # TODO: Uncompute clock register

    # Step 5: Measure ancilla
    qc.measure(ancilla, [0])

    return qc

# Build and run HHL circuit
qc = hhl_circuit()
print(qc.draw())

# Simulate and analyze
simulator = AerSimulator()
# TODO: Run and extract solution from post-selected states
""",
        "author": "Prof. Jens Palsberg",
        "tags": ["cs238b", "hhl", "linear-equations", "qpe"],
        "max_score": 100,
        "time_bonus": False,
        "order": 108,
    },
    {
        "id": "cs238b-state-distillation",
        "title": "Experiment with State Distillation",
        "description": """## Problem

Distill high-fidelity Bell pairs on an IBM quantum computer using entanglement purification protocols.

## Background

Entanglement distillation takes many noisy entangled pairs and produces fewer, higher-quality pairs. This is essential for:
- Long-distance quantum communication
- Fault-tolerant quantum computing
- Quantum repeaters

## Algorithms to Implement

1. **Bennett et al., 1996**: BBPSSW protocol
2. **Deutsch et al., 1996**: DEJMPS protocol

## Experimental Plan

1. Create many noisy Bell pairs on IBM hardware
2. Implement both distillation protocols
3. Measure fidelities before and after distillation
4. Compare the two algorithms

## Key Questions

- Were you successful at distilling higher-fidelity Bell pairs?
- Is the error rate of the IBM computer below the needed threshold?
- How do the two protocols compare?

## Submission

Report describing implementation, experiments, fidelity testing, and comparison of algorithms.""",
        "category": "cs238b",
        "difficulty": "Expert",
        "max_qubits": 8,
        "max_gate_count": 100,
        "max_circuit_depth": 50,
        "min_fidelity": 0.0,
        "target_fidelity": 1.0,
        "fidelity_metric": "bell_fidelity",
        "test_cases": [
            {"id": "tc-bbpssw", "name": "BBPSSW Protocol", "weight": 35, "isHidden": False},
            {"id": "tc-dejmps", "name": "DEJMPS Protocol", "weight": 35, "isHidden": False},
            {"id": "tc-comparison", "name": "Protocol Comparison", "weight": 30, "isHidden": False},
        ],
        "hints": [
            "Bell fidelity F = ⟨Φ⁺|ρ|Φ⁺⟩",
            "Threshold for BBPSSW: F > 0.5",
            "Use quantum state tomography for fidelity estimation",
            "IBM devices have varying error rates - choose carefully"
        ],
        "starter_code": """# State Distillation Experiment
from qiskit import QuantumCircuit, transpile
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
from qiskit.quantum_info import state_fidelity, DensityMatrix
import numpy as np

# Bell state |Φ⁺⟩ = (|00⟩ + |11⟩)/√2
def create_bell_pair():
    \"\"\"Create a Bell pair circuit.\"\"\"
    qc = QuantumCircuit(2)
    qc.h(0)
    qc.cx(0, 1)
    return qc

def measure_bell_fidelity(qc, shots=8192):
    \"\"\"
    Estimate fidelity with |Φ⁺⟩ using measurement statistics.

    For |Φ⁺⟩, ideal measurement gives:
    - P(00) = P(11) = 0.5
    - P(01) = P(10) = 0

    Bell fidelity can be estimated from correlations.
    \"\"\"
    # TODO: Implement fidelity estimation
    # Method 1: Direct measurement
    # Method 2: State tomography
    pass

def bbpssw_protocol(pair1, pair2):
    \"\"\"
    Implement BBPSSW entanglement distillation.

    Bennett et al., 1996:
    1. Apply CNOT from pair1 to pair2 (on both Alice and Bob sides)
    2. Measure pair2
    3. Keep pair1 only if measurements agree

    Args:
        pair1, pair2: Two noisy Bell pairs (qubit indices)

    Returns:
        QuantumCircuit implementing the protocol
    \"\"\"
    qc = QuantumCircuit(4, 2)  # 4 qubits, measure 2

    # Alice's qubits: 0, 2
    # Bob's qubits: 1, 3

    # Bilateral CNOT
    qc.cx(0, 2)  # Alice's CNOT
    qc.cx(1, 3)  # Bob's CNOT

    # Measure the target pair
    qc.measure([2, 3], [0, 1])

    # Post-select: keep only if results agree
    # TODO: Implement classical post-processing

    return qc

def dejmps_protocol(pair1, pair2):
    \"\"\"
    Implement DEJMPS entanglement distillation.

    Deutsch et al., 1996:
    Similar to BBPSSW but with basis rotations.

    Args:
        pair1, pair2: Two noisy Bell pairs

    Returns:
        QuantumCircuit implementing the protocol
    \"\"\"
    qc = QuantumCircuit(4, 2)

    # TODO: Implement DEJMPS protocol
    # 1. Rotate to different basis
    # 2. Bilateral CNOT
    # 3. Measure and post-select

    return qc

# Main experiment
# service = QiskitRuntimeService(channel='ibm_quantum')
# backend = service.least_busy(operational=True, simulator=False)

# Step 1: Characterize noisy Bell pairs
print("Creating noisy Bell pairs...")

# Step 2: Run BBPSSW distillation
print("Running BBPSSW protocol...")

# Step 3: Run DEJMPS distillation
print("Running DEJMPS protocol...")

# Step 4: Compare fidelities
print("Comparing fidelities...")
""",
        "author": "Prof. Jens Palsberg",
        "tags": ["cs238b", "distillation", "bell-pairs", "ibm-quantum", "entanglement"],
        "max_score": 100,
        "time_bonus": False,
        "order": 109,
    },
    {
        "id": "cs238b-approximate-toffoli",
        "title": "Approximate Toffoli Gate",
        "description": """## Problem

Design a circuit synthesizer that approximates the Toffoli gate using a restricted gate set and qubit connectivity.

## Constraints

1. **Qubits**: 3 qubits with connectivity A — B — C
   - A and B are control qubits, C is target
   - A-B connected, B-C connected, A-C NOT connected
2. **Gates allowed**:
   - Exactly 7 CNOT (C(X)) gates
   - Any number of 1-qubit gates
   - No other 2-qubit gates
3. **2-qubit operations**: Only between adjacent qubits (A-B or B-C)

## Objective

Minimize the Hilbert-Schmidt distance between your circuit and the true Toffoli:

d_HS(U, V) = √(1 - |Tr(U†V)|²/d²)

where d = 2ⁿ = 8 for 3 qubits.

## Submission

Submit your synthesizer program and a report with:
- Design explanation
- Experimental results
- Final Hilbert-Schmidt distance achieved""",
        "category": "cs238b",
        "difficulty": "Expert",
        "max_qubits": 3,
        "max_gate_count": 50,
        "max_circuit_depth": 30,
        "min_fidelity": 0.0,
        "target_fidelity": 1.0,
        "fidelity_metric": "hilbert_schmidt",
        "test_cases": [
            {"id": "tc-connectivity", "name": "Respects Connectivity", "weight": 20, "isHidden": False},
            {"id": "tc-cnot-count", "name": "Exactly 7 CNOTs", "weight": 20, "isHidden": False},
            {"id": "tc-hs-distance", "name": "Hilbert-Schmidt Distance", "weight": 60, "isHidden": False},
        ],
        "hints": [
            "The exact Toffoli requires more than 7 CNOTs with linear connectivity",
            "Use numerical optimization (gradient descent, BFGS) for single-qubit rotations",
            "Parameterize 1-qubit gates as U3(θ, φ, λ)",
            "Consider alternating CNOT and rotation layers"
        ],
        "starter_code": """# Approximate Toffoli Circuit Synthesizer
from qiskit import QuantumCircuit
from qiskit.quantum_info import Operator
import numpy as np
from scipy.optimize import minimize

# True Toffoli gate matrix
TOFFOLI = np.array([
    [1, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 1, 0],
])

def hilbert_schmidt_distance(U, V):
    \"\"\"
    Compute Hilbert-Schmidt distance between unitaries.

    d_HS = √(1 - |Tr(U†V)|²/d²)
    \"\"\"
    d = U.shape[0]
    inner = np.abs(np.trace(U.conj().T @ V))**2 / d**2
    return np.sqrt(max(0, 1 - inner))

def create_approximate_toffoli(params):
    \"\"\"
    Create approximate Toffoli circuit with given parameters.

    Architecture: Alternating 1-qubit rotations and CNOTs
    Connectivity: A(0) — B(1) — C(2)

    Args:
        params: Array of rotation angles

    Returns:
        QuantumCircuit with exactly 7 CNOTs
    \"\"\"
    qc = QuantumCircuit(3)

    # Qubits: A=0, B=1, C=2
    # Allowed CNOTs: (0,1), (1,0), (1,2), (2,1)

    param_idx = 0

    # Example structure (customize this):
    # Layer 1: Single-qubit rotations
    for q in range(3):
        qc.u(params[param_idx], params[param_idx+1], params[param_idx+2], q)
        param_idx += 3

    # CNOT 1
    qc.cx(0, 1)

    # Layer 2: Rotations
    for q in range(3):
        qc.u(params[param_idx], params[param_idx+1], params[param_idx+2], q)
        param_idx += 3

    # CNOT 2
    qc.cx(1, 2)

    # ... Continue with 5 more CNOTs and rotation layers
    # TODO: Design the full circuit structure

    return qc

def count_cnots(qc):
    \"\"\"Count CNOT gates in circuit.\"\"\"
    return sum(1 for inst in qc.data if inst.operation.name == 'cx')

def objective(params):
    \"\"\"Objective function: Hilbert-Schmidt distance to Toffoli.\"\"\"
    qc = create_approximate_toffoli(params)
    U = Operator(qc).data
    return hilbert_schmidt_distance(U, TOFFOLI)

def synthesize_approximate_toffoli():
    \"\"\"
    Main synthesizer: optimize parameters to minimize HS distance.
    \"\"\"
    # Number of parameters depends on circuit structure
    n_params = 60  # Adjust based on your architecture

    # Random initial parameters
    x0 = np.random.uniform(0, 2*np.pi, n_params)

    # Optimize
    result = minimize(objective, x0, method='L-BFGS-B',
                     options={'maxiter': 1000})

    # Get final circuit
    qc = create_approximate_toffoli(result.x)

    # Verify constraints
    n_cnots = count_cnots(qc)
    hs_dist = result.fun

    print(f"CNOTs used: {n_cnots}")
    print(f"Hilbert-Schmidt distance: {hs_dist:.6f}")

    return qc, hs_dist

# Run synthesizer
best_circuit, best_distance = synthesize_approximate_toffoli()
print(best_circuit.draw())
""",
        "author": "Prof. Jens Palsberg",
        "tags": ["cs238b", "circuit-synthesis", "toffoli", "optimization"],
        "max_score": 100,
        "time_bonus": False,
        "order": 110,
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

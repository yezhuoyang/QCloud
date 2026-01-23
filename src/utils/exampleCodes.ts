export interface Example {
  id: string
  name: string
  description: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  code: string
}

export interface Category {
  id: string
  name: string
  description: string
  icon: string
  examples: Example[]
}

export const QUANTUM_APPLICATIONS: Category[] = [
  {
    id: 'grover',
    name: "Grover's Algorithm",
    description: 'Quantum search algorithm providing quadratic speedup for unstructured search problems',
    icon: '🔍',
    examples: [
      {
        id: 'grover-2qubit',
        name: '2-Qubit Search',
        description: 'Search for |11⟩ state in a 2-qubit system',
        difficulty: 'Beginner',
        code: `# Grover's Algorithm - 2 Qubit Search for |11⟩
# This circuit searches for the state |11⟩ among 4 possible states

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
`
      },
      {
        id: 'grover-3qubit',
        name: '3-Qubit Search',
        description: 'Search for |101⟩ state in a 3-qubit system',
        difficulty: 'Intermediate',
        code: `# Grover's Algorithm - 3 Qubit Search for |101⟩
# Searching among 8 possible states

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
`
      },
      {
        id: 'grover-multi-target',
        name: 'Multi-Target Search',
        description: 'Search for multiple marked states simultaneously',
        difficulty: 'Advanced',
        code: `# Grover's Algorithm - Multi-Target Search
# Search for both |01⟩ and |10⟩ states

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
`
      }
    ]
  },
  {
    id: 'shor',
    name: "Shor's Algorithm",
    description: 'Quantum algorithm for integer factorization with exponential speedup',
    icon: '🔐',
    examples: [
      {
        id: 'shor-period-finding',
        name: 'Period Finding (N=15)',
        description: 'Quantum period finding subroutine for factoring 15',
        difficulty: 'Advanced',
        code: `# Shor's Algorithm - Period Finding for N=15
# Demonstrates the quantum part of Shor's algorithm

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
qc.cp(-pi/2, 0, 1)
qc.cp(-pi/4, 0, 2)
qc.h(1)
qc.cp(-pi/2, 1, 2)
qc.h(2)

# Measure
qc.measure(range(n_count), range(n_count))
`
      },
      {
        id: 'shor-qft',
        name: 'Quantum Fourier Transform',
        description: 'QFT circuit - key component of Shor\'s algorithm',
        difficulty: 'Intermediate',
        code: `# Quantum Fourier Transform (QFT)
# Essential subroutine for Shor's algorithm

def qft_circuit(n):
    """Create QFT circuit for n qubits"""
    qc = QuantumCircuit(n)

    for i in range(n):
        qc.h(i)
        for j in range(i + 1, n):
            qc.cp(pi / 2**(j - i), i, j)

    # Swap qubits for correct ordering
    for i in range(n // 2):
        qc.swap(i, n - i - 1)

    return qc

# Create 4-qubit QFT
n = 4
qft = qft_circuit(n)

# Test circuit: Apply QFT to |5⟩ = |0101⟩
qc = QuantumCircuit(n, n)
qc.x(0)  # Set to |0101⟩
qc.x(2)
qc.barrier()
qc.compose(qft, inplace=True)
qc.measure(range(n), range(n))
`
      },
      {
        id: 'shor-modular-exp',
        name: 'Modular Exponentiation',
        description: 'Quantum modular exponentiation circuit',
        difficulty: 'Advanced',
        code: `# Modular Exponentiation for Shor's Algorithm
# Computes a^x mod N in superposition

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
`
      }
    ]
  },
  {
    id: 'hhl',
    name: 'HHL Algorithm',
    description: 'Quantum algorithm for solving linear systems of equations',
    icon: '📊',
    examples: [
      {
        id: 'hhl-2x2',
        name: '2x2 Linear System',
        description: 'Solve a simple 2x2 system Ax=b',
        difficulty: 'Advanced',
        code: `# HHL Algorithm - 2x2 Linear System
# Solves Ax = b for a 2x2 Hermitian matrix

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
qc.cry(pi/4, 1, 3)
qc.cry(pi/8, 2, 3)

# Inverse phase estimation
qc.h(1)
qc.h(2)

# Measure ancilla to post-select successful runs
qc.measure(3, 0)
`
      },
      {
        id: 'hhl-phase-estimation',
        name: 'Eigenvalue Estimation',
        description: 'Phase estimation component of HHL',
        difficulty: 'Intermediate',
        code: `# Eigenvalue Estimation for HHL
# Estimates eigenvalues of a Hermitian matrix

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
    qc.cp(pi/4, 0, 3)
    qc.cp(pi/2, 1, 3)
    qc.cp(pi, 2, 3)

    # Inverse QFT on counting register
    qc.swap(0, 2)
    qc.h(0)
    qc.cp(-pi/2, 0, 1)
    qc.cp(-pi/4, 0, 2)
    qc.h(1)
    qc.cp(-pi/2, 1, 2)
    qc.h(2)

    # Measure counting register
    qc.measure([0, 1, 2], [0, 1, 2])

    return qc

qc = create_eigenvalue_circuit()
`
      },
      {
        id: 'hhl-controlled-rotation',
        name: 'Controlled Rotation',
        description: 'Eigenvalue inversion through controlled rotation',
        difficulty: 'Intermediate',
        code: `# Controlled Rotation for HHL
# Inverts eigenvalues using controlled Y-rotations

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
    qc.mcry(pi/2, [0, 1], 2)  # Large rotation for small λ
    qc.x(0)
    qc.x(1)

    qc.mcry(pi/8, [0, 1], 2)  # Small rotation for large λ

    # Measure
    qc.measure([1, 2], [0, 1])

    return qc

qc = controlled_rotation_circuit()
`
      }
    ]
  },
  {
    id: 'hamiltonian',
    name: 'Hamiltonian Simulation',
    description: 'Simulate quantum systems and their time evolution',
    icon: '⚛️',
    examples: [
      {
        id: 'ham-single-qubit',
        name: 'Single Qubit Evolution',
        description: 'Time evolution under a single-qubit Hamiltonian',
        difficulty: 'Beginner',
        code: `# Single Qubit Hamiltonian Simulation
# Simulates H = σ_z (Pauli-Z Hamiltonian)

# Time evolution: e^(-i*σ_z*t) = Rz(2t)
t = pi/2  # Evolution time

qc = QuantumCircuit(1, 1)

# Prepare superposition state
qc.h(0)

# Time evolution: e^(-i*σ_z*t) = Rz(2t)
qc.rz(2*t, 0)

# Measure in X basis to see oscillation
qc.h(0)
qc.measure(0, 0)
`
      },
      {
        id: 'ham-ising',
        name: 'Ising Model',
        description: 'Two-qubit Ising interaction simulation',
        difficulty: 'Intermediate',
        code: `# Ising Model Simulation
# H = J*σ_z⊗σ_z + h*(σ_x⊗I + I⊗σ_x)

# Parameters
J = 1.0   # Coupling strength
h = 0.5   # Transverse field
t = pi/2  # Evolution time
steps = 4 # Trotter steps

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
`
      },
      {
        id: 'ham-heisenberg',
        name: 'Heisenberg Model',
        description: 'XXX Heisenberg spin chain simulation',
        difficulty: 'Advanced',
        code: `# Heisenberg XXX Model Simulation
# H = J*(σ_x⊗σ_x + σ_y⊗σ_y + σ_z⊗σ_z)

# Parameters
J = 1.0
t = pi/4
steps = 2
dt = t / steps

qc = QuantumCircuit(2, 2)

# Start with |01⟩ to see spin exchange
qc.x(1)
qc.barrier()

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
`
      },
      {
        id: 'ham-vqe',
        name: 'VQE Ansatz',
        description: 'Variational ansatz for ground state finding',
        difficulty: 'Intermediate',
        code: `# VQE Ansatz for Hamiltonian Ground State
# Variational circuit for finding ground state energy

# Example parameters (would be optimized in real VQE)
params = [pi/4, pi/3, pi/6, pi/5, pi/7, pi/8, pi/9, pi/10]

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

# Measure in Z basis
qc.measure([0, 1], [0, 1])
`
      }
    ]
  }
]

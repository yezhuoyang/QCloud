import {
  CompetitionProblem,
  CompetitionCategory,
  ProblemCategory,
  ProblemDifficulty,
  DIFFICULTY_COLORS
} from '../types/competition'

// Competition categories
export const COMPETITION_CATEGORIES: CompetitionCategory[] = [
  {
    id: 'grover',
    name: "Grover's Search",
    description: 'Implement quantum search algorithms to find marked states',
    icon: '🔍',
    problemCount: 2,
    color: 'blue'
  },
  {
    id: 'vqe',
    name: 'VQE & Variational',
    description: 'Variational quantum algorithms for optimization',
    icon: '📊',
    problemCount: 1,
    color: 'purple'
  },
  {
    id: 'error',
    name: 'Error Correction',
    description: 'Quantum error correction codes and fault tolerance',
    icon: '🛡️',
    problemCount: 1,
    color: 'red'
  },
  {
    id: 'optimization',
    name: 'QAOA & Optimization',
    description: 'Quantum approximate optimization algorithms',
    icon: '⚡',
    problemCount: 1,
    color: 'amber'
  },
  {
    id: 'shor',
    name: 'Quantum Fourier',
    description: "Shor's algorithm and quantum phase estimation",
    icon: '🔢',
    problemCount: 1,
    color: 'indigo'
  }
]

// Competition problems
export const COMPETITION_PROBLEMS: CompetitionProblem[] = [
  // Grover's Search - Easy
  {
    id: 'grover-2qubit-basic',
    title: 'Find the Marked State',
    description: `## Problem

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
\`\`\`
H ⊗ H → X ⊗ X → CZ → X ⊗ X → H ⊗ H
\`\`\``,
    category: 'grover',
    difficulty: 'Easy',
    constraints: {
      maxQubits: 3,
      maxGateCount: 25,
      maxCircuitDepth: 20
    },
    fidelityRequirement: {
      minFidelity: 0.9,
      targetFidelity: 0.99,
      metric: 'probability_overlap'
    },
    testCases: [
      {
        id: 'tc-00',
        name: 'Find |00⟩',
        input: {
          oracleSpec: {
            type: 'phase',
            description: 'Oracle marks |00⟩',
            markedStates: ['00']
          }
        },
        expectedOutput: {
          targetStates: ['00'],
          targetProbabilities: { '00': 0.9 }
        },
        isHidden: false,
        weight: 25
      },
      {
        id: 'tc-11',
        name: 'Find |11⟩',
        input: {
          oracleSpec: {
            type: 'phase',
            description: 'Oracle marks |11⟩',
            markedStates: ['11']
          }
        },
        expectedOutput: {
          targetStates: ['11'],
          targetProbabilities: { '11': 0.9 }
        },
        isHidden: false,
        weight: 25
      },
      {
        id: 'tc-01',
        name: 'Find |01⟩',
        input: {
          oracleSpec: {
            type: 'phase',
            description: 'Oracle marks |01⟩',
            markedStates: ['01']
          }
        },
        expectedOutput: {
          targetStates: ['01'],
          targetProbabilities: { '01': 0.9 }
        },
        isHidden: true,
        weight: 25
      },
      {
        id: 'tc-10',
        name: 'Find |10⟩',
        input: {
          oracleSpec: {
            type: 'phase',
            description: 'Oracle marks |10⟩',
            markedStates: ['10']
          }
        },
        expectedOutput: {
          targetStates: ['10'],
          targetProbabilities: { '10': 0.9 }
        },
        isHidden: true,
        weight: 25
      }
    ],
    hints: [
      'Start by putting all qubits in equal superposition with H gates',
      'For 2 qubits, only one Grover iteration is needed',
      'The diffusion operator reflects amplitudes about their mean',
      'Remember: Oracle flips phase, Diffusion amplifies marked state'
    ],
    starterCode: `# Grover's Algorithm - 2 Qubit Search
# Only define your quantum circuit - imports and simulation handled automatically

def grover_circuit(oracle):
    """
    Implement Grover's algorithm to find the marked state.

    Args:
        oracle: A function that takes (qc, qubits) and applies the oracle

    Returns:
        QuantumCircuit: Complete Grover circuit with measurements
    """
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
`,
    author: 'QCloud Team',
    createdAt: '2024-01-15',
    tags: ['grover', 'search', 'oracle', 'beginner'],
    solveCount: 142,
    attemptCount: 523,
    maxScore: 100,
    timeBonus: false
  },

  // Grover's Search - Medium
  {
    id: 'grover-3qubit-multi',
    title: 'Multi-Target Quantum Search',
    description: `## Problem

Implement Grover's algorithm for a 3-qubit system with multiple marked states.

## Background

When there are multiple marked states, Grover's algorithm still works but requires a different number of iterations. For k marked states out of N total states, the optimal number of iterations is approximately (π/4)√(N/k).

## Input

Your circuit will be tested with an oracle that marks exactly 2 states out of 8.

## Output

Your circuit should measure one of the marked states with total probability ≥ 85%.

## Challenge

With 2 marked states out of 8, the optimal number of iterations is approximately 1.`,
    category: 'grover',
    difficulty: 'Medium',
    constraints: {
      maxQubits: 4,
      maxGateCount: 50,
      maxCircuitDepth: 35
    },
    fidelityRequirement: {
      minFidelity: 0.85,
      targetFidelity: 0.95,
      metric: 'probability_overlap'
    },
    testCases: [
      {
        id: 'tc-multi-1',
        name: 'Find |001⟩ or |110⟩',
        input: {
          oracleSpec: {
            type: 'phase',
            description: 'Oracle marks |001⟩ and |110⟩',
            markedStates: ['001', '110']
          }
        },
        expectedOutput: {
          targetStates: ['001', '110'],
          targetProbabilities: { '001': 0.4, '110': 0.4 }
        },
        isHidden: false,
        weight: 50
      },
      {
        id: 'tc-multi-2',
        name: 'Find |000⟩ or |111⟩',
        input: {
          oracleSpec: {
            type: 'phase',
            description: 'Oracle marks |000⟩ and |111⟩',
            markedStates: ['000', '111']
          }
        },
        expectedOutput: {
          targetStates: ['000', '111'],
          targetProbabilities: { '000': 0.4, '111': 0.4 }
        },
        isHidden: true,
        weight: 50
      }
    ],
    hints: [
      'For k=2 marked states out of N=8, use approximately 1 iteration',
      'The 3-qubit diffusion operator is similar to 2-qubit but larger',
      'Multi-controlled Z gate can be decomposed using Toffoli and CNOT'
    ],
    starterCode: `# Grover's Algorithm - 3 Qubit Multi-Target Search
# Only define your quantum circuit - imports and simulation handled automatically

def grover_multi_target(oracle):
    """
    Implement Grover's algorithm for multiple marked states.

    Args:
        oracle: A function that marks multiple target states

    Returns:
        QuantumCircuit: Complete Grover circuit
    """
    qc = QuantumCircuit(3, 3)

    # Your implementation here

    qc.measure([0, 1, 2], [0, 1, 2])
    return qc
`,
    author: 'QCloud Team',
    createdAt: '2024-01-20',
    tags: ['grover', 'search', 'multi-target', 'intermediate'],
    solveCount: 67,
    attemptCount: 289,
    maxScore: 100,
    timeBonus: true
  },

  // VQE - Medium
  {
    id: 'vqe-h2-ground',
    title: 'H₂ Ground State Energy',
    description: `## Problem

Use the Variational Quantum Eigensolver (VQE) approach to prepare a quantum state that approximates the ground state of the hydrogen molecule (H₂).

## Background

VQE is a hybrid quantum-classical algorithm used to find the ground state energy of molecules. It uses a parameterized quantum circuit (ansatz) and classical optimization to minimize the energy expectation value.

For H₂ at bond distance 0.735 Å, the Hamiltonian can be mapped to a 2-qubit system:

\`H = g₀I + g₁Z₀ + g₂Z₁ + g₃Z₀Z₁ + g₄X₀X₁ + g₅Y₀Y₁\`

The exact ground state energy is approximately **-1.137 Hartree**.

## Requirements

Design a variational ansatz that can prepare a state with energy within **0.1 Hartree** of the exact ground state.

## Ansatz Suggestions

A simple but effective ansatz is:
\`\`\`
|ψ(θ)⟩ = RY(θ₁)|0⟩ ⊗ RY(θ₂)|0⟩ → CNOT → RY(θ₃) ⊗ RY(θ₄)
\`\`\``,
    category: 'vqe',
    difficulty: 'Medium',
    constraints: {
      maxQubits: 2,
      maxGateCount: 20,
      maxCircuitDepth: 15
    },
    fidelityRequirement: {
      minFidelity: 0.0,  // Energy-based metric
      targetFidelity: 0.0,
      metric: 'expectation_value'
    },
    testCases: [
      {
        id: 'tc-h2-energy',
        name: 'H₂ Ground State Energy',
        input: {
          parameters: { bond_distance: 0.735 }
        },
        expectedOutput: {
          expectedValue: -1.137,
          tolerance: 0.1
        },
        isHidden: false,
        weight: 100
      }
    ],
    hints: [
      'The RY-CNOT-RY ansatz is simple but powerful for H₂',
      'You need to find optimal rotation angles through classical optimization',
      'The state |01⟩ - |10⟩ (singlet state) is close to the ground state'
    ],
    starterCode: `# VQE for H2 Ground State
# Only define your quantum circuit - imports and simulation handled automatically

def vqe_ansatz(params):
    """
    Create a parameterized ansatz for VQE.

    Args:
        params: List of rotation angles [theta1, theta2, ...]

    Returns:
        QuantumCircuit: Parameterized ansatz circuit
    """
    qc = QuantumCircuit(2)

    # Example: Simple RY-CNOT ansatz
    # qc.ry(params[0], 0)
    # qc.ry(params[1], 1)
    # qc.cx(0, 1)

    # Your implementation here

    return qc

# Optimal parameters (to be found via classical optimization)
# Expected energy: -1.137 Hartree
`,
    author: 'QCloud Team',
    createdAt: '2024-01-25',
    tags: ['vqe', 'chemistry', 'optimization', 'variational'],
    solveCount: 45,
    attemptCount: 198,
    maxScore: 100,
    timeBonus: true
  },

  // Error Correction - Hard
  {
    id: 'error-3qubit-bitflip',
    title: 'Three-Qubit Bit-Flip Code',
    description: `## Problem

Implement the 3-qubit bit-flip error correction code that can detect and correct a single X (bit-flip) error on any of the three qubits.

## Background

The 3-qubit bit-flip code encodes a single logical qubit into 3 physical qubits:

- |0⟩_L = |000⟩
- |1⟩_L = |111⟩

Using majority voting, a single bit-flip error can be detected and corrected.

## Encoding

\`\`\`
|ψ⟩ = α|0⟩ + β|1⟩  →  α|000⟩ + β|111⟩
\`\`\`

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
3. Decode back to the original state`,
    category: 'error',
    difficulty: 'Hard',
    constraints: {
      maxQubits: 5,
      maxGateCount: 30,
      maxCircuitDepth: 25
    },
    fidelityRequirement: {
      minFidelity: 0.95,
      targetFidelity: 0.99,
      metric: 'state_fidelity'
    },
    testCases: [
      {
        id: 'tc-no-error',
        name: 'No Error',
        input: {
          inputState: '|+⟩',
          parameters: { error_qubit: -1 }
        },
        expectedOutput: {
          targetStates: ['0', '1'],
          targetProbabilities: { '0': 0.5, '1': 0.5 }
        },
        isHidden: false,
        weight: 25
      },
      {
        id: 'tc-error-q0',
        name: 'Error on Qubit 0',
        input: {
          inputState: '|0⟩',
          parameters: { error_qubit: 0 }
        },
        expectedOutput: {
          targetStates: ['0'],
          targetProbabilities: { '0': 0.95 }
        },
        isHidden: false,
        weight: 25
      },
      {
        id: 'tc-error-q1',
        name: 'Error on Qubit 1',
        input: {
          inputState: '|1⟩',
          parameters: { error_qubit: 1 }
        },
        expectedOutput: {
          targetStates: ['1'],
          targetProbabilities: { '1': 0.95 }
        },
        isHidden: true,
        weight: 25
      },
      {
        id: 'tc-error-q2',
        name: 'Error on Qubit 2',
        input: {
          inputState: '|+⟩',
          parameters: { error_qubit: 2 }
        },
        expectedOutput: {
          targetStates: ['0', '1'],
          targetProbabilities: { '0': 0.47, '1': 0.47 }
        },
        isHidden: true,
        weight: 25
      }
    ],
    hints: [
      'Encoding: CNOT from qubit 0 to qubit 1, then CNOT from qubit 0 to qubit 2',
      'Syndrome measurement uses ancilla qubits and controlled operations',
      'Correction is conditional on the syndrome measurement results'
    ],
    starterCode: `# 3-Qubit Bit-Flip Error Correction Code
# Only define your quantum circuit - imports and simulation handled automatically

def bit_flip_code():
    """
    Implement the 3-qubit bit-flip error correction code.

    Returns:
        QuantumCircuit: Complete encoding, error detection, and correction circuit
    """
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
`,
    author: 'QCloud Team',
    createdAt: '2024-02-01',
    tags: ['error-correction', 'bit-flip', 'syndrome', 'advanced'],
    solveCount: 23,
    attemptCount: 156,
    maxScore: 100,
    timeBonus: false
  },

  // QAOA - Hard
  {
    id: 'qaoa-maxcut-3node',
    title: 'MaxCut with QAOA',
    description: `## Problem

Use the Quantum Approximate Optimization Algorithm (QAOA) to solve the MaxCut problem on a simple 3-node graph.

## Background

MaxCut: Given a graph, partition the vertices into two sets to maximize the number of edges between the sets.

QAOA alternates between:
1. **Cost layer**: Encodes the problem (ZZ interactions for each edge)
2. **Mixer layer**: Enables exploration (X rotations on all qubits)

## Graph

\`\`\`
    (0)
   /   \\
  /     \\
(1)-----(2)
\`\`\`

A triangle graph with 3 nodes and 3 edges.

## Optimal Solutions

The maximum cut has value 2 (cut 2 edges). Optimal solutions: |001⟩, |010⟩, |011⟩, |100⟩, |101⟩, |110⟩

## Requirements

Implement a QAOA circuit with at least 1 layer (p=1) that finds a maximum cut with probability ≥ 60%.`,
    category: 'optimization',
    difficulty: 'Hard',
    constraints: {
      maxQubits: 3,
      maxGateCount: 40,
      maxCircuitDepth: 30
    },
    fidelityRequirement: {
      minFidelity: 0.6,
      targetFidelity: 0.9,
      metric: 'probability_overlap'
    },
    testCases: [
      {
        id: 'tc-triangle',
        name: 'Triangle Graph MaxCut',
        input: {
          parameters: {
            edges: [[0, 1], [1, 2], [0, 2]]
          }
        },
        expectedOutput: {
          targetStates: ['001', '010', '011', '100', '101', '110'],
          targetProbabilities: {
            '001': 0.1, '010': 0.1, '011': 0.1,
            '100': 0.1, '101': 0.1, '110': 0.1
          }
        },
        isHidden: false,
        weight: 100
      }
    ],
    hints: [
      'The cost Hamiltonian uses ZZ interactions: exp(-iγ Z_i Z_j) for each edge',
      'The mixer uses RX gates: exp(-iβ X_i) for each qubit',
      'Start in uniform superposition using H gates',
      'Typical good parameters for p=1: γ ≈ π/4, β ≈ π/4'
    ],
    starterCode: `# QAOA for MaxCut
# Only define your quantum circuit - imports and simulation handled automatically

def qaoa_maxcut(gamma, beta, edges):
    """
    Implement QAOA for the MaxCut problem.

    Args:
        gamma: Cost layer parameter
        beta: Mixer layer parameter
        edges: List of edges [(i,j), ...]

    Returns:
        QuantumCircuit: QAOA circuit for MaxCut
    """
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
`,
    author: 'QCloud Team',
    createdAt: '2024-02-05',
    tags: ['qaoa', 'optimization', 'maxcut', 'variational'],
    solveCount: 31,
    attemptCount: 187,
    maxScore: 100,
    timeBonus: true
  },

  // Quantum Phase Estimation - Expert
  {
    id: 'qpe-basic',
    title: 'Quantum Phase Estimation',
    description: `## Problem

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

The measurement should give |001⟩ (representing 1/8) with high probability.`,
    category: 'shor',
    difficulty: 'Expert',
    constraints: {
      maxQubits: 4,
      maxGateCount: 60,
      maxCircuitDepth: 45
    },
    fidelityRequirement: {
      minFidelity: 0.8,
      targetFidelity: 0.95,
      metric: 'probability_overlap'
    },
    testCases: [
      {
        id: 'tc-t-gate',
        name: 'T Gate Phase (θ=1/8)',
        input: {
          parameters: { unitary: 'T', target_phase: 0.125 }
        },
        expectedOutput: {
          targetStates: ['001'],
          targetProbabilities: { '001': 0.8 }
        },
        isHidden: false,
        weight: 50
      },
      {
        id: 'tc-s-gate',
        name: 'S Gate Phase (θ=1/4)',
        input: {
          parameters: { unitary: 'S', target_phase: 0.25 }
        },
        expectedOutput: {
          targetStates: ['010'],
          targetProbabilities: { '010': 0.8 }
        },
        isHidden: true,
        weight: 50
      }
    ],
    hints: [
      'Controlled-T can be implemented directly in Qiskit',
      'The inverse QFT includes swap gates and controlled rotations',
      'For T^(2^k), you need k applications of controlled-T',
      'Remember to reverse bit order in measurement interpretation'
    ],
    starterCode: `# Quantum Phase Estimation
# Only define your quantum circuit - imports and simulation handled automatically

def qpe_circuit(n_ancilla=3):
    """
    Implement Quantum Phase Estimation for the T gate.

    Args:
        n_ancilla: Number of ancilla qubits for precision

    Returns:
        QuantumCircuit: QPE circuit
    """
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
`,
    author: 'QCloud Team',
    createdAt: '2024-02-10',
    tags: ['qpe', 'phase-estimation', 'qft', 'expert'],
    solveCount: 12,
    attemptCount: 98,
    maxScore: 100,
    timeBonus: true
  }
]

// Helper functions

export function getProblemsByCategory(category: ProblemCategory): CompetitionProblem[] {
  return COMPETITION_PROBLEMS.filter(p => p.category === category)
}

export function getProblemById(id: string): CompetitionProblem | undefined {
  return COMPETITION_PROBLEMS.find(p => p.id === id)
}

export function getCategoryById(id: ProblemCategory): CompetitionCategory | undefined {
  return COMPETITION_CATEGORIES.find(c => c.id === id)
}

export function getDifficultyColor(difficulty: ProblemDifficulty): string {
  const colors = DIFFICULTY_COLORS[difficulty]
  return `${colors.bg} ${colors.text} ${colors.border}`
}

export function getSolveRate(problem: CompetitionProblem): number {
  if (problem.attemptCount === 0) return 0
  return Math.round((problem.solveCount / problem.attemptCount) * 100)
}

export function getProblemsStats() {
  return {
    totalProblems: COMPETITION_PROBLEMS.length,
    byDifficulty: {
      Easy: COMPETITION_PROBLEMS.filter(p => p.difficulty === 'Easy').length,
      Medium: COMPETITION_PROBLEMS.filter(p => p.difficulty === 'Medium').length,
      Hard: COMPETITION_PROBLEMS.filter(p => p.difficulty === 'Hard').length,
      Expert: COMPETITION_PROBLEMS.filter(p => p.difficulty === 'Expert').length
    },
    byCategory: COMPETITION_CATEGORIES.map(c => ({
      category: c.id,
      count: COMPETITION_PROBLEMS.filter(p => p.category === c.id).length
    }))
  }
}

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
    id: 'cs238b',
    name: 'CS 238B Quantum Algorithms',
    description: 'UCLA CS 238B course homework by Prof. Jens Palsberg - Advanced quantum algorithm implementations',
    icon: '🎓',
    problemCount: 10,
    color: 'teal'
  },
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
   /   \
  /     \
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
  },

  // ============ CS 238B Quantum Algorithms Course ============
  {
    id: 'cs238b-gottesman-knill',
    title: 'Prove Gottesman-Knill Theorem',
    description: `## Problem

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

Submit your proof as a PDF file, preferably written in LaTeX.`,
    category: 'cs238b',
    difficulty: 'Hard',
    constraints: {
      maxQubits: 0,
      maxGateCount: 0,
      maxCircuitDepth: 0
    },
    fidelityRequirement: {
      minFidelity: 0.0,
      targetFidelity: 1.0,
      metric: 'probability_overlap'
    },
    testCases: [
      {
        id: 'tc-proof',
        name: 'Proof Completeness',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 100
      }
    ],
    hints: [
      'Start by defining the Pauli group and stabilizer states',
      'Show that Clifford gates map Pauli operators to Pauli operators',
      'The key insight is that n-qubit stabilizer states can be described by n generators',
      'Each generator requires O(n) bits to store'
    ],
    starterCode: `% LaTeX Template for Gottesman-Knill Proof
% Use standard LaTeX commands in your document

% Theorem: Gottesman-Knill
% Prove that Clifford circuits can be efficiently simulated classically

% Your proof here...
`,
    author: 'Prof. Jens Palsberg',
    createdAt: '2025-12-01',
    tags: ['cs238b', 'stabilizer', 'clifford', 'theory', 'proof'],
    solveCount: 0,
    attemptCount: 0,
    maxScore: 100,
    timeBonus: false
  },
  {
    id: 'cs238b-surface-code',
    title: 'Validation of Surface Code',
    description: `## Problem

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

## Submission

Submit a report describing your experiments, comparing outputs and running times.`,
    category: 'cs238b',
    difficulty: 'Hard',
    constraints: {
      maxQubits: 0,
      maxGateCount: 0,
      maxCircuitDepth: 0
    },
    fidelityRequirement: {
      minFidelity: 0.0,
      targetFidelity: 1.0,
      metric: 'probability_overlap'
    },
    testCases: [
      {
        id: 'tc-stim',
        name: 'Stim Implementation',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 40
      },
      {
        id: 'tc-scalerqec',
        name: 'ScaLERQEC Implementation',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 40
      },
      {
        id: 'tc-analysis',
        name: 'Statistical Analysis',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 20
      }
    ],
    hints: [
      'Install Stim with: pip install stim',
      'PyMatching is the default decoder in both tools',
      'Use enough samples to get tight confidence intervals',
      'The logical error rate should decrease with lower physical error rate'
    ],
    starterCode: `# Surface Code Validation
import stim
import numpy as np

def estimate_logical_error_rate(circuit, num_shots=10000):
    """
    Estimate the logical error rate of a surface code.
    """
    # TODO: Implement using Stim's sampler
    # TODO: Use PyMatching decoder
    pass

# Physical error rates to test
error_rates = [1e-3, 5e-4]

for p in error_rates:
    # TODO: Modify circuit with depolarizing noise
    # TODO: Run experiments
    pass`,
    author: 'Prof. Jens Palsberg',
    createdAt: '2025-12-01',
    tags: ['cs238b', 'surface-code', 'error-correction', 'stim'],
    solveCount: 0,
    attemptCount: 0,
    maxScore: 100,
    timeBonus: false
  },
  {
    id: 'cs238b-eigensolver',
    title: 'Build an Eigensolver',
    description: `## Problem

Implement the quantum eigensolver from the lecture notes and demonstrate that it works correctly for matrices up to size 16×16.

## Background

Quantum eigensolvers find eigenvalues and eigenvectors of matrices, which is fundamental to many quantum algorithms.

## Requirements

1. Implement the eigensolver algorithm from lecture notes
2. Test on matrices of sizes 2×2, 4×4, 8×8, and 16×16
3. Verify results against classical eigensolvers
4. Document precision and convergence behavior

## Submission

Submit your program together with a report detailing your implementation, experiments, and results.`,
    category: 'cs238b',
    difficulty: 'Medium',
    constraints: {
      maxQubits: 8,
      maxGateCount: 200,
      maxCircuitDepth: 100
    },
    fidelityRequirement: {
      minFidelity: 0.8,
      targetFidelity: 0.95,
      metric: 'probability_overlap'
    },
    testCases: [
      {
        id: 'tc-2x2',
        name: '2×2 Matrix',
        input: { parameters: { size: 2 } },
        expectedOutput: {},
        isHidden: false,
        weight: 20
      },
      {
        id: 'tc-4x4',
        name: '4×4 Matrix',
        input: { parameters: { size: 4 } },
        expectedOutput: {},
        isHidden: false,
        weight: 25
      },
      {
        id: 'tc-8x8',
        name: '8×8 Matrix',
        input: { parameters: { size: 8 } },
        expectedOutput: {},
        isHidden: true,
        weight: 25
      },
      {
        id: 'tc-16x16',
        name: '16×16 Matrix',
        input: { parameters: { size: 16 } },
        expectedOutput: {},
        isHidden: true,
        weight: 30
      }
    ],
    hints: [
      'Start with Quantum Phase Estimation as the core',
      'For n×n matrices, you need log₂(n) qubits to encode the eigenvector',
      'Use additional ancilla qubits for precision',
      'Verify eigenvalues: Av = λv'
    ],
    starterCode: `# Quantum Eigensolver
from qiskit import QuantumCircuit
import numpy as np

def quantum_eigensolver(matrix, n_precision_qubits=3):
    """
    Find eigenvalues of a unitary matrix using QPE.
    """
    n = int(np.log2(matrix.shape[0]))
    total_qubits = n_precision_qubits + n

    qc = QuantumCircuit(total_qubits, n_precision_qubits)

    # Initialize precision qubits in superposition
    for i in range(n_precision_qubits):
        qc.h(i)

    # TODO: Implement controlled unitary powers
    # TODO: Implement inverse QFT

    qc.measure(range(n_precision_qubits), range(n_precision_qubits))
    return qc`,
    author: 'Prof. Jens Palsberg',
    createdAt: '2025-12-01',
    tags: ['cs238b', 'eigensolver', 'qpe', 'phase-estimation'],
    solveCount: 0,
    attemptCount: 0,
    maxScore: 100,
    timeBonus: false
  },
  {
    id: 'cs238b-amplitude-amplification',
    title: 'Demonstrate Amplitude Amplification',
    description: `## Problem

Demonstrate an impressive use of amplitude amplification by designing and implementing a custom quantum search problem.

## Background

The baseline example uses a function f : {0,1}² → {0,1} where f(11) = 1 and f(x) = 0 otherwise. Amplitude amplification can boost the probability from 62.5% to 97.7%.

## Your Tasks

1. **Pick n**: Choose n ≥ 3 qubits
2. **Define g**: Create a function g : {0,1}ⁿ → {0,1} where g(x) = 1 for exactly one bitstring
3. **Define V**: Create a unitary V such that measuring gives g(x)=1 with probability 20-30%
4. **Amplify**: Show amplitude amplification boosts the success probability to >70%

## Requirements

- Demonstrate with quantum circuit simulation
- Show probability improvements clearly
- Explain your design choices`,
    category: 'cs238b',
    difficulty: 'Medium',
    constraints: {
      maxQubits: 8,
      maxGateCount: 100,
      maxCircuitDepth: 50
    },
    fidelityRequirement: {
      minFidelity: 0.7,
      targetFidelity: 0.9,
      metric: 'probability_overlap'
    },
    testCases: [
      {
        id: 'tc-initial',
        name: 'Initial Probability 20-30%',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 30
      },
      {
        id: 'tc-amplified',
        name: 'Amplified Probability >70%',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 50
      },
      {
        id: 'tc-complexity',
        name: 'Design Complexity',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 20
      }
    ],
    hints: [
      'For initial amplitude a, sin²(θ) = a gives the rotation angle',
      'Number of iterations: approximately π/(4θ) - 1/2',
      'The Grover diffusion operator: 2|ψ⟩⟨ψ| - I',
      'Design V carefully to achieve 20-30% initial probability'
    ],
    starterCode: `# Amplitude Amplification Demonstration
from qiskit import QuantumCircuit
import numpy as np

def create_initial_state(n_qubits, target_state):
    """Create a unitary V with 20-30% probability on target."""
    qc = QuantumCircuit(n_qubits)
    # TODO: Design V to achieve 20-30% probability
    return qc

def oracle(qc, n_qubits, target_state):
    """Apply oracle that marks the target state."""
    # TODO: Implement oracle
    pass

def diffusion(qc, n_qubits):
    """Apply the Grover diffusion operator."""
    # TODO: Implement diffusion
    pass`,
    author: 'Prof. Jens Palsberg',
    createdAt: '2025-12-01',
    tags: ['cs238b', 'amplitude-amplification', 'grover', 'search'],
    solveCount: 0,
    attemptCount: 0,
    maxScore: 100,
    timeBonus: false
  },
  {
    id: 'cs238b-block-encoding',
    title: 'Implement Block Encoding',
    description: `## Problem

Implement block encoding of banded circulant matrices as described in Camps et al.

## Background

A banded circulant matrix BCMₙ(α, β, γ) of size 2ⁿ × 2ⁿ is a structured sparse matrix.

## Parameters

Use: α = 0.2, β = 0.3, γ = 0.4

## Tasks

1. Implement block encoding of BCM₃(α, β, γ) (8×8 matrix)
2. Implement block encoding of BCM₄(α, β, γ) (16×16 matrix)
3. Verify implementations with simulation experiments

## Reference

Daan Camps et al., "Explicit Quantum Circuits for Block Encodings of Certain Sparse Matrices", 2022`,
    category: 'cs238b',
    difficulty: 'Hard',
    constraints: {
      maxQubits: 10,
      maxGateCount: 150,
      maxCircuitDepth: 80
    },
    fidelityRequirement: {
      minFidelity: 0.9,
      targetFidelity: 0.99,
      metric: 'probability_overlap'
    },
    testCases: [
      {
        id: 'tc-bcm3',
        name: 'BCM₃ Encoding',
        input: { parameters: { n: 3 } },
        expectedOutput: {},
        isHidden: false,
        weight: 50
      },
      {
        id: 'tc-bcm4',
        name: 'BCM₄ Encoding',
        input: { parameters: { n: 4 } },
        expectedOutput: {},
        isHidden: false,
        weight: 50
      }
    ],
    hints: [
      'Block encoding uses ancilla qubits to embed the matrix',
      'The matrix A appears in the upper-left block of a larger unitary',
      'Use the explicit circuit construction from Section 4.2',
      'Verify by extracting the matrix elements'
    ],
    starterCode: `# Block Encoding of Banded Circulant Matrices
from qiskit import QuantumCircuit
from qiskit.quantum_info import Operator
import numpy as np

def banded_circulant_matrix(n, alpha, beta, gamma):
    """Construct BCM_n(α, β, γ)."""
    size = 2**n
    matrix = np.zeros((size, size))
    for i in range(size):
        matrix[i, i] = alpha
        matrix[i, (i + 1) % size] = gamma
        matrix[i, (i - 1) % size] = beta
    return matrix

def block_encoding_circuit(n, alpha, beta, gamma):
    """Create block encoding circuit."""
    # TODO: Implement block encoding
    pass

# Parameters
alpha, beta, gamma = 0.2, 0.3, 0.4`,
    author: 'Prof. Jens Palsberg',
    createdAt: '2025-12-01',
    tags: ['cs238b', 'block-encoding', 'sparse-matrix', 'qsvt'],
    solveCount: 0,
    attemptCount: 0,
    maxScore: 100,
    timeBonus: false
  },
  {
    id: 'cs238b-trotter',
    title: 'Hamiltonian Simulation by Trotterization',
    description: `## Problem

Implement Hamiltonian simulation using the Trotter-Suzuki decomposition.

## Background

Given a Hamiltonian H = Σᵢ Hᵢ, time evolution e^(-iHt) can be approximated by:

**First-order Trotter:** e^(-iHt) ≈ (∏ᵢ e^(-iHᵢt/n))ⁿ

**Second-order Trotter:** Uses symmetric decomposition with error O(t³/n²)

## Requirements

1. Implement first and second order Trotterization
2. Test on a physically meaningful Hamiltonian (e.g., Heisenberg model)
3. Show convergence as number of Trotter steps increases
4. Compare with exact time evolution`,
    category: 'cs238b',
    difficulty: 'Medium',
    constraints: {
      maxQubits: 6,
      maxGateCount: 200,
      maxCircuitDepth: 100
    },
    fidelityRequirement: {
      minFidelity: 0.9,
      targetFidelity: 0.99,
      metric: 'state_fidelity'
    },
    testCases: [
      {
        id: 'tc-first-order',
        name: 'First-Order Trotter',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 30
      },
      {
        id: 'tc-second-order',
        name: 'Second-Order Trotter',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 30
      },
      {
        id: 'tc-convergence',
        name: 'Convergence Analysis',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 40
      }
    ],
    hints: [
      'For Pauli terms, e^(-iθP) can be implemented with basis change + RZ',
      'ZZ interaction: CNOT - RZ - CNOT',
      'XX interaction: H⊗H - ZZ - H⊗H',
      'Track fidelity with exact evolution computed classically'
    ],
    starterCode: `# Hamiltonian Simulation by Trotterization
from qiskit import QuantumCircuit
import numpy as np
from scipy.linalg import expm

def trotter_step_first_order(qc, terms, dt):
    """Apply one first-order Trotter step."""
    for coeff, pauli in terms:
        # TODO: Implement e^(-i * coeff * pauli * dt)
        pass

def trotter_simulation(n_qubits, hamiltonian_terms, t, n_steps, order=1):
    """Full Trotter simulation circuit."""
    qc = QuantumCircuit(n_qubits)
    dt = t / n_steps

    for _ in range(n_steps):
        trotter_step_first_order(qc, hamiltonian_terms, dt)

    return qc

# Example: 2-qubit Heisenberg model
heisenberg_terms = [
    (1.0, 'XX'),
    (1.0, 'YY'),
    (1.0, 'ZZ'),
]`,
    author: 'Prof. Jens Palsberg',
    createdAt: '2025-12-01',
    tags: ['cs238b', 'hamiltonian', 'trotter', 'simulation'],
    solveCount: 0,
    attemptCount: 0,
    maxScore: 100,
    timeBonus: false
  },
  {
    id: 'cs238b-lcu',
    title: 'Hamiltonian Simulation by LCU',
    description: `## Problem

Implement Hamiltonian simulation using the Linear Combination of Unitaries (LCU) method.

## Background

The LCU method expresses a non-unitary operator as: A = Σᵢ αᵢ Uᵢ

The LCU circuit uses:
1. **PREPARE**: Prepares state encoding coefficients
2. **SELECT**: Applies Uᵢ controlled on register state
3. **PREPARE†**: Uncomputes the preparation

## Requirements

1. Implement the LCU framework
2. Apply to Hamiltonian simulation
3. Demonstrate correctness via simulation`,
    category: 'cs238b',
    difficulty: 'Hard',
    constraints: {
      maxQubits: 8,
      maxGateCount: 250,
      maxCircuitDepth: 120
    },
    fidelityRequirement: {
      minFidelity: 0.85,
      targetFidelity: 0.95,
      metric: 'state_fidelity'
    },
    testCases: [
      {
        id: 'tc-lcu-basic',
        name: 'Basic LCU Implementation',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 40
      },
      {
        id: 'tc-hamiltonian',
        name: 'Hamiltonian Simulation',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 40
      },
      {
        id: 'tc-accuracy',
        name: 'Accuracy Analysis',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 20
      }
    ],
    hints: [
      'PREPARE circuit can use amplitude encoding techniques',
      'SELECT is a multi-controlled operation',
      'Post-selection on ancilla being |0⟩ gives the result'
    ],
    starterCode: `# Hamiltonian Simulation by LCU
from qiskit import QuantumCircuit
import numpy as np

def prepare_circuit(coefficients):
    """Create PREPARE circuit."""
    n_terms = len(coefficients)
    n_ancilla = int(np.ceil(np.log2(n_terms)))
    qc = QuantumCircuit(n_ancilla)
    # TODO: Implement amplitude encoding
    return qc

def select_circuit(unitaries, n_system):
    """Create SELECT circuit."""
    # TODO: Implement controlled unitary selection
    pass

def lcu_circuit(coefficients, unitaries, n_system):
    """Complete LCU circuit: PREPARE - SELECT - PREPARE†."""
    # TODO: Compose the full circuit
    pass`,
    author: 'Prof. Jens Palsberg',
    createdAt: '2025-12-01',
    tags: ['cs238b', 'lcu', 'hamiltonian', 'simulation'],
    solveCount: 0,
    attemptCount: 0,
    maxScore: 100,
    timeBonus: false
  },
  {
    id: 'cs238b-hhl',
    title: 'Solving Linear Equations with HHL',
    description: `## Problem

Work through a small example of solving linear equations Ax = b using the HHL algorithm.

## Background

The HHL algorithm solves linear systems exponentially faster than classical methods. Key steps:
1. Encode b as quantum state |b⟩
2. Phase Estimation to find eigenvalues of A
3. Controlled rotation by 1/λᵢ
4. Inverse Phase Estimation
5. Post-select on ancilla = |1⟩

## Requirements

1. Pick a 2×2 or 4×4 system of linear equations
2. Show how to represent Ax = b for HHL input
3. Execute the algorithm step by step
4. Verify the solution

## Note

This should be written by hand, though you may use computers for calculations.`,
    category: 'cs238b',
    difficulty: 'Hard',
    constraints: {
      maxQubits: 6,
      maxGateCount: 150,
      maxCircuitDepth: 80
    },
    fidelityRequirement: {
      minFidelity: 0.8,
      targetFidelity: 0.95,
      metric: 'probability_overlap'
    },
    testCases: [
      {
        id: 'tc-setup',
        name: 'Problem Setup',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 25
      },
      {
        id: 'tc-execution',
        name: 'Algorithm Execution',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 50
      },
      {
        id: 'tc-verification',
        name: 'Solution Verification',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 25
      }
    ],
    hints: [
      'Start with a diagonal A for simplicity',
      'Eigenvalues must be powers of 2 for exact phase estimation',
      'The solution |x⟩ ∝ A⁻¹|b⟩',
      'Success probability depends on overlap with eigenvectors'
    ],
    starterCode: `# HHL Algorithm for Solving Linear Equations
from qiskit import QuantumCircuit
import numpy as np

# Example: Solve Ax = b
A = np.array([[1, 0], [0, 2]])
b = np.array([1, 1]) / np.sqrt(2)

# Classical solution for verification
x_classical = np.linalg.solve(A, b)
print(f"Classical solution: {x_classical}")

def hhl_circuit(n_clock_qubits=2):
    """Implement HHL for the example system."""
    n_system = 1
    total_qubits = n_clock_qubits + n_system + 1

    qc = QuantumCircuit(total_qubits, 1)

    # TODO: Prepare |b⟩
    # TODO: Phase Estimation
    # TODO: Controlled rotation
    # TODO: Inverse Phase Estimation

    return qc`,
    author: 'Prof. Jens Palsberg',
    createdAt: '2025-12-01',
    tags: ['cs238b', 'hhl', 'linear-equations', 'qpe'],
    solveCount: 0,
    attemptCount: 0,
    maxScore: 100,
    timeBonus: false
  },
  {
    id: 'cs238b-state-distillation',
    title: 'Experiment with State Distillation',
    description: `## Problem

Distill high-fidelity Bell pairs on an IBM quantum computer using entanglement purification protocols.

## Background

Entanglement distillation takes many noisy entangled pairs and produces fewer, higher-quality pairs.

## Algorithms to Implement

1. **Bennett et al., 1996**: BBPSSW protocol
2. **Deutsch et al., 1996**: DEJMPS protocol

## Tasks

1. Create many noisy Bell pairs on IBM hardware
2. Implement both distillation protocols
3. Measure fidelities before and after
4. Compare the two algorithms

## Key Questions

- Were you successful at distilling higher-fidelity Bell pairs?
- Is the error rate below the needed threshold?`,
    category: 'cs238b',
    difficulty: 'Expert',
    constraints: {
      maxQubits: 8,
      maxGateCount: 100,
      maxCircuitDepth: 50
    },
    fidelityRequirement: {
      minFidelity: 0.0,
      targetFidelity: 1.0,
      metric: 'probability_overlap'
    },
    testCases: [
      {
        id: 'tc-bbpssw',
        name: 'BBPSSW Protocol',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 35
      },
      {
        id: 'tc-dejmps',
        name: 'DEJMPS Protocol',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 35
      },
      {
        id: 'tc-comparison',
        name: 'Protocol Comparison',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 30
      }
    ],
    hints: [
      'Bell fidelity F = ⟨Φ⁺|ρ|Φ⁺⟩',
      'Threshold for BBPSSW: F > 0.5',
      'Use quantum state tomography for fidelity estimation',
      'IBM devices have varying error rates - choose carefully'
    ],
    starterCode: `# State Distillation Experiment
from qiskit import QuantumCircuit

def create_bell_pair():
    """Create a Bell pair circuit."""
    qc = QuantumCircuit(2)
    qc.h(0)
    qc.cx(0, 1)
    return qc

def bbpssw_protocol(pair1, pair2):
    """Implement BBPSSW entanglement distillation."""
    qc = QuantumCircuit(4, 2)
    # Bilateral CNOT
    qc.cx(0, 2)
    qc.cx(1, 3)
    # Measure target pair
    qc.measure([2, 3], [0, 1])
    return qc

def dejmps_protocol(pair1, pair2):
    """Implement DEJMPS entanglement distillation."""
    # TODO: Implement DEJMPS protocol
    pass`,
    author: 'Prof. Jens Palsberg',
    createdAt: '2025-12-01',
    tags: ['cs238b', 'distillation', 'bell-pairs', 'ibm-quantum'],
    solveCount: 0,
    attemptCount: 0,
    maxScore: 100,
    timeBonus: false
  },
  {
    id: 'cs238b-approximate-toffoli',
    title: 'Approximate Toffoli Gate',
    description: `## Problem

Design a circuit synthesizer that approximates the Toffoli gate using a restricted gate set and qubit connectivity.

## Constraints

1. **Qubits**: 3 qubits with connectivity A — B — C (A-B connected, B-C connected, A-C NOT connected)
2. **Gates**: Exactly 7 CNOT gates, any number of 1-qubit gates
3. **2-qubit operations**: Only between adjacent qubits

## Objective

Minimize the Hilbert-Schmidt distance between your circuit and the true Toffoli:

d_HS(U, V) = √(1 - |Tr(U†V)|²/d²)

## Submission

Submit your synthesizer program and a report with the Hilbert-Schmidt distance achieved.`,
    category: 'cs238b',
    difficulty: 'Expert',
    constraints: {
      maxQubits: 3,
      maxGateCount: 50,
      maxCircuitDepth: 30
    },
    fidelityRequirement: {
      minFidelity: 0.0,
      targetFidelity: 1.0,
      metric: 'probability_overlap'
    },
    testCases: [
      {
        id: 'tc-connectivity',
        name: 'Respects Connectivity',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 20
      },
      {
        id: 'tc-cnot-count',
        name: 'Exactly 7 CNOTs',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 20
      },
      {
        id: 'tc-hs-distance',
        name: 'Hilbert-Schmidt Distance',
        input: {},
        expectedOutput: {},
        isHidden: false,
        weight: 60
      }
    ],
    hints: [
      'The exact Toffoli requires more than 7 CNOTs with linear connectivity',
      'Use numerical optimization for single-qubit rotations',
      'Parameterize 1-qubit gates as U3(θ, φ, λ)',
      'Consider alternating CNOT and rotation layers'
    ],
    starterCode: `# Approximate Toffoli Circuit Synthesizer
from qiskit import QuantumCircuit
from qiskit.quantum_info import Operator
import numpy as np
from scipy.optimize import minimize

# True Toffoli gate matrix
TOFFOLI = np.array([
    [1,0,0,0,0,0,0,0],
    [0,1,0,0,0,0,0,0],
    [0,0,1,0,0,0,0,0],
    [0,0,0,1,0,0,0,0],
    [0,0,0,0,1,0,0,0],
    [0,0,0,0,0,1,0,0],
    [0,0,0,0,0,0,0,1],
    [0,0,0,0,0,0,1,0],
])

def hilbert_schmidt_distance(U, V):
    """Compute Hilbert-Schmidt distance."""
    d = U.shape[0]
    inner = np.abs(np.trace(U.conj().T @ V))**2 / d**2
    return np.sqrt(max(0, 1 - inner))

def create_approximate_toffoli(params):
    """Create approximate Toffoli with given parameters."""
    qc = QuantumCircuit(3)
    # TODO: Design circuit with 7 CNOTs
    return qc

def objective(params):
    """Objective: Hilbert-Schmidt distance to Toffoli."""
    qc = create_approximate_toffoli(params)
    U = Operator(qc).data
    return hilbert_schmidt_distance(U, TOFFOLI)`,
    author: 'Prof. Jens Palsberg',
    createdAt: '2025-12-01',
    tags: ['cs238b', 'circuit-synthesis', 'toffoli', 'optimization'],
    solveCount: 0,
    attemptCount: 0,
    maxScore: 100,
    timeBonus: false
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

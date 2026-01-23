/**
 * Quantum Circuit Simulator
 * Supports up to 20 qubits using state vector simulation
 * Runs entirely in the browser
 */

// Complex number representation
export interface Complex {
  re: number
  im: number
}

// Create complex number
export const complex = (re: number, im: number = 0): Complex => ({ re, im })

// Complex number operations
export const complexAdd = (a: Complex, b: Complex): Complex => ({
  re: a.re + b.re,
  im: a.im + b.im
})

export const complexSub = (a: Complex, b: Complex): Complex => ({
  re: a.re - b.re,
  im: a.im - b.im
})

export const complexMul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re
})

export const complexDiv = (a: Complex, b: Complex): Complex => {
  const denom = b.re * b.re + b.im * b.im
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom
  }
}

export const complexConj = (a: Complex): Complex => ({
  re: a.re,
  im: -a.im
})

export const complexAbs = (a: Complex): number =>
  Math.sqrt(a.re * a.re + a.im * a.im)

export const complexAbsSq = (a: Complex): number =>
  a.re * a.re + a.im * a.im

export const complexExp = (theta: number): Complex => ({
  re: Math.cos(theta),
  im: Math.sin(theta)
})

export const complexScale = (a: Complex, s: number): Complex => ({
  re: a.re * s,
  im: a.im * s
})

// Common constants
const SQRT2_INV = 1 / Math.sqrt(2)
const ZERO: Complex = { re: 0, im: 0 }
const ONE: Complex = { re: 1, im: 0 }
const I: Complex = { re: 0, im: 1 }
const MINUS_I: Complex = { re: 0, im: -1 }

// Gate matrices (2x2 for single qubit gates)
type GateMatrix = Complex[][]

// Single qubit gate definitions
export const GATES: Record<string, GateMatrix> = {
  // Pauli gates
  I: [
    [ONE, ZERO],
    [ZERO, ONE]
  ],
  X: [
    [ZERO, ONE],
    [ONE, ZERO]
  ],
  Y: [
    [ZERO, MINUS_I],
    [I, ZERO]
  ],
  Z: [
    [ONE, ZERO],
    [ZERO, complex(-1)]
  ],

  // Hadamard
  H: [
    [complex(SQRT2_INV), complex(SQRT2_INV)],
    [complex(SQRT2_INV), complex(-SQRT2_INV)]
  ],

  // Phase gates
  S: [
    [ONE, ZERO],
    [ZERO, I]
  ],
  SDG: [
    [ONE, ZERO],
    [ZERO, MINUS_I]
  ],
  T: [
    [ONE, ZERO],
    [ZERO, complexExp(Math.PI / 4)]
  ],
  TDG: [
    [ONE, ZERO],
    [ZERO, complexExp(-Math.PI / 4)]
  ],

  // Square root gates
  SX: [
    [complex(0.5, 0.5), complex(0.5, -0.5)],
    [complex(0.5, -0.5), complex(0.5, 0.5)]
  ]
}

// Parameterized rotation gates
export const RX = (theta: number): GateMatrix => {
  const cos = Math.cos(theta / 2)
  const sin = Math.sin(theta / 2)
  return [
    [complex(cos), complex(0, -sin)],
    [complex(0, -sin), complex(cos)]
  ]
}

export const RY = (theta: number): GateMatrix => {
  const cos = Math.cos(theta / 2)
  const sin = Math.sin(theta / 2)
  return [
    [complex(cos), complex(-sin)],
    [complex(sin), complex(cos)]
  ]
}

export const RZ = (theta: number): GateMatrix => {
  return [
    [complexExp(-theta / 2), ZERO],
    [ZERO, complexExp(theta / 2)]
  ]
}

export const P = (theta: number): GateMatrix => {
  return [
    [ONE, ZERO],
    [ZERO, complexExp(theta)]
  ]
}

export const U = (theta: number, phi: number, lambda: number): GateMatrix => {
  const cos = Math.cos(theta / 2)
  const sin = Math.sin(theta / 2)
  return [
    [complex(cos), complexMul(complex(-1), complexExp(lambda)).re === 0
      ? complexScale(complexExp(lambda), -sin)
      : complexMul(complex(-sin), complexExp(lambda))],
    [complexMul(complexExp(phi), complex(sin)),
     complexMul(complexExp(phi + lambda), complex(cos))]
  ]
}

// Quantum state vector class
export class QuantumState {
  public numQubits: number
  public amplitudes: Complex[]

  constructor(numQubits: number) {
    if (numQubits > 20) {
      throw new Error('Maximum 20 qubits supported')
    }
    this.numQubits = numQubits
    const size = 1 << numQubits // 2^numQubits
    this.amplitudes = new Array(size).fill(null).map(() => ({ ...ZERO }))
    this.amplitudes[0] = { ...ONE } // Initialize to |0...0⟩
  }

  // Reset to |0...0⟩
  reset(): void {
    for (let i = 0; i < this.amplitudes.length; i++) {
      this.amplitudes[i] = i === 0 ? { ...ONE } : { ...ZERO }
    }
  }

  // Initialize to a specific basis state
  setBasisState(state: number): void {
    for (let i = 0; i < this.amplitudes.length; i++) {
      this.amplitudes[i] = i === state ? { ...ONE } : { ...ZERO }
    }
  }

  // Apply single qubit gate
  applySingleQubitGate(qubit: number, gate: GateMatrix): void {
    const n = this.amplitudes.length
    const mask = 1 << qubit

    for (let i = 0; i < n; i++) {
      if ((i & mask) === 0) {
        const j = i | mask
        const a0 = this.amplitudes[i]
        const a1 = this.amplitudes[j]

        this.amplitudes[i] = complexAdd(
          complexMul(gate[0][0], a0),
          complexMul(gate[0][1], a1)
        )
        this.amplitudes[j] = complexAdd(
          complexMul(gate[1][0], a0),
          complexMul(gate[1][1], a1)
        )
      }
    }
  }

  // Apply controlled gate (control on one qubit)
  applyControlledGate(control: number, target: number, gate: GateMatrix): void {
    const n = this.amplitudes.length
    const controlMask = 1 << control
    const targetMask = 1 << target

    for (let i = 0; i < n; i++) {
      // Only apply if control qubit is |1⟩ and target qubit is |0⟩
      if ((i & controlMask) !== 0 && (i & targetMask) === 0) {
        const j = i | targetMask
        const a0 = this.amplitudes[i]
        const a1 = this.amplitudes[j]

        this.amplitudes[i] = complexAdd(
          complexMul(gate[0][0], a0),
          complexMul(gate[0][1], a1)
        )
        this.amplitudes[j] = complexAdd(
          complexMul(gate[1][0], a0),
          complexMul(gate[1][1], a1)
        )
      }
    }
  }

  // Apply multi-controlled gate
  applyMultiControlledGate(controls: number[], target: number, gate: GateMatrix): void {
    const n = this.amplitudes.length
    const targetMask = 1 << target
    let controlMask = 0
    for (const c of controls) {
      controlMask |= (1 << c)
    }

    for (let i = 0; i < n; i++) {
      // Only apply if all control qubits are |1⟩ and target qubit is |0⟩
      if ((i & controlMask) === controlMask && (i & targetMask) === 0) {
        const j = i | targetMask
        const a0 = this.amplitudes[i]
        const a1 = this.amplitudes[j]

        this.amplitudes[i] = complexAdd(
          complexMul(gate[0][0], a0),
          complexMul(gate[0][1], a1)
        )
        this.amplitudes[j] = complexAdd(
          complexMul(gate[1][0], a0),
          complexMul(gate[1][1], a1)
        )
      }
    }
  }

  // Apply SWAP gate
  applySwap(qubit1: number, qubit2: number): void {
    const n = this.amplitudes.length
    const mask1 = 1 << qubit1
    const mask2 = 1 << qubit2

    for (let i = 0; i < n; i++) {
      const bit1 = (i & mask1) !== 0
      const bit2 = (i & mask2) !== 0

      if (bit1 !== bit2) {
        // Swap amplitudes where the two qubits differ
        const j = i ^ mask1 ^ mask2
        if (i < j) {
          const temp = this.amplitudes[i]
          this.amplitudes[i] = this.amplitudes[j]
          this.amplitudes[j] = temp
        }
      }
    }
  }

  // Get probability of measuring a specific state
  getProbability(state: number): number {
    return complexAbsSq(this.amplitudes[state])
  }

  // Get all probabilities
  getProbabilities(): number[] {
    return this.amplitudes.map(a => complexAbsSq(a))
  }

  // Measure a single qubit (collapses state)
  measureQubit(qubit: number): number {
    const mask = 1 << qubit
    let prob0 = 0

    // Calculate probability of measuring |0⟩
    for (let i = 0; i < this.amplitudes.length; i++) {
      if ((i & mask) === 0) {
        prob0 += complexAbsSq(this.amplitudes[i])
      }
    }

    // Random measurement
    const result = Math.random() < prob0 ? 0 : 1
    const normFactor = 1 / Math.sqrt(result === 0 ? prob0 : 1 - prob0)

    // Collapse state
    for (let i = 0; i < this.amplitudes.length; i++) {
      const bit = (i & mask) !== 0 ? 1 : 0
      if (bit === result) {
        this.amplitudes[i] = complexScale(this.amplitudes[i], normFactor)
      } else {
        this.amplitudes[i] = { ...ZERO }
      }
    }

    return result
  }

  // Measure all qubits (returns bitstring as number)
  measureAll(): number {
    const probs = this.getProbabilities()
    let rand = Math.random()

    for (let i = 0; i < probs.length; i++) {
      rand -= probs[i]
      if (rand <= 0) {
        // Collapse to this state
        for (let j = 0; j < this.amplitudes.length; j++) {
          this.amplitudes[j] = j === i ? { ...ONE } : { ...ZERO }
        }
        return i
      }
    }

    // Edge case: return last state
    const lastState = this.amplitudes.length - 1
    this.amplitudes[lastState] = { ...ONE }
    return lastState
  }

  // Sample without collapse (for getting probability distribution)
  sample(shots: number = 1024): Record<string, number> {
    const probs = this.getProbabilities()
    const results: Record<string, number> = {}

    for (let shot = 0; shot < shots; shot++) {
      let rand = Math.random()
      for (let i = 0; i < probs.length; i++) {
        rand -= probs[i]
        if (rand <= 0) {
          const bitstring = i.toString(2).padStart(this.numQubits, '0')
          results[bitstring] = (results[bitstring] || 0) + 1
          break
        }
      }
    }

    return results
  }

  // Get state vector as string for debugging
  toString(): string {
    const terms: string[] = []
    for (let i = 0; i < this.amplitudes.length; i++) {
      const amp = this.amplitudes[i]
      if (complexAbsSq(amp) > 1e-10) {
        const basis = i.toString(2).padStart(this.numQubits, '0')
        const sign = amp.re >= 0 ? '+' : ''
        if (Math.abs(amp.im) < 1e-10) {
          terms.push(`${sign}${amp.re.toFixed(4)}|${basis}⟩`)
        } else {
          terms.push(`${sign}(${amp.re.toFixed(4)}${amp.im >= 0 ? '+' : ''}${amp.im.toFixed(4)}i)|${basis}⟩`)
        }
      }
    }
    return terms.join(' ') || '0'
  }

  // Clone the state
  clone(): QuantumState {
    const newState = new QuantumState(this.numQubits)
    for (let i = 0; i < this.amplitudes.length; i++) {
      newState.amplitudes[i] = { ...this.amplitudes[i] }
    }
    return newState
  }
}

// Instruction for circuit execution
export interface GateInstruction {
  gate: string
  qubits: number[]
  params?: number[]
}

// Quantum circuit class
export class QuantumCircuit {
  public numQubits: number
  public instructions: GateInstruction[]

  constructor(numQubits: number) {
    if (numQubits > 20) {
      throw new Error('Maximum 20 qubits supported')
    }
    this.numQubits = numQubits
    this.instructions = []
  }

  // Add gate to circuit
  addGate(gate: string, qubits: number[], params?: number[]): void {
    this.instructions.push({ gate, qubits, params })
  }

  // Convenience methods for common gates
  h(qubit: number): this { this.addGate('H', [qubit]); return this }
  x(qubit: number): this { this.addGate('X', [qubit]); return this }
  y(qubit: number): this { this.addGate('Y', [qubit]); return this }
  z(qubit: number): this { this.addGate('Z', [qubit]); return this }
  s(qubit: number): this { this.addGate('S', [qubit]); return this }
  sdg(qubit: number): this { this.addGate('SDG', [qubit]); return this }
  t(qubit: number): this { this.addGate('T', [qubit]); return this }
  tdg(qubit: number): this { this.addGate('TDG', [qubit]); return this }
  sx(qubit: number): this { this.addGate('SX', [qubit]); return this }

  rx(qubit: number, theta: number): this { this.addGate('RX', [qubit], [theta]); return this }
  ry(qubit: number, theta: number): this { this.addGate('RY', [qubit], [theta]); return this }
  rz(qubit: number, theta: number): this { this.addGate('RZ', [qubit], [theta]); return this }
  p(qubit: number, theta: number): this { this.addGate('P', [qubit], [theta]); return this }
  u(qubit: number, theta: number, phi: number, lambda: number): this {
    this.addGate('U', [qubit], [theta, phi, lambda])
    return this
  }

  cx(control: number, target: number): this { this.addGate('CX', [control, target]); return this }
  cnot(control: number, target: number): this { return this.cx(control, target) }
  cy(control: number, target: number): this { this.addGate('CY', [control, target]); return this }
  cz(control: number, target: number): this { this.addGate('CZ', [control, target]); return this }

  swap(qubit1: number, qubit2: number): this { this.addGate('SWAP', [qubit1, qubit2]); return this }

  ccx(control1: number, control2: number, target: number): this {
    this.addGate('CCX', [control1, control2, target])
    return this
  }
  toffoli(control1: number, control2: number, target: number): this {
    return this.ccx(control1, control2, target)
  }

  // Get circuit depth
  getDepth(): number {
    if (this.instructions.length === 0) return 0

    const qubitDepths = new Array(this.numQubits).fill(0)

    for (const inst of this.instructions) {
      const maxDepth = Math.max(...inst.qubits.map(q => qubitDepths[q]))
      for (const q of inst.qubits) {
        qubitDepths[q] = maxDepth + 1
      }
    }

    return Math.max(...qubitDepths)
  }

  // Get gate count
  getGateCount(): number {
    return this.instructions.length
  }

  // Get count of each gate type
  getGateCounts(): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const inst of this.instructions) {
      counts[inst.gate] = (counts[inst.gate] || 0) + 1
    }
    return counts
  }
}

// Quantum simulator that executes circuits
export class QuantumSimulator {
  private state: QuantumState

  constructor(numQubits: number) {
    this.state = new QuantumState(numQubits)
  }

  // Get current state
  getState(): QuantumState {
    return this.state
  }

  // Reset state
  reset(): void {
    this.state.reset()
  }

  // Execute a single instruction
  executeInstruction(inst: GateInstruction): void {
    const { gate, qubits, params } = inst

    // Single qubit gates
    if (qubits.length === 1) {
      const qubit = qubits[0]

      if (gate in GATES) {
        this.state.applySingleQubitGate(qubit, GATES[gate])
      } else if (gate === 'RX' && params) {
        this.state.applySingleQubitGate(qubit, RX(params[0]))
      } else if (gate === 'RY' && params) {
        this.state.applySingleQubitGate(qubit, RY(params[0]))
      } else if (gate === 'RZ' && params) {
        this.state.applySingleQubitGate(qubit, RZ(params[0]))
      } else if (gate === 'P' && params) {
        this.state.applySingleQubitGate(qubit, P(params[0]))
      } else if (gate === 'U' && params) {
        this.state.applySingleQubitGate(qubit, U(params[0], params[1], params[2]))
      } else {
        throw new Error(`Unknown single-qubit gate: ${gate}`)
      }
    }
    // Two qubit gates
    else if (qubits.length === 2) {
      const [q1, q2] = qubits

      if (gate === 'CX' || gate === 'CNOT') {
        this.state.applyControlledGate(q1, q2, GATES.X)
      } else if (gate === 'CY') {
        this.state.applyControlledGate(q1, q2, GATES.Y)
      } else if (gate === 'CZ') {
        this.state.applyControlledGate(q1, q2, GATES.Z)
      } else if (gate === 'CH') {
        this.state.applyControlledGate(q1, q2, GATES.H)
      } else if (gate === 'SWAP') {
        this.state.applySwap(q1, q2)
      } else if (gate === 'CRX' && params) {
        this.state.applyControlledGate(q1, q2, RX(params[0]))
      } else if (gate === 'CRY' && params) {
        this.state.applyControlledGate(q1, q2, RY(params[0]))
      } else if (gate === 'CRZ' && params) {
        this.state.applyControlledGate(q1, q2, RZ(params[0]))
      } else if (gate === 'CP' && params) {
        this.state.applyControlledGate(q1, q2, P(params[0]))
      } else {
        throw new Error(`Unknown two-qubit gate: ${gate}`)
      }
    }
    // Three qubit gates
    else if (qubits.length === 3) {
      const [c1, c2, target] = qubits

      if (gate === 'CCX' || gate === 'TOFFOLI') {
        this.state.applyMultiControlledGate([c1, c2], target, GATES.X)
      } else if (gate === 'CCZ') {
        this.state.applyMultiControlledGate([c1, c2], target, GATES.Z)
      } else if (gate === 'CSWAP' || gate === 'FREDKIN') {
        // CSWAP: if control is |1⟩, swap the other two qubits
        // Implemented as: if c1 is |1⟩, CNOT(c2, target), CCNOT(c1, target, c2), CNOT(c2, target)
        // Simpler: directly implement
        const n = this.state.amplitudes.length
        const c1Mask = 1 << c1
        const c2Mask = 1 << c2
        const targetMask = 1 << target

        for (let i = 0; i < n; i++) {
          if ((i & c1Mask) !== 0) { // Control is |1⟩
            const bit2 = (i & c2Mask) !== 0
            const bit3 = (i & targetMask) !== 0
            if (bit2 !== bit3) {
              const j = i ^ c2Mask ^ targetMask
              if (i < j) {
                const temp = this.state.amplitudes[i]
                this.state.amplitudes[i] = this.state.amplitudes[j]
                this.state.amplitudes[j] = temp
              }
            }
          }
        }
      } else {
        throw new Error(`Unknown three-qubit gate: ${gate}`)
      }
    } else {
      throw new Error(`Gates with ${qubits.length} qubits not supported`)
    }
  }

  // Execute a circuit
  run(circuit: QuantumCircuit): QuantumState {
    this.state = new QuantumState(circuit.numQubits)

    for (const inst of circuit.instructions) {
      this.executeInstruction(inst)
    }

    return this.state
  }

  // Run circuit and sample results
  runAndSample(circuit: QuantumCircuit, shots: number = 1024): Record<string, number> {
    this.run(circuit)
    return this.state.sample(shots)
  }

  // Get probabilities after running circuit
  runAndGetProbabilities(circuit: QuantumCircuit): number[] {
    this.run(circuit)
    return this.state.getProbabilities()
  }
}

// Helper function to calculate fidelity between two probability distributions
export function calculateFidelity(
  measured: Record<string, number>,
  expected: Record<string, number>,
  shots: number
): number {
  // Convert to probability distributions
  const measuredProbs: Record<string, number> = {}
  const expectedProbs: Record<string, number> = {}

  for (const [key, value] of Object.entries(measured)) {
    measuredProbs[key] = value / shots
  }

  let totalExpected = 0
  for (const value of Object.values(expected)) {
    totalExpected += value
  }
  for (const [key, value] of Object.entries(expected)) {
    expectedProbs[key] = value / totalExpected
  }

  // Calculate fidelity using Bhattacharyya coefficient
  // F = (Σ √(p_i * q_i))^2
  const allKeys = new Set([...Object.keys(measuredProbs), ...Object.keys(expectedProbs)])
  let sqrtSum = 0

  for (const key of allKeys) {
    const p = measuredProbs[key] || 0
    const q = expectedProbs[key] || 0
    sqrtSum += Math.sqrt(p * q)
  }

  return sqrtSum * sqrtSum
}

// Calculate fidelity for exact state comparison
export function calculateStateFidelity(
  state: QuantumState,
  expectedAmplitudes: Complex[]
): number {
  if (state.amplitudes.length !== expectedAmplitudes.length) {
    return 0
  }

  // Fidelity = |⟨ψ|φ⟩|²
  let overlap: Complex = { re: 0, im: 0 }

  for (let i = 0; i < state.amplitudes.length; i++) {
    const conj = complexConj(state.amplitudes[i])
    overlap = complexAdd(overlap, complexMul(conj, expectedAmplitudes[i]))
  }

  return complexAbsSq(overlap)
}

export default QuantumSimulator

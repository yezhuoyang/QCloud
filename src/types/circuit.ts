// All IBM Qiskit Gate Types
export type GateType =
  // Single-qubit Pauli gates
  | 'X' | 'Y' | 'Z' | 'I'
  // Hadamard
  | 'H'
  // Phase gates
  | 'S' | 'Sdg' | 'T' | 'Tdg' | 'P'
  // Sqrt-X gates
  | 'SX' | 'SXdg'
  // Rotation gates
  | 'RX' | 'RY' | 'RZ'
  // Universal gate
  | 'U'
  // Two-qubit controlled gates
  | 'CX' | 'CY' | 'CZ' | 'CH'
  // Two-qubit controlled rotation gates
  | 'CRX' | 'CRY' | 'CRZ' | 'CP'
  // Swap gates
  | 'SWAP' | 'iSWAP'
  // Three-qubit gates
  | 'CCX' | 'CSWAP'
  // Measurement
  | 'MEASURE'
  // Dynamic circuit operations
  | 'RESET' | 'BARRIER'
  // Conditional wrapper (applied to other gates)
  | 'IF_ELSE'

export type GateCategory = 'single' | 'two' | 'three' | 'measurement' | 'dynamic'

export interface GateDefinition {
  type: GateType
  name: string
  symbol: string
  category: GateCategory
  numQubits: number
  numParams: number
  paramNames?: string[]
  description: string
  color: string
}

// Condition for dynamic circuit operations
export interface GateCondition {
  classicalBit: number    // Classical bit to check
  value: number           // Expected value (0 or 1)
}

export interface PlacedGate {
  id: string
  type: GateType
  qubits: number[]        // Target qubit indices
  classicalBit?: number   // For measurement
  params?: number[]       // For parameterized gates
  column: number          // Time step position
  condition?: GateCondition  // For conditional execution (c_if)
  // For IF_ELSE blocks
  ifGates?: PlacedGate[]     // Gates to execute if condition is true
  elseGates?: PlacedGate[]   // Gates to execute if condition is false
}

export interface Circuit {
  numQubits: number
  numClassicalBits: number
  gates: PlacedGate[]
}

// Gate definitions with all metadata - Qiskit color style
export const GATE_DEFINITIONS: Record<GateType, GateDefinition> = {
  // Single-qubit Pauli gates - Light blue (Qiskit style)
  X: { type: 'X', name: 'Pauli-X', symbol: 'X', category: 'single', numQubits: 1, numParams: 0, description: 'Bit flip gate (NOT)', color: '#6fa8dc' },
  Y: { type: 'Y', name: 'Pauli-Y', symbol: 'Y', category: 'single', numQubits: 1, numParams: 0, description: 'Bit and phase flip gate', color: '#6fa8dc' },
  Z: { type: 'Z', name: 'Pauli-Z', symbol: 'Z', category: 'single', numQubits: 1, numParams: 0, description: 'Phase flip gate', color: '#6fa8dc' },
  I: { type: 'I', name: 'Identity', symbol: 'I', category: 'single', numQubits: 1, numParams: 0, description: 'Identity (no operation)', color: '#20b2aa' },

  // Hadamard - Red/salmon (Qiskit style)
  H: { type: 'H', name: 'Hadamard', symbol: 'H', category: 'single', numQubits: 1, numParams: 0, description: 'Creates superposition', color: '#f28b82' },

  // Phase gates - Purple (Qiskit style)
  S: { type: 'S', name: 'S Gate', symbol: 'S', category: 'single', numQubits: 1, numParams: 0, description: 'Phase gate (π/2)', color: '#b39ddb' },
  Sdg: { type: 'Sdg', name: 'S Dagger', symbol: 'S†', category: 'single', numQubits: 1, numParams: 0, description: 'Inverse S gate (-π/2)', color: '#b39ddb' },
  T: { type: 'T', name: 'T Gate', symbol: 'T', category: 'single', numQubits: 1, numParams: 0, description: 'T gate (π/4)', color: '#b39ddb' },
  Tdg: { type: 'Tdg', name: 'T Dagger', symbol: 'T†', category: 'single', numQubits: 1, numParams: 0, description: 'Inverse T gate (-π/4)', color: '#b39ddb' },
  P: { type: 'P', name: 'Phase', symbol: 'P', category: 'single', numQubits: 1, numParams: 1, paramNames: ['λ'], description: 'Phase gate P(λ)', color: '#b39ddb' },

  // Sqrt-X gates - Light blue (Qiskit style)
  SX: { type: 'SX', name: 'Sqrt-X', symbol: '√X', category: 'single', numQubits: 1, numParams: 0, description: 'Square root of X gate', color: '#6fa8dc' },
  SXdg: { type: 'SXdg', name: 'Sqrt-X Dagger', symbol: '√X†', category: 'single', numQubits: 1, numParams: 0, description: 'Inverse square root of X', color: '#6fa8dc' },

  // Rotation gates - Light purple/violet (Qiskit style)
  RX: { type: 'RX', name: 'Rotation X', symbol: 'Rx', category: 'single', numQubits: 1, numParams: 1, paramNames: ['θ'], description: 'Rotation around X-axis', color: '#9c89e0' },
  RY: { type: 'RY', name: 'Rotation Y', symbol: 'Ry', category: 'single', numQubits: 1, numParams: 1, paramNames: ['θ'], description: 'Rotation around Y-axis', color: '#9c89e0' },
  RZ: { type: 'RZ', name: 'Rotation Z', symbol: 'Rz', category: 'single', numQubits: 1, numParams: 1, paramNames: ['θ'], description: 'Rotation around Z-axis', color: '#9c89e0' },

  // Universal gate - Purple (Qiskit style)
  U: { type: 'U', name: 'Universal', symbol: 'U', category: 'single', numQubits: 1, numParams: 3, paramNames: ['θ', 'φ', 'λ'], description: 'Universal single-qubit gate', color: '#9c89e0' },

  // Two-qubit controlled gates - Blue (Qiskit style)
  CX: { type: 'CX', name: 'CNOT', symbol: '+', category: 'two', numQubits: 2, numParams: 0, description: 'Controlled-NOT gate', color: '#6fa8dc' },
  CY: { type: 'CY', name: 'Controlled-Y', symbol: 'Y', category: 'two', numQubits: 2, numParams: 0, description: 'Controlled-Y gate', color: '#6fa8dc' },
  CZ: { type: 'CZ', name: 'Controlled-Z', symbol: 'Z', category: 'two', numQubits: 2, numParams: 0, description: 'Controlled-Z gate', color: '#6fa8dc' },
  CH: { type: 'CH', name: 'Controlled-H', symbol: 'H', category: 'two', numQubits: 2, numParams: 0, description: 'Controlled-Hadamard gate', color: '#f28b82' },

  // Two-qubit controlled rotation gates - Purple (Qiskit style)
  CRX: { type: 'CRX', name: 'Controlled-RX', symbol: 'Rx', category: 'two', numQubits: 2, numParams: 1, paramNames: ['θ'], description: 'Controlled rotation X', color: '#9c89e0' },
  CRY: { type: 'CRY', name: 'Controlled-RY', symbol: 'Ry', category: 'two', numQubits: 2, numParams: 1, paramNames: ['θ'], description: 'Controlled rotation Y', color: '#9c89e0' },
  CRZ: { type: 'CRZ', name: 'Controlled-RZ', symbol: 'Rz', category: 'two', numQubits: 2, numParams: 1, paramNames: ['θ'], description: 'Controlled rotation Z', color: '#9c89e0' },
  CP: { type: 'CP', name: 'Controlled-Phase', symbol: 'P', category: 'two', numQubits: 2, numParams: 1, paramNames: ['λ'], description: 'Controlled phase gate', color: '#b39ddb' },

  // Swap gates - Teal (Qiskit style)
  SWAP: { type: 'SWAP', name: 'SWAP', symbol: '×', category: 'two', numQubits: 2, numParams: 0, description: 'Swap two qubits', color: '#6fa8dc' },
  iSWAP: { type: 'iSWAP', name: 'iSWAP', symbol: 'iSW', category: 'two', numQubits: 2, numParams: 0, description: 'iSWAP gate', color: '#6fa8dc' },

  // Three-qubit gates - Blue (Qiskit style)
  CCX: { type: 'CCX', name: 'Toffoli', symbol: '+', category: 'three', numQubits: 3, numParams: 0, description: 'Toffoli (CCNOT) gate', color: '#6fa8dc' },
  CSWAP: { type: 'CSWAP', name: 'Fredkin', symbol: '×', category: 'three', numQubits: 3, numParams: 0, description: 'Fredkin (CSWAP) gate', color: '#6fa8dc' },

  // Measurement - Black (Qiskit style)
  MEASURE: { type: 'MEASURE', name: 'Measure', symbol: 'M', category: 'measurement', numQubits: 1, numParams: 0, description: 'Measure qubit', color: '#1a1a2e' },

  // Dynamic circuit operations
  RESET: { type: 'RESET', name: 'Reset', symbol: '|0⟩', category: 'dynamic', numQubits: 1, numParams: 0, description: 'Reset qubit to |0⟩ state', color: '#6fa8dc' },
  BARRIER: { type: 'BARRIER', name: 'Barrier', symbol: '║', category: 'dynamic', numQubits: 1, numParams: 0, description: 'Barrier (prevents optimization across)', color: '#666666' },
  IF_ELSE: { type: 'IF_ELSE', name: 'If-Else', symbol: 'if', category: 'dynamic', numQubits: 1, numParams: 0, description: 'Conditional block based on classical bit', color: '#9c27b0' },
}

// Grouped gates for toolbar display
export const GATE_GROUPS: { name: string; gates: GateType[] }[] = [
  {
    name: 'Pauli',
    gates: ['X', 'Y', 'Z', 'I']
  },
  {
    name: 'Basic',
    gates: ['H', 'S', 'Sdg', 'T', 'Tdg']
  },
  {
    name: 'Sqrt-X',
    gates: ['SX', 'SXdg']
  },
  {
    name: 'Rotation',
    gates: ['RX', 'RY', 'RZ', 'P', 'U']
  },
  {
    name: 'Controlled',
    gates: ['CX', 'CY', 'CZ', 'CH']
  },
  {
    name: 'Controlled Rotation',
    gates: ['CRX', 'CRY', 'CRZ', 'CP']
  },
  {
    name: 'Swap',
    gates: ['SWAP', 'iSWAP']
  },
  {
    name: 'Multi-Qubit',
    gates: ['CCX', 'CSWAP']
  },
  {
    name: 'Measurement',
    gates: ['MEASURE']
  },
  {
    name: 'Dynamic',
    gates: ['RESET', 'BARRIER', 'IF_ELSE']
  }
]

// Helper to create a new empty circuit
export function createEmptyCircuit(numQubits: number = 2): Circuit {
  return {
    numQubits,
    numClassicalBits: numQubits,
    gates: []
  }
}

// Helper to generate unique gate ID
export function generateGateId(): string {
  return `gate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

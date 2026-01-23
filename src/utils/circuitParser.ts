/**
 * Circuit Parser
 * Parses Python/Qiskit-style quantum circuit code and extracts gate operations
 */

import { QuantumCircuit, GateInstruction } from './quantumSimulator'

export interface ParseResult {
  success: boolean
  circuit?: QuantumCircuit
  instructions?: GateInstruction[]
  numQubits: number
  numClassicalBits: number
  error?: string
  gateCount: number
  depth: number
}

// Regular expressions for parsing
const QUBIT_REG_REGEX = /(?:QuantumRegister|qr)\s*\(\s*(\d+)\s*\)/g
const CLASSICAL_REG_REGEX = /(?:ClassicalRegister|cr)\s*\(\s*(\d+)\s*\)/g
const CIRCUIT_SIZE_REGEX = /QuantumCircuit\s*\(\s*(\d+)\s*(?:,\s*(\d+))?\s*\)/

// Gate patterns (method calls on circuit)
const GATE_PATTERNS: Record<string, RegExp> = {
  // Single qubit gates
  H: /\.h\s*\(\s*(\d+)\s*\)/gi,
  X: /\.x\s*\(\s*(\d+)\s*\)/gi,
  Y: /\.y\s*\(\s*(\d+)\s*\)/gi,
  Z: /\.z\s*\(\s*(\d+)\s*\)/gi,
  S: /\.s\s*\(\s*(\d+)\s*\)/gi,
  SDG: /\.sdg\s*\(\s*(\d+)\s*\)/gi,
  T: /\.t\s*\(\s*(\d+)\s*\)/gi,
  TDG: /\.tdg\s*\(\s*(\d+)\s*\)/gi,
  SX: /\.sx\s*\(\s*(\d+)\s*\)/gi,
  I: /\.(?:id|i)\s*\(\s*(\d+)\s*\)/gi,

  // Parameterized single qubit gates
  RX: /\.rx\s*\(\s*([^,]+)\s*,\s*(\d+)\s*\)/gi,
  RY: /\.ry\s*\(\s*([^,]+)\s*,\s*(\d+)\s*\)/gi,
  RZ: /\.rz\s*\(\s*([^,]+)\s*,\s*(\d+)\s*\)/gi,
  P: /\.p\s*\(\s*([^,]+)\s*,\s*(\d+)\s*\)/gi,
  U: /\.u\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*(\d+)\s*\)/gi,

  // Two qubit gates
  CX: /\.(?:cx|cnot)\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/gi,
  CY: /\.cy\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/gi,
  CZ: /\.cz\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/gi,
  CH: /\.ch\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/gi,
  SWAP: /\.swap\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/gi,

  // Parameterized two qubit gates
  CRX: /\.crx\s*\(\s*([^,]+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi,
  CRY: /\.cry\s*\(\s*([^,]+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi,
  CRZ: /\.crz\s*\(\s*([^,]+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi,
  CP: /\.cp\s*\(\s*([^,]+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi,

  // Three qubit gates
  CCX: /\.(?:ccx|toffoli)\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi,
  CCZ: /\.ccz\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi,
  CSWAP: /\.(?:cswap|fredkin)\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi,
}

// Parse mathematical expression to number
function evaluateExpression(expr: string): number {
  // Clean up the expression
  expr = expr.trim()

  // Replace common constants
  expr = expr.replace(/np\.pi|math\.pi|pi/gi, String(Math.PI))
  expr = expr.replace(/np\.e|math\.e/gi, String(Math.E))

  // Handle fractions with pi like pi/2, pi/4, etc.
  expr = expr.replace(/(\d*\.?\d*)\s*\*?\s*pi\s*\/\s*(\d+)/gi, (_, mult, denom) => {
    const multiplier = mult ? parseFloat(mult) : 1
    return String(multiplier * Math.PI / parseFloat(denom))
  })

  // Handle basic arithmetic with safe eval
  try {
    // Only allow numbers, operators, parentheses, and spaces
    if (!/^[\d\s\.\+\-\*\/\(\)]+$/.test(expr)) {
      // Try to extract just a number
      const numMatch = expr.match(/-?\d+\.?\d*/)
      if (numMatch) {
        return parseFloat(numMatch[0])
      }
      return 0
    }

    // Safe eval using Function constructor
    const result = new Function(`return ${expr}`)()
    return typeof result === 'number' ? result : 0
  } catch {
    return 0
  }
}

// Extract circuit size from code
function extractCircuitSize(code: string): { qubits: number; classical: number } {
  // Try direct size specification
  const directMatch = code.match(CIRCUIT_SIZE_REGEX)
  if (directMatch) {
    return {
      qubits: parseInt(directMatch[1], 10),
      classical: directMatch[2] ? parseInt(directMatch[2], 10) : parseInt(directMatch[1], 10)
    }
  }

  // Try to find quantum register size
  let maxQubits = 0
  let maxClassical = 0

  const qubitMatches = code.matchAll(QUBIT_REG_REGEX)
  for (const match of qubitMatches) {
    maxQubits = Math.max(maxQubits, parseInt(match[1], 10))
  }

  const classicalMatches = code.matchAll(CLASSICAL_REG_REGEX)
  for (const match of classicalMatches) {
    maxClassical = Math.max(maxClassical, parseInt(match[1], 10))
  }

  // Also check for highest qubit index used in gates
  const allQubitRefs = code.matchAll(/\[\s*(\d+)\s*\]|\(\s*(\d+)\s*[,\)]/g)
  for (const match of allQubitRefs) {
    const idx = parseInt(match[1] || match[2], 10)
    if (!isNaN(idx)) {
      maxQubits = Math.max(maxQubits, idx + 1)
    }
  }

  return {
    qubits: maxQubits || 2, // Default to 2 qubits
    classical: maxClassical || maxQubits || 2
  }
}

// Main parser function
export function parseCircuitCode(code: string): ParseResult {
  try {
    // Extract circuit size
    const { qubits, classical } = extractCircuitSize(code)

    if (qubits > 20) {
      return {
        success: false,
        error: `Circuit uses ${qubits} qubits, but maximum supported is 20`,
        numQubits: qubits,
        numClassicalBits: classical,
        gateCount: 0,
        depth: 0
      }
    }

    const instructions: GateInstruction[] = []

    // Split code into lines and track position for ordering
    const lines = code.split('\n')
    const gateOccurrences: { line: number; col: number; instruction: GateInstruction }[] = []

    // Process each line
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum]

      // Skip comments and empty lines
      if (line.trim().startsWith('#') || line.trim() === '') continue

      // Parse single qubit gates
      for (const gate of ['H', 'X', 'Y', 'Z', 'S', 'SDG', 'T', 'TDG', 'SX', 'I']) {
        const pattern = GATE_PATTERNS[gate]
        pattern.lastIndex = 0 // Reset regex state
        let match
        while ((match = pattern.exec(line)) !== null) {
          const qubit = parseInt(match[1], 10)
          if (qubit < qubits) {
            gateOccurrences.push({
              line: lineNum,
              col: match.index,
              instruction: { gate, qubits: [qubit] }
            })
          }
        }
      }

      // Parse parameterized single qubit gates
      for (const gate of ['RX', 'RY', 'RZ', 'P']) {
        const pattern = GATE_PATTERNS[gate]
        pattern.lastIndex = 0
        let match
        while ((match = pattern.exec(line)) !== null) {
          const param = evaluateExpression(match[1])
          const qubit = parseInt(match[2], 10)
          if (qubit < qubits) {
            gateOccurrences.push({
              line: lineNum,
              col: match.index,
              instruction: { gate, qubits: [qubit], params: [param] }
            })
          }
        }
      }

      // Parse U gate (3 parameters)
      const uPattern = GATE_PATTERNS.U
      uPattern.lastIndex = 0
      let uMatch
      while ((uMatch = uPattern.exec(line)) !== null) {
        const theta = evaluateExpression(uMatch[1])
        const phi = evaluateExpression(uMatch[2])
        const lambda = evaluateExpression(uMatch[3])
        const qubit = parseInt(uMatch[4], 10)
        if (qubit < qubits) {
          gateOccurrences.push({
            line: lineNum,
            col: uMatch.index,
            instruction: { gate: 'U', qubits: [qubit], params: [theta, phi, lambda] }
          })
        }
      }

      // Parse two qubit gates
      for (const gate of ['CX', 'CY', 'CZ', 'CH', 'SWAP']) {
        const pattern = GATE_PATTERNS[gate]
        pattern.lastIndex = 0
        let match
        while ((match = pattern.exec(line)) !== null) {
          const q1 = parseInt(match[1], 10)
          const q2 = parseInt(match[2], 10)
          if (q1 < qubits && q2 < qubits) {
            gateOccurrences.push({
              line: lineNum,
              col: match.index,
              instruction: { gate, qubits: [q1, q2] }
            })
          }
        }
      }

      // Parse parameterized two qubit gates
      for (const gate of ['CRX', 'CRY', 'CRZ', 'CP']) {
        const pattern = GATE_PATTERNS[gate]
        pattern.lastIndex = 0
        let match
        while ((match = pattern.exec(line)) !== null) {
          const param = evaluateExpression(match[1])
          const q1 = parseInt(match[2], 10)
          const q2 = parseInt(match[3], 10)
          if (q1 < qubits && q2 < qubits) {
            gateOccurrences.push({
              line: lineNum,
              col: match.index,
              instruction: { gate, qubits: [q1, q2], params: [param] }
            })
          }
        }
      }

      // Parse three qubit gates
      for (const gate of ['CCX', 'CCZ', 'CSWAP']) {
        const pattern = GATE_PATTERNS[gate]
        pattern.lastIndex = 0
        let match
        while ((match = pattern.exec(line)) !== null) {
          const q1 = parseInt(match[1], 10)
          const q2 = parseInt(match[2], 10)
          const q3 = parseInt(match[3], 10)
          if (q1 < qubits && q2 < qubits && q3 < qubits) {
            gateOccurrences.push({
              line: lineNum,
              col: match.index,
              instruction: { gate, qubits: [q1, q2, q3] }
            })
          }
        }
      }
    }

    // Sort by position in code (line first, then column)
    gateOccurrences.sort((a, b) => {
      if (a.line !== b.line) return a.line - b.line
      return a.col - b.col
    })

    // Extract sorted instructions
    for (const occurrence of gateOccurrences) {
      instructions.push(occurrence.instruction)
    }

    // Build circuit
    const circuit = new QuantumCircuit(qubits)
    for (const inst of instructions) {
      circuit.addGate(inst.gate, inst.qubits, inst.params)
    }

    return {
      success: true,
      circuit,
      instructions,
      numQubits: qubits,
      numClassicalBits: classical,
      gateCount: instructions.length,
      depth: circuit.getDepth()
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to parse circuit',
      numQubits: 0,
      numClassicalBits: 0,
      gateCount: 0,
      depth: 0
    }
  }
}

// Analyze circuit without building it (for constraint checking)
export function analyzeCircuit(code: string): {
  gateCount: number
  depth: number
  qubitCount: number
  gateCounts: Record<string, number>
} {
  const result = parseCircuitCode(code)

  if (!result.success || !result.circuit) {
    return {
      gateCount: 0,
      depth: 0,
      qubitCount: result.numQubits,
      gateCounts: {}
    }
  }

  return {
    gateCount: result.gateCount,
    depth: result.depth,
    qubitCount: result.numQubits,
    gateCounts: result.circuit.getGateCounts()
  }
}

// Validate circuit against constraints
export function validateConstraints(
  code: string,
  constraints: {
    maxQubits: number
    maxGateCount: number
    maxCircuitDepth: number
  }
): {
  valid: boolean
  violations: string[]
  analysis: ReturnType<typeof analyzeCircuit>
} {
  const analysis = analyzeCircuit(code)
  const violations: string[] = []

  if (analysis.qubitCount > constraints.maxQubits) {
    violations.push(
      `Circuit uses ${analysis.qubitCount} qubits but maximum is ${constraints.maxQubits}`
    )
  }

  if (analysis.gateCount > constraints.maxGateCount) {
    violations.push(
      `Circuit has ${analysis.gateCount} gates but maximum is ${constraints.maxGateCount}`
    )
  }

  if (analysis.depth > constraints.maxCircuitDepth) {
    violations.push(
      `Circuit depth is ${analysis.depth} but maximum is ${constraints.maxCircuitDepth}`
    )
  }

  return {
    valid: violations.length === 0,
    violations,
    analysis
  }
}

export default parseCircuitCode

import { Circuit, PlacedGate, GateType } from '../types/circuit'

// Format a number for Qiskit (handle pi expressions)
function formatParam(value: number): string {
  const PI = Math.PI

  // Check for common pi fractions (use 'pi' which is provided in namespace)
  if (Math.abs(value - PI) < 0.0001) return 'pi'
  if (Math.abs(value - PI / 2) < 0.0001) return 'pi/2'
  if (Math.abs(value - PI / 4) < 0.0001) return 'pi/4'
  if (Math.abs(value - PI / 3) < 0.0001) return 'pi/3'
  if (Math.abs(value - PI / 6) < 0.0001) return 'pi/6'
  if (Math.abs(value + PI) < 0.0001) return '-pi'
  if (Math.abs(value + PI / 2) < 0.0001) return '-pi/2'
  if (Math.abs(value + PI / 4) < 0.0001) return '-pi/4'
  if (Math.abs(value - 2 * PI) < 0.0001) return '2*pi'

  // Otherwise just return the number
  return value.toFixed(6).replace(/\.?0+$/, '')
}

// Generate base gate code (without condition)
function generateBaseGateCode(gate: PlacedGate): string {
  const { type, qubits, params, classicalBit } = gate

  const paramStr = params?.map(formatParam).join(', ') || ''
  const qubitStr = qubits.join(', ')

  const gateMap: Record<GateType, () => string> = {
    // Single-qubit Pauli gates
    X: () => `qc.x(${qubitStr})`,
    Y: () => `qc.y(${qubitStr})`,
    Z: () => `qc.z(${qubitStr})`,
    I: () => `qc.id(${qubitStr})`,

    // Hadamard
    H: () => `qc.h(${qubitStr})`,

    // Phase gates
    S: () => `qc.s(${qubitStr})`,
    Sdg: () => `qc.sdg(${qubitStr})`,
    T: () => `qc.t(${qubitStr})`,
    Tdg: () => `qc.tdg(${qubitStr})`,
    P: () => `qc.p(${paramStr}, ${qubitStr})`,

    // Sqrt-X gates
    SX: () => `qc.sx(${qubitStr})`,
    SXdg: () => `qc.sxdg(${qubitStr})`,

    // Rotation gates
    RX: () => `qc.rx(${paramStr}, ${qubitStr})`,
    RY: () => `qc.ry(${paramStr}, ${qubitStr})`,
    RZ: () => `qc.rz(${paramStr}, ${qubitStr})`,

    // Universal gate
    U: () => `qc.u(${paramStr}, ${qubitStr})`,

    // Two-qubit controlled gates
    CX: () => `qc.cx(${qubits[0]}, ${qubits[1]})`,
    CY: () => `qc.cy(${qubits[0]}, ${qubits[1]})`,
    CZ: () => `qc.cz(${qubits[0]}, ${qubits[1]})`,
    CH: () => `qc.ch(${qubits[0]}, ${qubits[1]})`,

    // Two-qubit controlled rotation gates
    CRX: () => `qc.crx(${paramStr}, ${qubits[0]}, ${qubits[1]})`,
    CRY: () => `qc.cry(${paramStr}, ${qubits[0]}, ${qubits[1]})`,
    CRZ: () => `qc.crz(${paramStr}, ${qubits[0]}, ${qubits[1]})`,
    CP: () => `qc.cp(${paramStr}, ${qubits[0]}, ${qubits[1]})`,

    // Swap gates
    SWAP: () => `qc.swap(${qubits[0]}, ${qubits[1]})`,
    iSWAP: () => `qc.iswap(${qubits[0]}, ${qubits[1]})`,

    // Three-qubit gates
    CCX: () => `qc.ccx(${qubits[0]}, ${qubits[1]}, ${qubits[2]})`,
    CSWAP: () => `qc.cswap(${qubits[0]}, ${qubits[1]}, ${qubits[2]})`,

    // Measurement
    MEASURE: () => `qc.measure(${qubits[0]}, ${classicalBit ?? qubits[0]})`,

    // Dynamic circuit operations
    RESET: () => `qc.reset(${qubitStr})`,
    BARRIER: () => qubits.length > 1 ? `qc.barrier(${qubitStr})` : `qc.barrier(${qubitStr})`,
    IF_ELSE: () => '', // Handled separately
  }

  return gateMap[type]()
}

// Generate Qiskit code for a gate, including conditional execution
function generateGateCode(gate: PlacedGate, indent: string = ''): string[] {
  const lines: string[] = []

  // Handle IF_ELSE blocks (Qiskit 1.0+ style with if_test)
  if (gate.type === 'IF_ELSE') {
    const cbit = gate.condition?.classicalBit ?? 0
    const value = gate.condition?.value ?? 1

    lines.push(`${indent}# Conditional block based on classical bit ${cbit}`)
    lines.push(`${indent}with qc.if_test((qc.clbits[${cbit}], ${value})):`)

    if (gate.ifGates && gate.ifGates.length > 0) {
      for (const ifGate of gate.ifGates) {
        lines.push(...generateGateCode(ifGate, indent + '    '))
      }
    } else {
      lines.push(`${indent}    pass  # Add gates here`)
    }

    if (gate.elseGates && gate.elseGates.length > 0) {
      lines.push(`${indent}with qc.if_test((qc.clbits[${cbit}], ${1 - value})):`)
      for (const elseGate of gate.elseGates) {
        lines.push(...generateGateCode(elseGate, indent + '    '))
      }
    }

    return lines
  }

  // Handle regular gates with optional c_if condition
  const baseCode = generateBaseGateCode(gate)

  if (gate.condition) {
    // Use c_if for conditional execution (legacy style, works in all Qiskit versions)
    const cbit = gate.condition.classicalBit
    const value = gate.condition.value
    lines.push(`${indent}${baseCode.replace(')', '')}.c_if(qc.clbits[${cbit}], ${value}))`.replace(').c_if', '.c_if'))

    // Actually, let's use the cleaner approach
    lines.pop()
    lines.push(`${indent}# Conditional gate: execute if c[${cbit}] == ${value}`)
    lines.push(`${indent}with qc.if_test((qc.clbits[${cbit}], ${value})):`)
    lines.push(`${indent}    ${baseCode}`)
  } else {
    lines.push(`${indent}${baseCode}`)
  }

  return lines
}

// Check if circuit uses dynamic features
function hasDynamicFeatures(gates: PlacedGate[]): boolean {
  return gates.some(g =>
    g.type === 'RESET' ||
    g.type === 'IF_ELSE' ||
    g.condition !== undefined ||
    (g.type === 'MEASURE' && gates.some(other => other.column > g.column && other.type !== 'MEASURE'))
  )
}

// Compile a Circuit to Qiskit Python code
export function compileToQiskit(circuit: Circuit): string {
  const { numQubits, numClassicalBits, gates } = circuit

  // Sort gates by column (time step)
  const sortedGates = [...gates].sort((a, b) => a.column - b.column)

  // Check if circuit uses dynamic features
  const isDynamic = hasDynamicFeatures(sortedGates)

  // Build the code
  const lines: string[] = []

  // Header comment (no imports - handled by backend)
  lines.push('# Quantum Circuit Definition')
  lines.push('# Imports and simulation are handled automatically by the backend')
  lines.push('')

  // Add dynamic circuit comment if applicable
  if (isDynamic) {
    lines.push('# Dynamic Circuit - uses mid-circuit measurement and/or classical feedforward')
    lines.push('# Requires Qiskit 1.0+ and compatible backend (e.g., IBM Brisbane)')
    lines.push('')
  }

  // Create circuit
  lines.push(`# Create quantum circuit with ${numQubits} qubit(s) and ${numClassicalBits} classical bit(s)`)
  lines.push(`qc = QuantumCircuit(${numQubits}, ${numClassicalBits})`)
  lines.push('')

  // Add gates
  if (sortedGates.length > 0) {
    lines.push('# Apply quantum gates')

    let currentColumn = -1
    for (const gate of sortedGates) {
      // Add blank line between different time steps for readability
      if (gate.column !== currentColumn && currentColumn !== -1) {
        lines.push('')
      }
      currentColumn = gate.column

      // generateGateCode now returns an array of lines
      const gateLines = generateGateCode(gate, '')
      lines.push(...gateLines)
    }
    lines.push('')
  }

  // Add comment about visualization
  lines.push('# Draw the circuit')
  lines.push('print(qc.draw())')

  return lines.join('\n')
}

// Parse a parameter string that might contain pi notation
export function parseParameter(input: string): number {
  const trimmed = input.trim().toLowerCase()

  // Handle empty input
  if (!trimmed) return 0

  // Replace pi with actual value
  let expression = trimmed
    .replace(/π/g, String(Math.PI))
    .replace(/pi/g, String(Math.PI))

  // Handle simple fractions like "pi/2" or "π/4"
  try {
    // Use Function constructor to evaluate the expression safely
    const result = new Function(`return ${expression}`)()
    if (typeof result === 'number' && !isNaN(result)) {
      return result
    }
  } catch {
    // If evaluation fails, try parsing as a plain number
  }

  // Try parsing as a plain number
  const num = parseFloat(trimmed)
  if (!isNaN(num)) {
    return num
  }

  // Default to 0 if nothing works
  return 0
}

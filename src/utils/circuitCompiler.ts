import { Circuit, PlacedGate, GateType, generateGateId } from '../types/circuit'

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
export function compileToQiskit(circuit: Circuit, postSelect?: string, initialLayout?: string): string {
  const { numQubits, gates } = circuit
  // Ensure classical bits always match quantum qubits
  const numClassicalBits = Math.max(circuit.numClassicalBits, numQubits)

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

  // Add POST_SELECT if provided
  if (postSelect && postSelect.trim()) {
    lines.push('# Post-selection condition:')
    lines.push('# Only shots where ancilla bits match a string in POST_SELECT are kept.')
    lines.push(`POST_SELECT = ${postSelect}`)
  }

  // Add INITIAL_LAYOUT if provided
  if (initialLayout && initialLayout.trim()) {
    lines.push('')
    lines.push('# Qubit layout: maps logical qubits to physical qubits on hardware.')
    lines.push('# If not specified, the transpiler chooses automatically (optimization_level=3).')
    lines.push(`INITIAL_LAYOUT = ${initialLayout}`)
  }

  return lines.join('\n')
}

// ============ Decompiler: Qiskit code → Circuit object ============

// Evaluate a parameter expression (pi/2, np.pi, etc.) to a number
function evaluateParamExpr(expr: string): number {
  expr = expr.trim()
  // Replace pi constants
  expr = expr.replace(/np\.pi|math\.pi/gi, String(Math.PI))
  expr = expr.replace(/\bpi\b/gi, String(Math.PI))
  expr = expr.replace(/np\.e|math\.e/gi, String(Math.E))
  try {
    if (/^[\d\s.\+\-\*\/\(\)e]+$/i.test(expr)) {
      const result = new Function(`return ${expr}`)()
      if (typeof result === 'number' && !isNaN(result)) return result
    }
  } catch { /* fall through */ }
  const num = parseFloat(expr)
  return isNaN(num) ? 0 : num
}

// Gate regex patterns for decompilation (method call → GateType + qubit extraction)
interface GatePattern {
  regex: RegExp
  type: GateType
  extract: (match: RegExpMatchArray) => { qubits: number[]; params?: number[]; classicalBit?: number }
}

function buildGatePatterns(): GatePattern[] {
  // Helper to build single-qubit gate pattern
  const sq = (method: string, type: GateType): GatePattern => ({
    regex: new RegExp(`\\.${method}\\s*\\(\\s*(\\d+)\\s*\\)`),
    type,
    extract: (m) => ({ qubits: [parseInt(m[1])] }),
  })
  // Single-qubit with 1 param: .rx(param, qubit)
  const sq1p = (method: string, type: GateType): GatePattern => ({
    regex: new RegExp(`\\.${method}\\s*\\(\\s*([^,]+)\\s*,\\s*(\\d+)\\s*\\)`),
    type,
    extract: (m) => ({ qubits: [parseInt(m[2])], params: [evaluateParamExpr(m[1])] }),
  })
  // Two-qubit gate: .cx(q1, q2)
  const tq = (method: string, type: GateType): GatePattern => ({
    regex: new RegExp(`\\.${method}\\s*\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)`),
    type,
    extract: (m) => ({ qubits: [parseInt(m[1]), parseInt(m[2])] }),
  })
  // Two-qubit with 1 param: .crx(param, q1, q2)
  const tq1p = (method: string, type: GateType): GatePattern => ({
    regex: new RegExp(`\\.${method}\\s*\\(\\s*([^,]+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)`),
    type,
    extract: (m) => ({ qubits: [parseInt(m[2]), parseInt(m[3])], params: [evaluateParamExpr(m[1])] }),
  })
  // Three-qubit gate: .ccx(q1, q2, q3)
  const thq = (method: string, type: GateType): GatePattern => ({
    regex: new RegExp(`\\.${method}\\s*\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)`),
    type,
    extract: (m) => ({ qubits: [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] }),
  })

  return [
    // Single-qubit
    sq('h', 'H'), sq('x', 'X'), sq('y', 'Y'), sq('z', 'Z'),
    sq('s', 'S'), sq('sdg', 'Sdg'), sq('t', 'T'), sq('tdg', 'Tdg'),
    sq('sx', 'SX'), sq('sxdg', 'SXdg'),
    sq('(?:id|i)', 'I'), sq('reset', 'RESET'),
    // Single-qubit with params
    sq1p('rx', 'RX'), sq1p('ry', 'RY'), sq1p('rz', 'RZ'), sq1p('p', 'P'),
    // U gate: .u(theta, phi, lambda, qubit)
    {
      regex: /\.u\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*(\d+)\s*\)/,
      type: 'U' as GateType,
      extract: (m: RegExpMatchArray) => ({
        qubits: [parseInt(m[4])],
        params: [evaluateParamExpr(m[1]), evaluateParamExpr(m[2]), evaluateParamExpr(m[3])],
      }),
    },
    // Two-qubit
    tq('cx', 'CX'), tq('cnot', 'CX'), tq('cy', 'CY'), tq('cz', 'CZ'), tq('ch', 'CH'),
    tq('swap', 'SWAP'), tq('iswap', 'iSWAP'),
    // Two-qubit with params
    tq1p('crx', 'CRX'), tq1p('cry', 'CRY'), tq1p('crz', 'CRZ'), tq1p('cp', 'CP'),
    // Three-qubit
    thq('ccx', 'CCX'), thq('toffoli', 'CCX'),
    thq('cswap', 'CSWAP'), thq('fredkin', 'CSWAP'),
    // Measurement: .measure(qubit, cbit)
    {
      regex: /\.measure\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/,
      type: 'MEASURE' as GateType,
      extract: (m: RegExpMatchArray) => ({
        qubits: [parseInt(m[1])],
        classicalBit: parseInt(m[2]),
      }),
    },
    // Measure with list syntax: .measure([0, 1, 2, 3], [0, 1, 2, 3])
    // Handled separately below
  ]
}

const DECOMPILE_PATTERNS = buildGatePatterns()

/**
 * Decompile Qiskit Python code into a Circuit object for the visual composer.
 * Returns null if the code can't be meaningfully parsed.
 */
export function decompileToCircuit(code: string): { circuit: Circuit; postSelect: string | null; initialLayout: string | null } | null {
  try {
    const lines = code.split('\n')
    let numQubits = 2
    let numClassicalBits = 2
    let postSelect: string | null = null
    let initialLayout: string | null = null
    const gates: PlacedGate[] = []

    // Track next available column per qubit for scheduling
    const nextColumn: number[] = []

    const getNextCol = (qubits: number[]): number => {
      let maxCol = 0
      for (const q of qubits) {
        while (nextColumn.length <= q) nextColumn.push(0)
        maxCol = Math.max(maxCol, nextColumn[q])
      }
      return maxCol
    }

    const advanceCols = (qubits: number[], col: number) => {
      for (const q of qubits) {
        while (nextColumn.length <= q) nextColumn.push(0)
        nextColumn[q] = col + 1
      }
    }

    for (const line of lines) {
      const trimmed = line.trim()

      // Skip comments and empty lines
      if (trimmed.startsWith('#') || trimmed === '') continue

      // Extract circuit size: QuantumCircuit(N, M) or QuantumCircuit(N)
      const circuitMatch = trimmed.match(/QuantumCircuit\s*\(\s*(\d+)\s*(?:,\s*(\d+))?\s*\)/)
      if (circuitMatch) {
        numQubits = parseInt(circuitMatch[1])
        numClassicalBits = circuitMatch[2] ? Math.max(parseInt(circuitMatch[2]), numQubits) : numQubits
        continue
      }

      // Extract POST_SELECT = {...}
      const postSelectMatch = trimmed.match(/^POST_SELECT\s*=\s*(\{[^}]*\})/)
      if (postSelectMatch) {
        postSelect = postSelectMatch[1]
        continue
      }

      // Extract INITIAL_LAYOUT = [...]
      const layoutMatch = trimmed.match(/^INITIAL_LAYOUT\s*=\s*(\[[^\]]*\])/)
      if (layoutMatch) {
        initialLayout = layoutMatch[1]
        continue
      }

      // Handle measure_all()
      if (/\.measure_all\s*\(\s*\)/.test(trimmed)) {
        for (let q = 0; q < numQubits; q++) {
          const col = getNextCol([q])
          gates.push({
            id: generateGateId(),
            type: 'MEASURE',
            qubits: [q],
            classicalBit: q,
            column: col,
          })
          advanceCols([q], col)
        }
        continue
      }

      // Handle measure with list syntax: .measure([0, 1, 2, 3], [0, 1, 2, 3])
      const measureListMatch = trimmed.match(/\.measure\s*\(\s*\[([^\]]*)\]\s*,\s*\[([^\]]*)\]\s*\)/)
      if (measureListMatch) {
        const qubits = measureListMatch[1].split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
        const cbits = measureListMatch[2].split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
        for (let i = 0; i < qubits.length; i++) {
          const col = getNextCol([qubits[i]])
          gates.push({
            id: generateGateId(),
            type: 'MEASURE',
            qubits: [qubits[i]],
            classicalBit: cbits[i] ?? qubits[i],
            column: col,
          })
          advanceCols([qubits[i]], col)
        }
        continue
      }

      // Handle barrier with args: .barrier(0, 1, 2, 3) or .barrier()
      const barrierMatch = trimmed.match(/\.barrier\s*\(\s*([^)]*)\s*\)/)
      if (barrierMatch) {
        let barrierQubits: number[]
        if (barrierMatch[1].trim() === '') {
          barrierQubits = Array.from({ length: numQubits }, (_, i) => i)
        } else {
          barrierQubits = barrierMatch[1].split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
        }
        if (barrierQubits.length > 0) {
          const col = getNextCol(barrierQubits)
          gates.push({
            id: generateGateId(),
            type: 'BARRIER',
            qubits: barrierQubits,
            column: col,
          })
          advanceCols(barrierQubits, col)
        }
        continue
      }

      // Try each gate pattern
      let matched = false
      for (const pattern of DECOMPILE_PATTERNS) {
        const match = trimmed.match(pattern.regex)
        if (match) {
          const { qubits, params, classicalBit } = pattern.extract(match)
          // Ensure all qubits are in range
          if (qubits.every(q => q < numQubits)) {
            const col = getNextCol(qubits)
            gates.push({
              id: generateGateId(),
              type: pattern.type,
              qubits,
              params,
              classicalBit,
              column: col,
            })
            advanceCols(qubits, col)
          }
          matched = true
          break
        }
      }

      // Lines we don't understand are simply skipped (imports, print, variable assignments, etc.)
      if (!matched) continue
    }

    // If we didn't find any gates, parsing might have failed
    if (gates.length === 0 && !code.includes('QuantumCircuit')) {
      return null
    }

    return {
      circuit: {
        numQubits,
        numClassicalBits,
        gates,
      },
      postSelect,
      initialLayout,
    }
  } catch {
    return null
  }
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

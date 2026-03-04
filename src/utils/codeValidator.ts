/**
 * Frontend code validator for homework submissions.
 * Ensures students only use allowed constructs (gates on qc, POST_SELECT, comments).
 * Blocks imports, print, exec, and other arbitrary Python for security.
 */

import { Circuit } from '../types/circuit'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface AncillaMeasurementInfo {
  /** Number of ancilla measurements (all measurements except on q0 and q1) */
  ancillaCount: number
  /** Classical bit indices of ancilla measurements, sorted descending (Qiskit convention: MSB first) */
  ancillaClassicalBits: number[]
  /** Total number of measurements in the circuit */
  totalMeasurements: number
}

interface MeasurementEntry {
  qubit: number
  classicalBit: number
}

/**
 * Extract all measurements from code and identify ancilla measurements.
 * Ancilla count is always numQubits - 2 (all qubits except q0 and q1 are ancilla).
 * If explicit measurements are placed, uses their classical bit mapping for ordering;
 * otherwise derives default mapping (q2->c2, q3->c3, etc.).
 */
export function extractMeasurementsFromCode(code: string): AncillaMeasurementInfo {
  const measurements: MeasurementEntry[] = []
  let numQubits = 2

  const lines = code.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#') || trimmed === '') continue

    // Extract circuit size
    const circuitMatch = trimmed.match(/QuantumCircuit\s*\(\s*(\d+)/)
    if (circuitMatch) {
      numQubits = parseInt(circuitMatch[1])
    }

    // Single: qc.measure(q, c)
    const singleMatch = trimmed.match(/\.measure\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/)
    if (singleMatch) {
      measurements.push({ qubit: parseInt(singleMatch[1]), classicalBit: parseInt(singleMatch[2]) })
      continue
    }

    // List: qc.measure([...], [...])
    const listMatch = trimmed.match(/\.measure\s*\(\s*\[([^\]]*)\]\s*,\s*\[([^\]]*)\]\s*\)/)
    if (listMatch) {
      const qubits = listMatch[1].split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
      const cbits = listMatch[2].split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
      for (let i = 0; i < qubits.length; i++) {
        measurements.push({ qubit: qubits[i], classicalBit: cbits[i] ?? qubits[i] })
      }
      continue
    }

    // measure_all: qc.measure_all()
    if (/\.measure_all\s*\(\s*\)/.test(trimmed)) {
      for (let q = 0; q < numQubits; q++) {
        measurements.push({ qubit: q, classicalBit: q })
      }
      continue
    }
  }

  // Ancilla count is based on total qubits, not placed measurements
  const ancillaCount = Math.max(0, numQubits - 2)

  // Use explicit measurements for bit ordering if they exist
  const ancillaMeasurements = measurements.filter(m => m.qubit !== 0 && m.qubit !== 1)
  let ancillaBits: number[]
  if (ancillaMeasurements.length === ancillaCount) {
    ancillaBits = ancillaMeasurements.map(m => m.classicalBit).sort((a, b) => b - a)
  } else {
    // Default mapping: q2->c2, q3->c3, ...
    ancillaBits = Array.from({ length: ancillaCount }, (_, i) => i + 2).sort((a, b) => b - a)
  }

  return {
    ancillaCount,
    ancillaClassicalBits: ancillaBits,
    totalMeasurements: measurements.length,
  }
}

/**
 * Extract ancilla measurement info from a Circuit object (for composer mode).
 * Uses numQubits - 2 as the ancilla count (all qubits except q0 and q1 are ancilla).
 * If MEASURE gates are placed, uses their classical bit mapping for bit order labels;
 * otherwise derives the default mapping (q2->c2, q3->c3, etc.).
 */
export function extractMeasurementsFromCircuit(circuit: Circuit): AncillaMeasurementInfo {
  const ancillaCount = Math.max(0, circuit.numQubits - 2)

  // Try to get bit mapping from placed MEASURE gates
  const measureGates = circuit.gates.filter(g => g.type === 'MEASURE')
  const ancillaMeasures = measureGates.filter(g => g.qubits[0] !== 0 && g.qubits[0] !== 1)

  let ancillaBits: number[]
  if (ancillaMeasures.length === ancillaCount) {
    // All ancilla have MEASURE gates placed — use their classical bit assignments
    ancillaBits = ancillaMeasures.map(g => g.classicalBit ?? g.qubits[0]).sort((a, b) => b - a)
  } else {
    // Default mapping: ancilla qubit q maps to classical bit c (q2->c2, q3->c3, ...)
    ancillaBits = Array.from({ length: ancillaCount }, (_, i) => i + 2).sort((a, b) => b - a)
  }

  return {
    ancillaCount,
    ancillaClassicalBits: ancillaBits,
    totalMeasurements: measureGates.length,
  }
}

/**
 * Parse POST_SELECT string value (e.g. '{"00", "11"}') and extract the bitstrings.
 */
export function parsePostSelectStrings(postSelectValue: string): string[] {
  const content = postSelectValue.replace(/^\{/, '').replace(/\}$/, '')
  const matches = content.match(/["']([^"']+)["']/g)
  if (!matches) return []
  return matches.map(s => s.replace(/["']/g, ''))
}

/**
 * Validate POST_SELECT length against ancilla count (numQubits - 2).
 * Returns errors if any POST_SELECT string has wrong length.
 */
export function validatePostSelectLength(
  postSelectValue: string,
  ancillaInfo: AncillaMeasurementInfo,
): string[] {
  const errors: string[] = []
  const strings = parsePostSelectStrings(postSelectValue)

  if (strings.length === 0) return errors

  if (ancillaInfo.ancillaCount === 0) {
    errors.push(
      'POST_SELECT is defined but there are no ancilla qubits (only q0 and q1). ' +
      'Add more qubits or remove POST_SELECT.'
    )
    return errors
  }

  for (const s of strings) {
    if (!/^[01]+$/.test(s)) {
      errors.push(`POST_SELECT string "${s}" must only contain '0' and '1' characters.`)
    }
    if (s.length !== ancillaInfo.ancillaCount) {
      errors.push(
        `POST_SELECT string "${s}" has length ${s.length}, but there are ${ancillaInfo.ancillaCount} ancilla qubit(s) (qubits 2..${ancillaInfo.ancillaCount + 1}). ` +
        `Each string must have exactly ${ancillaInfo.ancillaCount} character(s).`
      )
    }
  }

  return errors
}

// Allowed gate method calls on qc
const ALLOWED_GATE_METHODS = new Set([
  'h', 'x', 'y', 'z', 's', 'sdg', 't', 'tdg', 'sx', 'sxdg', 'id', 'i',
  'rx', 'ry', 'rz', 'p', 'u',
  'cx', 'cnot', 'cy', 'cz', 'ch',
  'crx', 'cry', 'crz', 'cp',
  'swap', 'iswap',
  'ccx', 'toffoli', 'cswap', 'fredkin',
  'measure', 'measure_all', 'barrier', 'reset',
  'draw',
])

// Dangerous builtins / keywords that should never appear as function calls
const BLOCKED_FUNCTIONS = [
  'import', 'from', '__import__',
  'exec', 'eval', 'compile',
  'open', 'input',
  'os', 'sys', 'subprocess', 'shutil',
  'globals', 'locals', 'vars', 'dir',
  'getattr', 'setattr', 'delattr',
  '__builtins__',
]

// Blocked statement keywords (at start of line)
const BLOCKED_KEYWORDS = [
  'import ', 'from ',
  'def ', 'class ', 'async ',
  'yield ', 'yield(',
  'raise ',
  'try:', 'except ', 'except:',
  'with ',
  'lambda ',
  'global ', 'nonlocal ',
  'del ',
  'assert ',
]

/**
 * Validate that the code only contains allowed constructs:
 * - QuantumCircuit(N, M) creation
 * - Gate calls on qc (qc.h, qc.cx, etc.)
 * - POST_SELECT = {...}
 * - Comments and blank lines
 * - print(qc.draw()) for debugging
 * - Variable assignments for parameters (e.g., theta = pi/2)
 */
export function validateCircuitCode(code: string): ValidationResult {
  const errors: string[] = []
  const lines = code.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1
    const line = lines[i]
    const trimmed = line.trim()

    // Allow empty lines and comments
    if (trimmed === '' || trimmed.startsWith('#')) continue

    // Check for blocked keywords at start of line
    const blockedKeyword = BLOCKED_KEYWORDS.find(kw => trimmed.startsWith(kw))
    if (blockedKeyword) {
      errors.push(`Line ${lineNum}: "${blockedKeyword.trim()}" statements are not allowed`)
      continue
    }

    // Check for dangerous function calls anywhere in the line
    for (const fn of BLOCKED_FUNCTIONS) {
      // Match the function name followed by ( or as a standalone import keyword
      const fnPattern = new RegExp(`\\b${fn}\\s*\\(`, 'i')
      if (fnPattern.test(trimmed)) {
        errors.push(`Line ${lineNum}: "${fn}()" is not allowed`)
        break
      }
    }

    // Allow QuantumCircuit creation: qc = QuantumCircuit(N, M)
    if (/^\w+\s*=\s*QuantumCircuit\s*\(/.test(trimmed)) continue

    // Allow POST_SELECT assignment: POST_SELECT = {"00", "11"}
    if (/^POST_SELECT\s*=\s*\{/.test(trimmed)) continue

    // Allow INITIAL_LAYOUT assignment: INITIAL_LAYOUT = [0, 1, 2, 3]
    if (/^INITIAL_LAYOUT\s*=\s*\[/.test(trimmed)) continue

    // Allow print(qc.draw()) for debugging
    if (/^print\s*\(\s*qc\.draw\s*\(/.test(trimmed)) continue

    // Allow qc.method(...) calls — validate the method name
    const methodMatch = trimmed.match(/^qc\.(\w+)\s*\(/)
    if (methodMatch) {
      const method = methodMatch[1].toLowerCase()
      if (!ALLOWED_GATE_METHODS.has(method)) {
        errors.push(`Line ${lineNum}: "qc.${methodMatch[1]}()" is not a supported gate operation`)
      }
      continue
    }

    // Allow simple numeric variable assignments for parameters
    // e.g., theta = pi/2, angle = 3.14, n = 4
    if (/^\w+\s*=\s*[\d\w\.\+\-\*\/\(\)\s]+$/.test(trimmed)) {
      // But block if it looks like a function call (other than QuantumCircuit)
      if (/=\s*\w+\s*\(/.test(trimmed) && !/QuantumCircuit/.test(trimmed)) {
        errors.push(`Line ${lineNum}: Function calls in assignments are not allowed`)
      }
      continue
    }

    // Allow "pass" keyword (used in conditional blocks)
    if (trimmed === 'pass') continue

    // Allow if_test blocks for dynamic circuits
    if (/^with\s+qc\.if_test\s*\(/.test(trimmed)) continue

    // Anything else is suspicious
    errors.push(`Line ${lineNum}: Unrecognized statement — only gate operations on qc, POST_SELECT, and comments are allowed`)
  }

  // ---- POST_SELECT length validation ----
  const ancillaInfo = extractMeasurementsFromCode(code)
  const postSelectMatch = code.match(/POST_SELECT\s*=\s*(\{[^}]*\})/)
  if (postSelectMatch) {
    const psErrors = validatePostSelectLength(postSelectMatch[1], ancillaInfo)
    errors.push(...psErrors)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

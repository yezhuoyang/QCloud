/**
 * Simulation Service
 * Provides quantum circuit simulation for all pages
 */

import { parseCircuitCode } from './circuitParser'
import { QuantumSimulator } from './quantumSimulator'
import { Circuit } from '../types/circuit'
import { compileToQiskit } from './circuitCompiler'

export interface SimulationResult {
  success: boolean
  error?: string
  measurements: Record<string, number>
  probabilities: Record<string, number>
  numQubits: number
  gateCount: number
  circuitDepth: number
  executionTime: number
  shots: number
  stateVector?: string | Array<{ re: number; im: number }>
  backend?: string  // 'aer_simulator' | 'local' | etc.
}

export interface SimulationOptions {
  shots?: number
  includeStateVector?: boolean
}

/**
 * Run simulation on Qiskit-style code
 */
export function simulateCode(
  code: string,
  options: SimulationOptions = {}
): SimulationResult {
  const { shots = 1024, includeStateVector = false } = options
  const startTime = performance.now()

  try {
    // Parse the circuit
    const parseResult = parseCircuitCode(code)

    if (!parseResult.success || !parseResult.circuit) {
      return {
        success: false,
        error: parseResult.error || 'Failed to parse circuit code',
        measurements: {},
        probabilities: {},
        numQubits: 0,
        gateCount: 0,
        circuitDepth: 0,
        executionTime: 0,
        shots: 0
      }
    }

    // Create simulator and run circuit
    const simulator = new QuantumSimulator(parseResult.numQubits)
    const state = simulator.run(parseResult.circuit)

    // Get measurements
    const measurements = state.sample(shots)

    // Calculate probabilities
    const probabilities: Record<string, number> = {}
    for (const [bitstring, count] of Object.entries(measurements)) {
      probabilities[bitstring] = count / shots
    }

    // Get state vector string if requested
    let stateVector: string | undefined
    if (includeStateVector && parseResult.numQubits <= 6) {
      stateVector = state.toString()
    }

    const executionTime = performance.now() - startTime

    return {
      success: true,
      measurements,
      probabilities,
      numQubits: parseResult.numQubits,
      gateCount: parseResult.gateCount,
      circuitDepth: parseResult.depth,
      executionTime: Math.round(executionTime),
      shots,
      stateVector
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Simulation failed',
      measurements: {},
      probabilities: {},
      numQubits: 0,
      gateCount: 0,
      circuitDepth: 0,
      executionTime: performance.now() - startTime,
      shots: 0
    }
  }
}

/**
 * Run simulation on a visual circuit (from Circuit Composer)
 */
export function simulateCircuit(
  circuit: Circuit,
  options: SimulationOptions = {}
): SimulationResult {
  // Compile circuit to Qiskit code first
  const code = compileToQiskit(circuit)
  return simulateCode(code, options)
}

/**
 * Format measurement results for display
 */
export function formatMeasurements(
  measurements: Record<string, number>,
  shots: number
): { bitstring: string; count: number; probability: number }[] {
  return Object.entries(measurements)
    .map(([bitstring, count]) => ({
      bitstring,
      count,
      probability: count / shots
    }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Get the most probable outcome(s)
 */
export function getMostProbableOutcomes(
  measurements: Record<string, number>,
  threshold: number = 0.1
): string[] {
  const total = Object.values(measurements).reduce((sum, c) => sum + c, 0)
  return Object.entries(measurements)
    .filter(([, count]) => count / total >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([bitstring]) => bitstring)
}

export default {
  simulateCode,
  simulateCircuit,
  formatMeasurements,
  getMostProbableOutcomes
}

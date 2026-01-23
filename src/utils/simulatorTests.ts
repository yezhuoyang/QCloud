/**
 * Tests for the Quantum Simulator
 * Run these tests to verify the simulator works correctly
 */

import { QuantumState, QuantumCircuit, QuantumSimulator, GATES } from './quantumSimulator'
import { parseCircuitCode } from './circuitParser'

// Test utilities
function assertClose(actual: number, expected: number, tolerance: number = 0.001): boolean {
  const passed = Math.abs(actual - expected) < tolerance
  if (!passed) {
    console.error(`Expected ${expected}, got ${actual}`)
  }
  return passed
}

// Test 1: Basic state initialization
function testStateInitialization(): boolean {
  console.log('Test 1: State Initialization')

  const state = new QuantumState(2)

  // Should be |00⟩
  const prob00 = state.getProbability(0) // |00⟩ = index 0
  const prob01 = state.getProbability(1) // |01⟩ = index 1
  const prob10 = state.getProbability(2) // |10⟩ = index 2
  const prob11 = state.getProbability(3) // |11⟩ = index 3

  const pass = assertClose(prob00, 1) &&
               assertClose(prob01, 0) &&
               assertClose(prob10, 0) &&
               assertClose(prob11, 0)

  console.log(pass ? '  PASS' : '  FAIL')
  return pass
}

// Test 2: Hadamard gate creates superposition
function testHadamardGate(): boolean {
  console.log('Test 2: Hadamard Gate')

  const state = new QuantumState(1)
  state.applySingleQubitGate(0, GATES.H)

  // Should be (|0⟩ + |1⟩)/√2
  const prob0 = state.getProbability(0)
  const prob1 = state.getProbability(1)

  const pass = assertClose(prob0, 0.5) && assertClose(prob1, 0.5)
  console.log(pass ? '  PASS' : '  FAIL')
  return pass
}

// Test 3: X gate flips qubit
function testXGate(): boolean {
  console.log('Test 3: X Gate (NOT)')

  const state = new QuantumState(1)
  state.applySingleQubitGate(0, GATES.X)

  // Should be |1⟩
  const prob0 = state.getProbability(0)
  const prob1 = state.getProbability(1)

  const pass = assertClose(prob0, 0) && assertClose(prob1, 1)
  console.log(pass ? '  PASS' : '  FAIL')
  return pass
}

// Test 4: CNOT gate creates entanglement
function testCNOTGate(): boolean {
  console.log('Test 4: CNOT Gate (Entanglement)')

  const state = new QuantumState(2)

  // Create Bell state: H on q0, then CNOT(0,1)
  state.applySingleQubitGate(0, GATES.H)
  state.applyControlledGate(0, 1, GATES.X)

  // Should be (|00⟩ + |11⟩)/√2
  const prob00 = state.getProbability(0)
  const prob01 = state.getProbability(1)
  const prob10 = state.getProbability(2)
  const prob11 = state.getProbability(3)

  const pass = assertClose(prob00, 0.5) &&
               assertClose(prob01, 0) &&
               assertClose(prob10, 0) &&
               assertClose(prob11, 0.5)

  console.log(pass ? '  PASS' : '  FAIL')
  return pass
}

// Test 5: Z gate applies phase
function testZGate(): boolean {
  console.log('Test 5: Z Gate (Phase)')

  const state = new QuantumState(1)
  // Start with |+⟩ = H|0⟩
  state.applySingleQubitGate(0, GATES.H)
  // Apply Z: Z|+⟩ = |−⟩ = (|0⟩ - |1⟩)/√2
  state.applySingleQubitGate(0, GATES.Z)
  // Apply H: H|−⟩ = |1⟩
  state.applySingleQubitGate(0, GATES.H)

  const prob0 = state.getProbability(0)
  const prob1 = state.getProbability(1)

  const pass = assertClose(prob0, 0) && assertClose(prob1, 1)
  console.log(pass ? '  PASS' : '  FAIL')
  return pass
}

// Test 6: Circuit builder
function testCircuitBuilder(): boolean {
  console.log('Test 6: Circuit Builder')

  const circuit = new QuantumCircuit(2)
  circuit.h(0).cx(0, 1)

  const sim = new QuantumSimulator(2)
  sim.run(circuit)
  const state = sim.getState()

  // Should create Bell state
  const prob00 = state.getProbability(0)
  const prob11 = state.getProbability(3)

  const pass = assertClose(prob00, 0.5) && assertClose(prob11, 0.5)
  console.log(pass ? '  PASS' : '  FAIL')
  return pass
}

// Test 7: Measurement sampling
function testMeasurementSampling(): boolean {
  console.log('Test 7: Measurement Sampling')

  const circuit = new QuantumCircuit(1)
  circuit.h(0)

  const sim = new QuantumSimulator(1)
  const results = sim.runAndSample(circuit, 1000)

  // Should get roughly 50% |0⟩ and 50% |1⟩
  const count0 = results['0'] || 0
  const count1 = results['1'] || 0
  const total = count0 + count1

  // Allow 15% tolerance for statistical variation
  const pass = total === 1000 &&
               count0 > 350 && count0 < 650 &&
               count1 > 350 && count1 < 650

  console.log(`  Results: |0⟩=${count0}, |1⟩=${count1}`)
  console.log(pass ? '  PASS' : '  FAIL')
  return pass
}

// Test 8: Parse Qiskit code
function testCodeParsing(): boolean {
  console.log('Test 8: Code Parsing')

  const code = `
# Define quantum circuit (no imports needed)
qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)
  `

  const result = parseCircuitCode(code)

  const pass = result.success &&
               result.numQubits === 2 &&
               result.gateCount === 2 &&
               result.circuit !== undefined

  console.log(`  Parsed: ${result.gateCount} gates, ${result.numQubits} qubits`)
  console.log(pass ? '  PASS' : '  FAIL')
  return pass
}

// Test 9: Parse and simulate code
function testCodeSimulation(): boolean {
  console.log('Test 9: Code Simulation')

  const code = `
# Define quantum circuit (no imports needed)
qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)
  `

  const result = parseCircuitCode(code)
  if (!result.success || !result.circuit) {
    console.log('  FAIL: Parse failed')
    return false
  }

  const sim = new QuantumSimulator(2)
  const measurements = sim.runAndSample(result.circuit, 1000)

  const count00 = measurements['00'] || 0
  const count11 = measurements['11'] || 0
  const total = count00 + count11

  const pass = total > 900 && count00 > 350 && count11 > 350

  console.log(`  Results: |00⟩=${count00}, |11⟩=${count11}`)
  console.log(pass ? '  PASS' : '  FAIL')
  return pass
}

// Test 10: Toffoli (CCX) gate
function testToffoliGate(): boolean {
  console.log('Test 10: Toffoli Gate')

  const circuit = new QuantumCircuit(3)
  // Set first two qubits to |1⟩
  circuit.x(0).x(1)
  // Toffoli should flip the third qubit
  circuit.ccx(0, 1, 2)

  const sim = new QuantumSimulator(3)
  sim.run(circuit)
  const state = sim.getState()

  // Should be |111⟩ = index 7
  const prob111 = state.getProbability(7)
  const pass = assertClose(prob111, 1)

  console.log(pass ? '  PASS' : '  FAIL')
  return pass
}

// Test 11: SWAP gate
function testSwapGate(): boolean {
  console.log('Test 11: SWAP Gate')

  const circuit = new QuantumCircuit(2)
  // Set q0 to |1⟩
  circuit.x(0)
  // Swap q0 and q1
  circuit.swap(0, 1)

  const sim = new QuantumSimulator(2)
  sim.run(circuit)
  const state = sim.getState()

  // Should be |01⟩ (q1 is now |1⟩) = index 2 (binary 10)
  const prob = state.getProbability(2)
  const pass = assertClose(prob, 1)

  console.log(pass ? '  PASS' : '  FAIL')
  return pass
}

// Test 12: Grover's algorithm pattern (simplified 2-qubit)
function testGroverPattern(): boolean {
  console.log('Test 12: Grover Pattern (2-qubit, target |11⟩)')

  const circuit = new QuantumCircuit(2)

  // Initial superposition
  circuit.h(0).h(1)

  // Oracle: mark |11⟩ by applying phase flip
  circuit.cz(0, 1)

  // Diffusion operator
  circuit.h(0).h(1)
  circuit.x(0).x(1)
  circuit.cz(0, 1)
  circuit.x(0).x(1)
  circuit.h(0).h(1)

  const sim = new QuantumSimulator(2)
  const results = sim.runAndSample(circuit, 1024)

  const count11 = results['11'] || 0

  // After one Grover iteration, |11⟩ should be amplified
  const pass = count11 > 800 // Should be close to 100%

  console.log(`  Results: |11⟩=${count11}/1024`)
  console.log(pass ? '  PASS' : '  FAIL')
  return pass
}

// Run all tests
export function runAllTests(): { passed: number; failed: number } {
  console.log('=== Quantum Simulator Tests ===\n')

  const tests = [
    testStateInitialization,
    testHadamardGate,
    testXGate,
    testCNOTGate,
    testZGate,
    testCircuitBuilder,
    testMeasurementSampling,
    testCodeParsing,
    testCodeSimulation,
    testToffoliGate,
    testSwapGate,
    testGroverPattern
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      if (test()) {
        passed++
      } else {
        failed++
      }
    } catch (error) {
      console.log(`  ERROR: ${error}`)
      failed++
    }
    console.log('')
  }

  console.log('=== Summary ===')
  console.log(`Passed: ${passed}/${tests.length}`)
  console.log(`Failed: ${failed}/${tests.length}`)

  return { passed, failed }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as unknown as { runQuantumTests: typeof runAllTests }).runQuantumTests = runAllTests
}

export default runAllTests

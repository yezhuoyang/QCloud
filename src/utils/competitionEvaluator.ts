import {
  CompetitionProblem,
  Submission,
  SubmissionResult,
  TestCaseResult,
  TestCase,
  ResourceConstraints
} from '../types/competition'
import { Circuit } from '../types/circuit'
import { compileToQiskit } from './circuitCompiler'
import { parseCircuitCode, analyzeCircuit as parseAnalyzeCircuit } from './circuitParser'
import { QuantumSimulator, calculateFidelity } from './quantumSimulator'

// Circuit metrics extracted from code
interface CircuitMetrics {
  gateCount: number
  circuitDepth: number
  qubitCount: number
  twoQubitGateCount: number
}

/**
 * Main evaluation function - evaluates a submission against a problem
 */
export async function evaluateSubmission(
  problem: CompetitionProblem,
  submission: Submission
): Promise<SubmissionResult> {
  const startTime = Date.now()

  // 1. Get the code (compile circuit if needed)
  const code = submission.type === 'code'
    ? submission.code || ''
    : compileToQiskit(submission.circuit as Circuit)

  // 2. Analyze circuit metrics using the parser
  const metrics = analyzeCircuit(code)

  // 3. Check resource constraints
  const { passed: constraintsPassed, violations } = checkConstraints(metrics, problem.constraints)

  // 4. Run test cases with real simulation
  const testResults = await runTestCases(problem.testCases, code, problem)

  // 5. Calculate overall score
  const score = calculateScore(testResults, problem, constraintsPassed)

  // 6. Calculate average fidelity
  const totalFidelity = testResults.reduce((sum, r) => sum + r.fidelity, 0) / testResults.length

  // 7. Generate feedback
  const feedback = generateFeedback(testResults, metrics, problem, constraintsPassed, violations)

  // 8. Determine pass/fail
  const allTestsPassed = testResults.every(r => r.passed)
  const passed = constraintsPassed && allTestsPassed && score >= 60

  return {
    submissionId: submission.id,
    problemId: problem.id,
    problemTitle: problem.title,
    passed,
    score,
    totalFidelity,
    totalGateCount: metrics.gateCount,
    maxCircuitDepth: metrics.circuitDepth,
    qubitCount: metrics.qubitCount,
    testResults,
    constraintsPassed,
    constraintViolations: violations,
    totalExecutionTime: Date.now() - startTime,
    completedAt: new Date().toISOString(),
    feedback
  }
}

/**
 * Analyze circuit code to extract metrics using the real parser
 */
function analyzeCircuit(code: string): CircuitMetrics {
  const analysis = parseAnalyzeCircuit(code)

  // Count two-qubit gates
  const twoQubitGates = ['CX', 'CNOT', 'CY', 'CZ', 'CH', 'SWAP', 'CRX', 'CRY', 'CRZ', 'CP']
  let twoQubitGateCount = 0
  for (const gate of twoQubitGates) {
    twoQubitGateCount += analysis.gateCounts[gate] || 0
  }

  return {
    gateCount: analysis.gateCount,
    circuitDepth: analysis.depth,
    qubitCount: analysis.qubitCount,
    twoQubitGateCount
  }
}

/**
 * Check if circuit metrics satisfy constraints
 */
function checkConstraints(
  metrics: CircuitMetrics,
  constraints: ResourceConstraints
): { passed: boolean; violations: string[] } {
  const violations: string[] = []

  if (metrics.qubitCount > constraints.maxQubits) {
    violations.push(`Qubit count ${metrics.qubitCount} exceeds limit of ${constraints.maxQubits}`)
  }

  if (metrics.gateCount > constraints.maxGateCount) {
    violations.push(`Gate count ${metrics.gateCount} exceeds limit of ${constraints.maxGateCount}`)
  }

  if (metrics.circuitDepth > constraints.maxCircuitDepth) {
    violations.push(`Circuit depth ${metrics.circuitDepth} exceeds limit of ${constraints.maxCircuitDepth}`)
  }

  if (constraints.maxTwoQubitGates !== undefined &&
      metrics.twoQubitGateCount > constraints.maxTwoQubitGates) {
    violations.push(`Two-qubit gate count ${metrics.twoQubitGateCount} exceeds limit of ${constraints.maxTwoQubitGates}`)
  }

  return {
    passed: violations.length === 0,
    violations
  }
}

/**
 * Run test cases against the submitted code using real simulation
 */
async function runTestCases(
  testCases: TestCase[],
  code: string,
  problem: CompetitionProblem
): Promise<TestCaseResult[]> {
  const results: TestCaseResult[] = []

  // Parse the circuit once
  const parseResult = parseCircuitCode(code)

  if (!parseResult.success || !parseResult.circuit) {
    // If parsing fails, return error results for all test cases
    return testCases.map(tc => ({
      testCaseId: tc.id,
      testCaseName: tc.name,
      passed: false,
      fidelity: 0,
      gateCount: 0,
      circuitDepth: 0,
      executionTime: 0,
      errorMessage: parseResult.error || 'Failed to parse circuit'
    }))
  }

  for (const testCase of testCases) {
    const testStartTime = Date.now()

    try {
      // Create simulator and run the circuit
      const simulator = new QuantumSimulator(parseResult.numQubits)

      // Run circuit and sample measurements
      const shots = 1024
      const measurements = simulator.runAndSample(parseResult.circuit, shots)

      // Calculate fidelity based on test case expectations
      let fidelity: number

      if (testCase.expectedOutput.targetStates && testCase.expectedOutput.targetStates.length > 0) {
        // For search problems: calculate how much probability mass is on target states
        fidelity = calculateSearchFidelity(measurements, testCase.expectedOutput.targetStates, shots)
      } else if (testCase.expectedOutput.targetProbabilities) {
        // For distribution matching problems
        fidelity = calculateFidelity(measurements, testCase.expectedOutput.targetProbabilities, shots)
      } else {
        // Default: use total probability on most likely states
        fidelity = calculateDefaultFidelity(measurements, shots)
      }

      // Check tolerance if specified
      const tolerance = testCase.expectedOutput.tolerance || 0
      const adjustedFidelity = Math.min(1, fidelity + tolerance)

      // Determine if test passed
      const passed = adjustedFidelity >= problem.fidelityRequirement.minFidelity

      results.push({
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        passed,
        fidelity: Math.round(adjustedFidelity * 1000) / 1000,
        gateCount: parseResult.gateCount,
        circuitDepth: parseResult.depth,
        executionTime: Date.now() - testStartTime,
        measurements
      })
    } catch (err) {
      results.push({
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        passed: false,
        fidelity: 0,
        gateCount: parseResult.gateCount,
        circuitDepth: parseResult.depth,
        executionTime: Date.now() - testStartTime,
        errorMessage: err instanceof Error ? err.message : 'Execution error'
      })
    }
  }

  return results
}

/**
 * Calculate fidelity for search problems (Grover's algorithm)
 * Returns the probability mass on target states
 */
function calculateSearchFidelity(
  measurements: Record<string, number>,
  targetStates: string[],
  totalShots: number
): number {
  let targetCount = 0

  for (const state of targetStates) {
    // Try both with and without leading zeros
    const count = measurements[state] || 0
    targetCount += count

    // Also try with padding adjustments
    for (const measured of Object.keys(measurements)) {
      if (measured.endsWith(state) || state.endsWith(measured)) {
        // Handle cases where state lengths might differ
        if (measured !== state) {
          const shorter = measured.length < state.length ? measured : state
          const longer = measured.length < state.length ? state : measured
          if (longer.replace(/^0+/, '') === shorter.replace(/^0+/, '')) {
            targetCount += measurements[measured] || 0
          }
        }
      }
    }
  }

  return Math.min(1, targetCount / totalShots)
}

/**
 * Calculate default fidelity based on measurement distribution
 */
function calculateDefaultFidelity(
  measurements: Record<string, number>,
  totalShots: number
): number {
  // Find the most measured state(s)
  const entries = Object.entries(measurements).sort((a, b) => b[1] - a[1])

  if (entries.length === 0) return 0

  // Return probability of most likely state
  return entries[0][1] / totalShots
}

/**
 * Calculate the overall score based on test results
 */
function calculateScore(
  testResults: TestCaseResult[],
  problem: CompetitionProblem,
  constraintsPassed: boolean
): number {
  if (!constraintsPassed) {
    return 0
  }

  let score = 0
  const testCases = problem.testCases

  for (let i = 0; i < testResults.length; i++) {
    const result = testResults[i]
    const testCase = testCases.find(tc => tc.id === result.testCaseId)

    if (!testCase) continue

    if (result.passed) {
      // Base score from weight
      let testScore = testCase.weight

      // Bonus for exceeding target fidelity
      if (result.fidelity >= problem.fidelityRequirement.targetFidelity) {
        testScore *= 1.1 // 10% bonus
      }

      score += testScore
    } else {
      // Partial credit based on fidelity achieved
      const partialCredit = (result.fidelity / problem.fidelityRequirement.minFidelity) * 0.5
      score += testCase.weight * Math.min(partialCredit, 0.5)
    }
  }

  return Math.min(100, Math.round(score))
}

/**
 * Generate helpful feedback based on results
 */
function generateFeedback(
  results: TestCaseResult[],
  metrics: CircuitMetrics,
  problem: CompetitionProblem,
  constraintsPassed: boolean,
  violations: string[]
): string[] {
  const feedback: string[] = []

  // Constraint violations
  if (!constraintsPassed) {
    feedback.push('Your circuit exceeds resource constraints:')
    violations.forEach(v => feedback.push(`  • ${v}`))
  }

  // Test case failures
  const failedTests = results.filter(r => !r.passed)
  if (failedTests.length > 0) {
    feedback.push(`${failedTests.length} test case(s) failed.`)

    const avgFidelity = failedTests.reduce((sum, r) => sum + r.fidelity, 0) / failedTests.length
    if (avgFidelity < problem.fidelityRequirement.minFidelity * 0.5) {
      feedback.push('Tip: Your fidelity is significantly below the requirement. Review the algorithm structure.')
    } else if (avgFidelity < problem.fidelityRequirement.minFidelity) {
      feedback.push('Tip: Close to passing! Try fine-tuning your circuit parameters.')
    }

    // Check for common issues
    const errorTests = results.filter(r => r.errorMessage)
    if (errorTests.length > 0) {
      feedback.push('Some tests encountered errors:')
      errorTests.forEach(t => feedback.push(`  • ${t.testCaseName}: ${t.errorMessage}`))
    }
  }

  // Optimization suggestions
  if (constraintsPassed && metrics.gateCount > problem.constraints.maxGateCount * 0.8) {
    feedback.push('Tip: Consider optimizing gate count for better performance.')
  }

  if (constraintsPassed && metrics.circuitDepth > problem.constraints.maxCircuitDepth * 0.8) {
    feedback.push('Tip: Circuit depth is high. Look for parallelization opportunities.')
  }

  // Success message
  if (results.every(r => r.passed) && constraintsPassed) {
    const avgFidelity = results.reduce((sum, r) => sum + r.fidelity, 0) / results.length
    if (avgFidelity >= problem.fidelityRequirement.targetFidelity) {
      feedback.push('Excellent! Your solution achieves target fidelity!')
    } else {
      feedback.push('Good job! Your solution passes all test cases.')
    }
  }

  return feedback
}

/**
 * Create a new submission object
 */
export function createSubmission(
  problemId: string,
  code: string,
  type: 'code' | 'circuit' = 'code'
): Submission {
  return {
    id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    odlemId: problemId,
    userId: 'user-anonymous',
    username: 'Anonymous',
    submittedAt: new Date().toISOString(),
    type,
    code,
    target: 'simulator',
    status: 'pending'
  }
}

/**
 * Generate mock leaderboard data for a problem
 */
export function generateMockLeaderboard(problemId: string, count: number = 10) {
  const names = [
    'QuantumWizard', 'QubitMaster', 'EntanglementPro', 'SuperpositionKing',
    'PhaseShifter', 'GateKeeper', 'CircuitBuilder', 'WaveFunction',
    'QuantumNinja', 'BlochSphere', 'HadamardHero', 'CNOTChamp'
  ]

  return Array.from({ length: count }, (_, i) => ({
    rank: i + 1,
    odlemId: problemId,
    userId: `user-${i}`,
    username: names[i % names.length] + (i >= names.length ? i : ''),
    score: Math.max(60, 100 - i * 3 - Math.floor(Math.random() * 5)),
    totalSubmissions: Math.floor(Math.random() * 10) + 1,
    executionTime: 150 + i * 50 + Math.floor(Math.random() * 100),
    submittedAt: new Date(Date.now() - i * 3600000 * Math.random()).toISOString()
  }))
}

/**
 * Generate mock global leaderboard
 */
export function generateMockGlobalLeaderboard(count: number = 20) {
  const names = [
    'QuantumWizard', 'QubitMaster', 'EntanglementPro', 'SuperpositionKing',
    'PhaseShifter', 'GateKeeper', 'CircuitBuilder', 'WaveFunction',
    'QuantumNinja', 'BlochSphere', 'HadamardHero', 'CNOTChamp',
    'GroverGuru', 'ShorStar', 'VQEVeteran', 'QAOAQueen',
    'ErrorCorrector', 'TeleportMaster', 'FourierFan', 'AmplitudeAce'
  ]

  return Array.from({ length: count }, (_, i) => ({
    rank: i + 1,
    userId: `user-${i}`,
    username: names[i % names.length],
    score: Math.max(100, 600 - i * 25 - Math.floor(Math.random() * 20)),
    problemsSolved: Math.max(1, 6 - Math.floor(i / 4)),
    totalSubmissions: Math.floor(Math.random() * 30) + 5,
    submittedAt: new Date(Date.now() - i * 86400000 * Math.random()).toISOString()
  }))
}

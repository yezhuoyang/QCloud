import { Circuit } from './circuit'

// Problem difficulty levels
export type ProblemDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert'

// Problem categories based on quantum algorithms
export type ProblemCategory =
  | 'grover'       // Grover's Search
  | 'shor'         // Shor's/Period Finding
  | 'vqe'          // Variational Quantum Eigensolver
  | 'qml'          // Quantum Machine Learning
  | 'error'        // Error Correction
  | 'optimization' // QAOA/Optimization
  | 'simulation'   // Hamiltonian Simulation
  | 'cs238b'       // CS 238B Quantum Algorithms Course

// Oracle specification for search problems
export interface OracleSpec {
  type: 'boolean' | 'phase' | 'amplitude'
  description: string
  markedStates?: string[]  // For boolean/phase oracles: target states
  phases?: Record<string, number>  // For phase oracles: phase values
  oracleCode?: string  // Code template for the oracle
}

// Resource constraints for submissions
export interface ResourceConstraints {
  maxQubits: number
  maxGateCount: number
  maxCircuitDepth: number
  allowedGates?: string[]  // If specified, only these gates allowed
  maxTwoQubitGates?: number
}

// Fidelity requirements
export interface FidelityRequirement {
  minFidelity: number       // Minimum required (0-1)
  targetFidelity: number    // Perfect score threshold
  metric: 'state_fidelity' | 'probability_overlap' | 'expectation_value' | 'process_fidelity' | 'success_probability'
}

// Test case for a problem
export interface TestCase {
  id: string
  name: string
  input: {
    oracleSpec?: OracleSpec
    inputState?: string        // e.g., "|00>" or "uniform"
    parameters?: Record<string, number | string | number[][]>
  }
  expectedOutput: {
    targetStates?: string[]    // For search problems
    targetProbabilities?: Record<string, number>  // Probability distribution
    expectedValue?: number     // For expectation problems
    tolerance?: number         // Allowed deviation
  }
  isHidden: boolean           // Hidden test cases for final scoring
  weight: number              // Weight in overall score (0-100)
}

// Complete competition problem
export interface CompetitionProblem {
  id: string
  title: string
  description: string         // Markdown supported
  category: ProblemCategory
  difficulty: ProblemDifficulty

  // Problem specification
  constraints: ResourceConstraints
  fidelityRequirement: FidelityRequirement
  testCases: TestCase[]

  // Hints and examples
  hints: string[]
  starterCode?: string        // Optional starter template
  solutionTemplate?: string   // Hidden solution for evaluation

  // Metadata
  author: string
  createdAt: string
  tags: string[]
  solveCount: number          // Number of successful solutions
  attemptCount: number        // Total attempts

  // Scoring
  maxScore: number            // Usually 100
  timeBonus: boolean          // Extra points for fast solutions
}

// User submission
export interface Submission {
  id: string
  odlemId: string
  odlemTitle?: string
  userId: string
  username?: string
  submittedAt: string

  // Submission type
  type: 'code' | 'circuit'
  code?: string               // Qiskit code
  circuit?: Circuit           // From circuit composer

  // Execution target
  target: 'simulator' | 'real_hardware'
  backend?: string            // e.g., "ibm_brisbane"

  // Status
  status: 'pending' | 'running' | 'completed' | 'failed' | 'error'
}

// Result for a single test case
export interface TestCaseResult {
  testCaseId: string
  testCaseName: string
  passed: boolean
  fidelity: number
  gateCount: number
  circuitDepth: number
  executionTime: number       // milliseconds
  measurements?: Record<string, number>  // Raw measurement counts
  errorMessage?: string
}

// Complete submission result
export interface SubmissionResult {
  submissionId: string
  problemId: string
  problemTitle: string

  // Overall result
  passed: boolean
  score: number               // 0-100
  totalFidelity: number       // Average across test cases

  // Resource usage
  totalGateCount: number
  maxCircuitDepth: number
  qubitCount: number

  // Per-test-case results
  testResults: TestCaseResult[]

  // Constraint compliance
  constraintsPassed: boolean
  constraintViolations: string[]

  // Timing
  totalExecutionTime: number
  completedAt: string

  // Feedback
  feedback: string[]          // Hints/suggestions
}

// Leaderboard entry
export interface LeaderboardEntry {
  rank: number
  odlemId?: string  // For problem-specific leaderboard
  userId: string
  username: string
  avatarUrl?: string

  // Scores
  score: number               // For problem-specific: best score; For global: total
  problemsSolved?: number     // For global leaderboard
  totalSubmissions: number

  // Best times
  executionTime?: number      // Best execution time in ms

  // Timestamps
  submittedAt: string
}

// Category metadata for UI
export interface CompetitionCategory {
  id: ProblemCategory
  name: string
  description: string
  icon: string                // Emoji
  problemCount: number
  color: string               // Tailwind color name (e.g., 'blue', 'purple')
}

// User's progress on a problem
export interface UserProblemProgress {
  odlemId: string
  odlemTitle: string
  status: 'not_started' | 'attempted' | 'solved'
  bestScore: number
  submissionCount: number
  lastSubmittedAt?: string
}

// User's overall competition stats
export interface UserCompetitionStats {
  odlemsSolved: number
  totalProblems: number
  totalScore: number
  globalRank?: number
  submissions: number
  badges: string[]
}

// Difficulty colors for UI
export const DIFFICULTY_COLORS: Record<ProblemDifficulty, { bg: string; text: string; border: string }> = {
  Easy: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  Medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  Hard: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  Expert: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' }
}

// Category colors for UI
export const CATEGORY_COLORS: Record<ProblemCategory, string> = {
  grover: 'blue',
  shor: 'indigo',
  vqe: 'purple',
  qml: 'pink',
  error: 'red',
  optimization: 'amber',
  simulation: 'emerald',
  cs238b: 'teal'
}

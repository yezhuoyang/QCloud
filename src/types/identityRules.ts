import { GateType, Circuit } from './circuit'

// Pattern element - describes what gate to match
export interface GatePatternElement {
  type: GateType                     // Gate type to match
  qubitRef: string                   // Reference name like 'q0', 'q1' for constraint matching
  paramsRef?: string                 // Reference name for parameters like 'theta1', 'theta2'
  paramsConstraint?: 'any' | 'same' | 'specific'  // How to match params
  specificParams?: number[]          // For 'specific' constraint
}

// Constraint on gate relationships
export interface PatternConstraint {
  type: 'same_qubit' | 'adjacent_columns' | 'same_params' | 'param_sum'
  elements: number[]                 // Indices of pattern elements this applies to
  value?: number                     // For param_sum (e.g., sum to 0 or 2*pi)
}

// Replacement specification - what to replace matched gates with
export interface ReplacementSpec {
  type: 'identity' | 'single_gate' | 'sequence' | 'param_combine'
  gates?: {
    type: GateType
    qubitRef: string
    paramsExpr?: string              // Expression like 'theta1 + theta2' or 'pi/2'
  }[]
}

// Rule category for UI organization
export type RuleCategory = 'cancellation' | 'simplification' | 'decomposition' | 'custom'

// Complete identity rule definition
export interface IdentityRule {
  id: string
  name: string
  description: string
  category: RuleCategory
  isBuiltin: boolean

  // Pattern to match (sequence of gates)
  pattern: GatePatternElement[]

  // Constraints that must be satisfied
  constraints: PatternConstraint[]

  // What to replace matched gates with
  replacement: ReplacementSpec

  // Visual representation for UI (e.g., "X X = I" or "H H = I")
  visualPattern: string

  // Whether the rule can be applied in reverse (expand instead of simplify)
  reversible: boolean
}

// A match found in the circuit
export interface PatternMatch {
  ruleId: string
  gateIds: string[]                  // IDs of matched gates in order
  qubit: number                      // Primary qubit of the match
  startColumn: number
  endColumn: number
  capturedParams?: Record<string, number>  // Captured parameter values (e.g., { theta1: 0.5, theta2: 1.0 })
}

// State for the identity rules feature
export interface IdentityRulesState {
  selectedGates: Set<string>         // Currently selected gate IDs
  activeRule: string | null          // Rule being viewed/applied
  highlightedMatches: PatternMatch[] // Matches to highlight in circuit
  userRules: IdentityRule[]          // User-defined rules
  matchMode: 'manual' | 'auto'       // Current matching mode
}

// Validation result for checking if selection matches a rule
export interface SelectionValidation {
  valid: boolean
  match?: PatternMatch
  error?: string
}

// Helper type for rule groups in the UI
export interface RuleGroup {
  category: RuleCategory
  label: string
  rules: IdentityRule[]
  expanded: boolean
}

// Circuit history entry for undo/redo
export interface CircuitHistoryEntry {
  circuit: Circuit
  description: string                // What action was taken (for undo tooltip)
  timestamp: number
}

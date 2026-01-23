import { Circuit, PlacedGate } from '../types/circuit'
import {
  IdentityRule,
  PatternMatch,
  PatternConstraint,
  SelectionValidation
} from '../types/identityRules'

/**
 * Pattern matching engine for circuit identity rules
 */
export class PatternMatcher {
  private rules: IdentityRule[]

  constructor(rules: IdentityRule[]) {
    this.rules = rules
  }

  /**
   * Get all available rules
   */
  getRules(): IdentityRule[] {
    return this.rules
  }

  /**
   * Get a rule by ID
   */
  getRule(ruleId: string): IdentityRule | undefined {
    return this.rules.find(r => r.id === ruleId)
  }

  /**
   * Find all matches of a specific rule in the circuit
   */
  findMatches(circuit: Circuit, ruleId: string): PatternMatch[] {
    const rule = this.getRule(ruleId)
    if (!rule) return []

    return this.matchRuleInCircuit(circuit, rule)
  }

  /**
   * Find all matches for all rules in the circuit
   */
  findAllMatches(circuit: Circuit): PatternMatch[] {
    const allMatches: PatternMatch[] = []

    for (const rule of this.rules) {
      allMatches.push(...this.matchRuleInCircuit(circuit, rule))
    }

    return allMatches
  }

  /**
   * Count matches for each rule in the circuit
   */
  countMatches(circuit: Circuit): Map<string, number> {
    const counts = new Map<string, number>()

    for (const rule of this.rules) {
      const matches = this.matchRuleInCircuit(circuit, rule)
      counts.set(rule.id, matches.length)
    }

    return counts
  }

  /**
   * Check if a selection of gates matches a rule
   */
  validateSelection(
    circuit: Circuit,
    selectedGateIds: Set<string>,
    ruleId: string
  ): SelectionValidation {
    const rule = this.getRule(ruleId)
    if (!rule) {
      return { valid: false, error: 'Rule not found' }
    }

    // Get the actual gate objects
    const selectedGates = circuit.gates.filter(g => selectedGateIds.has(g.id))

    // Check gate count matches pattern
    if (selectedGates.length !== rule.pattern.length) {
      return {
        valid: false,
        error: `Rule requires ${rule.pattern.length} gate(s), but ${selectedGates.length} selected`
      }
    }

    // Sort gates by column for ordered matching
    const sortedGates = [...selectedGates].sort((a, b) => a.column - b.column)

    // Match each pattern element
    const qubitBindings: Record<string, number[]> = {}
    const paramBindings: Record<string, number> = {}

    for (let i = 0; i < rule.pattern.length; i++) {
      const pattern = rule.pattern[i]
      const gate = sortedGates[i]

      // Check gate type matches
      if (gate.type !== pattern.type) {
        return {
          valid: false,
          error: `Gate ${i + 1} should be ${pattern.type}, but is ${gate.type}`
        }
      }

      // Bind/check qubit references
      if (qubitBindings[pattern.qubitRef]) {
        if (!arraysEqual(qubitBindings[pattern.qubitRef], gate.qubits)) {
          return { valid: false, error: 'Gates must be on the same qubit(s)' }
        }
      } else {
        qubitBindings[pattern.qubitRef] = gate.qubits
      }

      // Capture parameters if needed
      if (pattern.paramsRef && gate.params && gate.params.length > 0) {
        paramBindings[pattern.paramsRef] = gate.params[0]
      }
    }

    // Check all constraints
    for (const constraint of rule.constraints) {
      const result = this.checkConstraint(constraint, sortedGates)
      if (!result.valid) {
        return { valid: false, error: result.error }
      }
    }

    return {
      valid: true,
      match: {
        ruleId: rule.id,
        gateIds: sortedGates.map(g => g.id),
        qubit: sortedGates[0].qubits[0],
        startColumn: sortedGates[0].column,
        endColumn: sortedGates[sortedGates.length - 1].column,
        capturedParams: Object.keys(paramBindings).length > 0 ? paramBindings : undefined
      }
    }
  }

  /**
   * Find which rules can be applied to the current selection
   */
  findApplicableRules(
    circuit: Circuit,
    selectedGateIds: Set<string>
  ): { rule: IdentityRule; match: PatternMatch }[] {
    const applicable: { rule: IdentityRule; match: PatternMatch }[] = []

    for (const rule of this.rules) {
      const validation = this.validateSelection(circuit, selectedGateIds, rule.id)
      if (validation.valid && validation.match) {
        applicable.push({ rule, match: validation.match })
      }
    }

    return applicable
  }

  /**
   * Internal: Find all matches of a rule in circuit
   */
  private matchRuleInCircuit(circuit: Circuit, rule: IdentityRule): PatternMatch[] {
    const matches: PatternMatch[] = []
    const gates = circuit.gates

    // For single-gate patterns (decomposition rules), scan all gates
    if (rule.pattern.length === 1) {
      const patternType = rule.pattern[0].type
      for (const gate of gates) {
        if (gate.type === patternType) {
          matches.push({
            ruleId: rule.id,
            gateIds: [gate.id],
            qubit: gate.qubits[0],
            startColumn: gate.column,
            endColumn: gate.column,
            capturedParams: gate.params && gate.params.length > 0
              ? { [rule.pattern[0].paramsRef || 'param']: gate.params[0] }
              : undefined
          })
        }
      }
      return matches
    }

    // For multi-gate patterns, group gates by qubit for efficient matching
    const gatesByQubit = new Map<number, PlacedGate[]>()
    for (const gate of gates) {
      // For single-qubit gates, use the qubit directly
      // For multi-qubit gates, use a key based on all qubits
      const key = gate.qubits.length === 1 ? gate.qubits[0] : gate.qubits[0] * 100 + gate.qubits[1]

      if (!gatesByQubit.has(key)) {
        gatesByQubit.set(key, [])
      }
      gatesByQubit.get(key)!.push(gate)
    }

    // For each qubit group, scan for pattern matches
    for (const [_key, qubitGates] of gatesByQubit) {
      // Sort by column
      const sorted = [...qubitGates].sort((a, b) => a.column - b.column)

      // Sliding window approach for adjacent gate patterns
      for (let i = 0; i <= sorted.length - rule.pattern.length; i++) {
        const candidateGates = sorted.slice(i, i + rule.pattern.length)

        // Check if this candidate matches the pattern
        const validation = this.validateCandidateGates(candidateGates, rule)
        if (validation.valid && validation.match) {
          // Ensure no duplicate matches (by gate IDs)
          const matchKey = validation.match.gateIds.sort().join(',')
          const exists = matches.some(m => m.gateIds.sort().join(',') === matchKey)

          if (!exists) {
            matches.push(validation.match)
          }
        }
      }
    }

    return matches
  }

  /**
   * Validate candidate gates against a rule pattern
   */
  private validateCandidateGates(
    gates: PlacedGate[],
    rule: IdentityRule
  ): SelectionValidation {
    if (gates.length !== rule.pattern.length) {
      return { valid: false, error: 'Gate count mismatch' }
    }

    const qubitBindings: Record<string, number[]> = {}
    const paramBindings: Record<string, number> = {}

    for (let i = 0; i < rule.pattern.length; i++) {
      const pattern = rule.pattern[i]
      const gate = gates[i]

      // Check gate type matches
      if (gate.type !== pattern.type) {
        return { valid: false, error: 'Gate type mismatch' }
      }

      // Bind/check qubit references
      if (qubitBindings[pattern.qubitRef]) {
        if (!arraysEqual(qubitBindings[pattern.qubitRef], gate.qubits)) {
          return { valid: false, error: 'Qubit mismatch' }
        }
      } else {
        qubitBindings[pattern.qubitRef] = gate.qubits
      }

      // Capture parameters if needed
      if (pattern.paramsRef && gate.params && gate.params.length > 0) {
        paramBindings[pattern.paramsRef] = gate.params[0]
      }
    }

    // Check constraints
    for (const constraint of rule.constraints) {
      const result = this.checkConstraint(constraint, gates)
      if (!result.valid) {
        return result
      }
    }

    return {
      valid: true,
      match: {
        ruleId: rule.id,
        gateIds: gates.map(g => g.id),
        qubit: gates[0].qubits[0],
        startColumn: gates[0].column,
        endColumn: gates[gates.length - 1].column,
        capturedParams: Object.keys(paramBindings).length > 0 ? paramBindings : undefined
      }
    }
  }

  /**
   * Check if a constraint is satisfied
   */
  private checkConstraint(
    constraint: PatternConstraint,
    gates: PlacedGate[]
  ): { valid: boolean; error?: string } {
    switch (constraint.type) {
      case 'same_qubit': {
        // All referenced gates must be on the same qubit(s)
        const qubits = constraint.elements.map(i => gates[i]?.qubits || [])
        const first = qubits[0]
        for (let i = 1; i < qubits.length; i++) {
          if (!arraysEqual(qubits[i], first)) {
            return { valid: false, error: 'Gates must be on the same qubit(s)' }
          }
        }
        return { valid: true }
      }

      case 'adjacent_columns': {
        // Gates must be in consecutive columns (no other gates in between on same qubit)
        for (let i = 1; i < constraint.elements.length; i++) {
          const prevGate = gates[constraint.elements[i - 1]]
          const currGate = gates[constraint.elements[i]]
          if (!prevGate || !currGate) {
            return { valid: false, error: 'Invalid gate reference' }
          }
          if (currGate.column !== prevGate.column + 1) {
            return { valid: false, error: 'Gates must be adjacent (consecutive columns)' }
          }
        }
        return { valid: true }
      }

      case 'same_params': {
        // All referenced gates must have the same parameter value
        const params = constraint.elements.map(i => gates[i]?.params?.[0])
        const first = params[0]
        for (let i = 1; i < params.length; i++) {
          if (params[i] !== first) {
            return { valid: false, error: 'Gates must have the same parameter value' }
          }
        }
        return { valid: true }
      }

      case 'param_sum': {
        // Parameters must sum to a specific value
        const sum = constraint.elements.reduce(
          (acc, i) => acc + (gates[i]?.params?.[0] ?? 0), 0
        )
        const target = constraint.value ?? 0
        if (Math.abs(sum - target) > 0.0001) {
          return { valid: false, error: `Parameters must sum to ${target}` }
        }
        return { valid: true }
      }

      default:
        return { valid: true }
    }
  }
}

/**
 * Helper function to compare arrays
 */
function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

/**
 * Create a pattern matcher with the given rules
 */
export function createPatternMatcher(rules: IdentityRule[]): PatternMatcher {
  return new PatternMatcher(rules)
}

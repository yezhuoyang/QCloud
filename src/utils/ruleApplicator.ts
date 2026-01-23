import { Circuit, PlacedGate, generateGateId } from '../types/circuit'
import { IdentityRule, PatternMatch } from '../types/identityRules'

/**
 * Rule application engine for circuit transformations
 */
export class RuleApplicator {
  /**
   * Apply a rule to the circuit at the matched position
   */
  applyRule(
    circuit: Circuit,
    match: PatternMatch,
    rule: IdentityRule
  ): Circuit {
    // Remove matched gates
    const remainingGates = circuit.gates.filter(
      g => !match.gateIds.includes(g.id)
    )

    // Get the original gates for reference (qubit positions)
    const originalGates = circuit.gates.filter(g => match.gateIds.includes(g.id))
    const primaryQubit = originalGates[0]?.qubits[0] ?? 0
    const secondaryQubit = originalGates[0]?.qubits[1]

    // Generate replacement gates
    const replacementGates = this.generateReplacementGates(
      match,
      rule,
      primaryQubit,
      secondaryQubit
    )

    // Combine remaining and replacement gates
    const newGates = [...remainingGates, ...replacementGates]

    // Compact columns (shift gates left to fill gaps)
    const compactedGates = this.compactColumns(newGates, circuit.numQubits)

    return {
      ...circuit,
      gates: compactedGates
    }
  }

  /**
   * Apply multiple matches of the same rule at once
   */
  applyAllMatches(
    circuit: Circuit,
    matches: PatternMatch[],
    rule: IdentityRule
  ): Circuit {
    // Sort matches by column (rightmost first) to avoid index shifting issues
    const sortedMatches = [...matches].sort((a, b) => b.startColumn - a.startColumn)

    let currentCircuit = circuit

    for (const match of sortedMatches) {
      // Verify the match is still valid (gates still exist)
      const allGatesExist = match.gateIds.every(
        id => currentCircuit.gates.some(g => g.id === id)
      )

      if (allGatesExist) {
        currentCircuit = this.applyRule(currentCircuit, match, rule)
      }
    }

    return currentCircuit
  }

  /**
   * Generate replacement gates based on rule specification
   */
  private generateReplacementGates(
    match: PatternMatch,
    rule: IdentityRule,
    primaryQubit: number,
    secondaryQubit?: number
  ): PlacedGate[] {
    const { replacement } = rule
    const startColumn = match.startColumn

    switch (replacement.type) {
      case 'identity':
        // No gates to add - pattern cancels to identity
        return []

      case 'single_gate':
      case 'sequence':
        return (replacement.gates || []).map((spec, i) => {
          const qubits = this.resolveQubitRef(spec.qubitRef, primaryQubit, secondaryQubit)
          const params = spec.paramsExpr
            ? [this.evaluateParamExpr(spec.paramsExpr, match.capturedParams || {})]
            : undefined

          return {
            id: generateGateId(),
            type: spec.type,
            qubits,
            column: startColumn + i,
            params
          }
        })

      case 'param_combine': {
        const combinedGate = replacement.gates?.[0]
        if (!combinedGate) return []

        const combinedParam = this.evaluateParamExpr(
          combinedGate.paramsExpr || '0',
          match.capturedParams || {}
        )

        // If combined param is effectively 0 or 2*pi, result is identity
        const normalizedParam = this.normalizeAngle(combinedParam)
        if (Math.abs(normalizedParam) < 0.0001) {
          return [] // Identity - no gates needed
        }

        const qubits = this.resolveQubitRef(combinedGate.qubitRef, primaryQubit, secondaryQubit)

        return [{
          id: generateGateId(),
          type: combinedGate.type,
          qubits,
          column: startColumn,
          params: [normalizedParam]
        }]
      }

      default:
        return []
    }
  }

  /**
   * Resolve qubit reference to actual qubit indices
   */
  private resolveQubitRef(
    ref: string,
    primaryQubit: number,
    secondaryQubit?: number
  ): number[] {
    // Handle multi-qubit reference like 'q0,q1'
    if (ref.includes(',')) {
      const parts = ref.split(',')
      if (parts.length === 2) {
        // Check if it's a swap (q1,q0 vs q0,q1)
        if (parts[0] === 'q1' && parts[1] === 'q0' && secondaryQubit !== undefined) {
          return [secondaryQubit, primaryQubit]
        }
        return secondaryQubit !== undefined
          ? [primaryQubit, secondaryQubit]
          : [primaryQubit]
      }
    }

    // Single qubit reference
    if (ref === 'q1' && secondaryQubit !== undefined) {
      return [secondaryQubit]
    }
    return [primaryQubit]
  }

  /**
   * Evaluate parameter expression with captured values
   */
  private evaluateParamExpr(
    expr: string,
    captured: Record<string, number>
  ): number {
    let result = expr

    // Replace captured parameter references
    for (const [key, value] of Object.entries(captured)) {
      result = result.replace(new RegExp(key, 'g'), String(value))
    }

    // Replace pi with Math.PI value
    result = result.replace(/\bpi\b/g, String(Math.PI))

    // Evaluate the expression safely
    try {
      // Only allow basic math operations
      if (!/^[\d\s+\-*/().]+$/.test(result)) {
        console.warn('Invalid expression:', result)
        return 0
      }
      return new Function(`return ${result}`)() as number
    } catch (e) {
      console.error('Failed to evaluate expression:', expr, e)
      return 0
    }
  }

  /**
   * Normalize angle to [-π, π] range
   */
  private normalizeAngle(angle: number): number {
    const twoPi = 2 * Math.PI
    let normalized = angle % twoPi
    if (normalized > Math.PI) {
      normalized -= twoPi
    } else if (normalized < -Math.PI) {
      normalized += twoPi
    }
    return normalized
  }

  /**
   * Compact columns to remove gaps after gate removal
   * This ensures gates shift left to fill empty columns
   */
  private compactColumns(gates: PlacedGate[], numQubits: number): PlacedGate[] {
    if (gates.length === 0) return []

    // Build a map of which columns are used on each qubit
    const qubitColumns = new Map<number, Set<number>>()
    for (let q = 0; q < numQubits; q++) {
      qubitColumns.set(q, new Set())
    }

    // Track which gates are at which positions
    const gatesByColumn = new Map<number, PlacedGate[]>()
    for (const gate of gates) {
      const col = gate.column
      if (!gatesByColumn.has(col)) {
        gatesByColumn.set(col, [])
      }
      gatesByColumn.get(col)!.push(gate)
    }

    // Get all unique columns, sorted
    const columns = Array.from(gatesByColumn.keys()).sort((a, b) => a - b)

    // Reassign columns starting from 0
    const columnMapping = new Map<number, number>()
    let newColumn = 0
    for (const oldColumn of columns) {
      columnMapping.set(oldColumn, newColumn)
      newColumn++
    }

    // Apply the new column numbers to all gates
    return gates.map(gate => ({
      ...gate,
      column: columnMapping.get(gate.column) ?? gate.column
    }))
  }
}

/**
 * Create a rule applicator instance
 */
export function createRuleApplicator(): RuleApplicator {
  return new RuleApplicator()
}

/**
 * Describe what a rule application will do (for undo history)
 */
export function describeRuleApplication(rule: IdentityRule, match: PatternMatch): string {
  const gateCount = match.gateIds.length
  if (rule.replacement.type === 'identity') {
    return `Remove ${gateCount} gate(s) using "${rule.name}"`
  } else if (rule.replacement.type === 'single_gate' || rule.replacement.type === 'param_combine') {
    return `Simplify ${gateCount} gate(s) to 1 using "${rule.name}"`
  } else if (rule.replacement.type === 'sequence') {
    const newCount = rule.replacement.gates?.length ?? 0
    return `Transform ${gateCount} gate(s) to ${newCount} using "${rule.name}"`
  }
  return `Apply "${rule.name}"`
}

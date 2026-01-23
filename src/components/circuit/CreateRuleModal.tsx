import { useState, useEffect } from 'react'
import { GateType, GATE_DEFINITIONS } from '../../types/circuit'
import { IdentityRule, GatePatternElement, ReplacementSpec } from '../../types/identityRules'
import GateIcon from './GateIcon'

interface CreateRuleModalProps {
  isOpen: boolean
  onConfirm: (rule: Omit<IdentityRule, 'id' | 'isBuiltin'>) => void
  onCancel: () => void
  editRule?: IdentityRule // For editing existing rules
}

// Simple gates for rule creation
const AVAILABLE_GATES: GateType[] = [
  'X', 'Y', 'Z', 'H', 'S', 'Sdg', 'T', 'Tdg',
  'SX', 'SXdg', 'RX', 'RY', 'RZ', 'P',
  'CX', 'CZ', 'SWAP'
]

export default function CreateRuleModal({
  isOpen,
  onConfirm,
  onCancel,
  editRule
}: CreateRuleModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [patternGates, setPatternGates] = useState<GateType[]>([])
  const [replacementType, setReplacementType] = useState<'identity' | 'single_gate' | 'sequence'>('identity')
  const [replacementGates, setReplacementGates] = useState<GateType[]>([])
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editRule) {
        setName(editRule.name)
        setDescription(editRule.description)
        setPatternGates(editRule.pattern.map(p => p.type))
        setReplacementType(editRule.replacement.type as 'identity' | 'single_gate' | 'sequence')
        setReplacementGates(editRule.replacement.gates?.map(g => g.type) || [])
      } else {
        setName('')
        setDescription('')
        setPatternGates([])
        setReplacementType('identity')
        setReplacementGates([])
      }
      setError(null)
    }
  }, [isOpen, editRule])

  if (!isOpen) return null

  const addPatternGate = (gateType: GateType) => {
    if (patternGates.length < 4) {
      setPatternGates([...patternGates, gateType])
    }
  }

  const removePatternGate = (index: number) => {
    setPatternGates(patternGates.filter((_, i) => i !== index))
  }

  const addReplacementGate = (gateType: GateType) => {
    if (replacementGates.length < 4) {
      setReplacementGates([...replacementGates, gateType])
    }
  }

  const removeReplacementGate = (index: number) => {
    setReplacementGates(replacementGates.filter((_, i) => i !== index))
  }

  const handleConfirm = () => {
    // Validation
    if (!name.trim()) {
      setError('Please enter a rule name')
      return
    }
    if (patternGates.length < 1) {
      setError('Please add at least one gate to match')
      return
    }
    if (replacementType !== 'identity' && replacementGates.length === 0) {
      setError('Please add replacement gate(s) or select "Remove (Identity)"')
      return
    }

    // Build the rule
    const pattern: GatePatternElement[] = patternGates.map((type, i) => ({
      type,
      qubitRef: `q${i}`
    }))

    // Add constraints for multi-gate patterns
    const constraints = patternGates.length > 1
      ? [
          { type: 'same_qubit' as const, elements: patternGates.map((_, i) => i) },
          { type: 'adjacent_columns' as const, elements: patternGates.map((_, i) => i) }
        ]
      : []

    // Build replacement spec
    let replacement: ReplacementSpec
    if (replacementType === 'identity') {
      replacement = { type: 'identity' }
    } else {
      replacement = {
        type: replacementGates.length === 1 ? 'single_gate' : 'sequence',
        gates: replacementGates.map((type, i) => ({
          type,
          qubitRef: `q${i}`
        }))
      }
    }

    // Generate visual pattern
    const leftSide = patternGates.map(g => GATE_DEFINITIONS[g].symbol).join(' ')
    const rightSide = replacementType === 'identity'
      ? 'I'
      : replacementGates.map(g => GATE_DEFINITIONS[g].symbol).join(' ')
    const visualPattern = `${leftSide} = ${rightSide}`

    const rule: Omit<IdentityRule, 'id' | 'isBuiltin'> = {
      name: name.trim(),
      description: description.trim() || `Custom rule: ${visualPattern}`,
      category: 'custom',
      pattern,
      constraints,
      replacement,
      visualPattern,
      reversible: false
    }

    onConfirm(rule)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-qcloud-text">
              {editRule ? 'Edit Custom Rule' : 'Create Custom Rule'}
            </h2>
            <p className="text-sm text-qcloud-muted">
              Define a circuit identity pattern
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-qcloud-bg rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-qcloud-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Rule name and description */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-qcloud-text mb-1">
                Rule Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., My Custom Rule"
                className="w-full px-3 py-2 border border-qcloud-border rounded-lg focus:outline-none focus:ring-2 focus:ring-qcloud-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-qcloud-text mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What does this rule do?"
                className="w-full px-3 py-2 border border-qcloud-border rounded-lg focus:outline-none focus:ring-2 focus:ring-qcloud-primary"
              />
            </div>
          </div>

          {/* Pattern gates */}
          <div>
            <label className="block text-sm font-medium text-qcloud-text mb-2">
              Pattern to Match (1-4 gates) *
            </label>
            <div className="flex items-center gap-2 mb-3 p-3 bg-qcloud-bg rounded-lg min-h-[60px]">
              {patternGates.length === 0 ? (
                <span className="text-sm text-qcloud-muted">Click gates below to add...</span>
              ) : (
                patternGates.map((gateType, index) => (
                  <div key={index} className="relative group">
                    <GateIcon gateType={gateType} size="medium" />
                    <button
                      onClick={() => removePatternGate(index)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_GATES.map(gateType => (
                <button
                  key={gateType}
                  onClick={() => addPatternGate(gateType)}
                  disabled={patternGates.length >= 4}
                  className="p-1.5 hover:bg-qcloud-bg rounded transition-colors disabled:opacity-50"
                  title={GATE_DEFINITIONS[gateType].name}
                >
                  <GateIcon gateType={gateType} size="small" showLabel={true} />
                </button>
              ))}
            </div>
          </div>

          {/* Equals sign */}
          <div className="flex items-center justify-center">
            <span className="text-2xl text-qcloud-muted">=</span>
          </div>

          {/* Replacement type */}
          <div>
            <label className="block text-sm font-medium text-qcloud-text mb-2">
              Result (Replace With)
            </label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setReplacementType('identity')}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  replacementType === 'identity'
                    ? 'border-qcloud-primary bg-qcloud-primary/10 text-qcloud-primary'
                    : 'border-qcloud-border hover:border-qcloud-primary/50'
                }`}
              >
                Remove (Identity)
              </button>
              <button
                onClick={() => setReplacementType('single_gate')}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  replacementType !== 'identity'
                    ? 'border-qcloud-primary bg-qcloud-primary/10 text-qcloud-primary'
                    : 'border-qcloud-border hover:border-qcloud-primary/50'
                }`}
              >
                Replace With Gate(s)
              </button>
            </div>

            {replacementType !== 'identity' && (
              <>
                <div className="flex items-center gap-2 mb-3 p-3 bg-qcloud-bg rounded-lg min-h-[60px]">
                  {replacementGates.length === 0 ? (
                    <span className="text-sm text-qcloud-muted">Click gates below to add...</span>
                  ) : (
                    replacementGates.map((gateType, index) => (
                      <div key={index} className="relative group">
                        <GateIcon gateType={gateType} size="medium" />
                        <button
                          onClick={() => removeReplacementGate(index)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {AVAILABLE_GATES.map(gateType => (
                    <button
                      key={gateType}
                      onClick={() => addReplacementGate(gateType)}
                      disabled={replacementGates.length >= 4}
                      className="p-1.5 hover:bg-qcloud-bg rounded transition-colors disabled:opacity-50"
                      title={GATE_DEFINITIONS[gateType].name}
                    >
                      <GateIcon gateType={gateType} size="small" showLabel={true} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Preview */}
          {patternGates.length > 0 && (
            <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
              <p className="text-sm font-medium text-cyan-800 mb-1">Rule Preview:</p>
              <p className="font-mono text-cyan-900">
                {patternGates.map(g => GATE_DEFINITIONS[g].symbol).join(' ')}
                {' = '}
                {replacementType === 'identity'
                  ? 'I (remove)'
                  : replacementGates.length > 0
                    ? replacementGates.map(g => GATE_DEFINITIONS[g].symbol).join(' ')
                    : '?'}
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-qcloud-border">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-qcloud-muted hover:text-qcloud-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-gradient-to-r from-qcloud-primary to-qcloud-secondary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            {editRule ? 'Save Changes' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  )
}

import { IdentityRule } from '../../types/identityRules'
import { GATE_DEFINITIONS, GateType } from '../../types/circuit'
import GateIcon from './GateIcon'

interface RuleCardProps {
  rule: IdentityRule
  matchCount?: number
  isApplicable?: boolean
  onFindAll: () => void
  onApply: () => void
  onApplyAll?: () => void
  disabled?: boolean
}

export default function RuleCard({
  rule,
  matchCount = 0,
  isApplicable = false,
  onFindAll,
  onApply,
  onApplyAll,
  disabled = false
}: RuleCardProps) {
  // Parse the visual pattern to render gate icons
  const renderPattern = () => {
    // Simple parsing of patterns like "X X = I" or "Rz(θ) Rz(φ) = Rz(θ+φ)"
    const parts = rule.visualPattern.split(' = ')
    const leftSide = parts[0] || ''
    const rightSide = parts[1] || 'I'

    // Extract gate names from left side
    const leftGates = leftSide.split(' ').filter(g => g.length > 0)

    return (
      <div className="flex items-center gap-1 text-sm">
        {/* Left side - gates being matched */}
        <div className="flex items-center gap-0.5">
          {leftGates.map((gateName, idx) => {
            // Try to find matching gate type
            const gateType = findGateType(gateName)
            if (gateType) {
              return (
                <GateIcon
                  key={idx}
                  gateType={gateType}
                  size="small"
                  showLabel={true}
                />
              )
            }
            // Fallback to text
            return (
              <span key={idx} className="font-mono text-xs bg-qcloud-bg px-1 rounded">
                {gateName}
              </span>
            )
          })}
        </div>

        {/* Equals sign */}
        <span className="text-qcloud-muted mx-1">=</span>

        {/* Right side - result */}
        <div className="flex items-center gap-0.5">
          {rightSide === 'I' ? (
            <span className="font-mono text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
              I
            </span>
          ) : (
            (() => {
              const rightGates = rightSide.split(' ').filter(g => g.length > 0)
              return rightGates.map((gateName, idx) => {
                const gateType = findGateType(gateName)
                if (gateType) {
                  return (
                    <GateIcon
                      key={idx}
                      gateType={gateType}
                      size="small"
                      showLabel={true}
                    />
                  )
                }
                return (
                  <span key={idx} className="font-mono text-xs bg-qcloud-bg px-1 rounded">
                    {gateName}
                  </span>
                )
              })
            })()
          )}
        </div>
      </div>
    )
  }

  const categoryColors: Record<string, string> = {
    cancellation: 'bg-red-50 border-red-200 text-red-700',
    simplification: 'bg-blue-50 border-blue-200 text-blue-700',
    decomposition: 'bg-purple-50 border-purple-200 text-purple-700',
    custom: 'bg-green-50 border-green-200 text-green-700'
  }

  const categoryColor = categoryColors[rule.category] || categoryColors.custom

  return (
    <div
      className={`p-3 rounded-lg border ${
        isApplicable
          ? 'border-qcloud-primary bg-qcloud-primary/5'
          : 'border-qcloud-border bg-white'
      } transition-all hover:shadow-sm`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-qcloud-text truncate">
            {rule.name}
          </h4>
          <p className="text-xs text-qcloud-muted truncate mt-0.5">
            {rule.description}
          </p>
        </div>

        {/* Match count badge */}
        {matchCount > 0 && (
          <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
            {matchCount}
          </span>
        )}
      </div>

      {/* Visual pattern */}
      <div className="mb-3 p-2 bg-qcloud-bg rounded flex justify-center">
        {renderPattern()}
      </div>

      {/* Category badge */}
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded border ${categoryColor}`}>
          {rule.category}
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Find All button */}
          <button
            onClick={onFindAll}
            disabled={disabled}
            className="px-2 py-1 text-xs text-qcloud-muted hover:text-qcloud-text hover:bg-qcloud-bg rounded transition-colors disabled:opacity-50"
            title="Find all matches in circuit"
          >
            Find
          </button>

          {/* Apply All button (when matches found) */}
          {matchCount > 0 && onApplyAll && (
            <button
              onClick={onApplyAll}
              disabled={disabled}
              className="px-2 py-1 text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 rounded transition-colors disabled:opacity-50"
              title="Apply to all matches"
            >
              Apply All
            </button>
          )}

          {/* Apply to Selection button */}
          <button
            onClick={onApply}
            disabled={disabled || !isApplicable}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              isApplicable
                ? 'bg-qcloud-primary text-white hover:opacity-90'
                : 'bg-qcloud-border text-qcloud-muted'
            } disabled:opacity-50`}
            title={isApplicable ? 'Apply to selected gates' : 'Select matching gates first'}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Helper to find gate type from display name
 */
function findGateType(name: string): GateType | null {
  // Direct matches
  const directMatches: Record<string, GateType> = {
    'X': 'X', 'Y': 'Y', 'Z': 'Z', 'H': 'H', 'I': 'I',
    'S': 'S', 'T': 'T', 'S†': 'Sdg', 'T†': 'Tdg',
    '√X': 'SX', '√X†': 'SXdg',
    'CX': 'CX', 'CZ': 'CZ', 'CY': 'CY', 'CH': 'CH',
    'SWAP': 'SWAP', 'CNOT': 'CX',
    'Rx': 'RX', 'Ry': 'RY', 'Rz': 'RZ',
    'RX': 'RX', 'RY': 'RY', 'RZ': 'RZ'
  }

  // Remove parameter notation like (θ)
  const cleanName = name.replace(/\([^)]*\)/g, '').trim()

  if (directMatches[cleanName]) {
    return directMatches[cleanName]
  }

  // Check if it's a valid gate type
  if (GATE_DEFINITIONS[cleanName as keyof typeof GATE_DEFINITIONS]) {
    return cleanName as GateType
  }

  return null
}

/**
 * Compact rule display for inline use
 */
interface CompactRuleProps {
  rule: IdentityRule
  onClick?: () => void
  selected?: boolean
}

export function CompactRule({ rule, onClick, selected = false }: CompactRuleProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded border transition-all ${
        selected
          ? 'border-qcloud-primary bg-qcloud-primary/10'
          : 'border-qcloud-border hover:border-qcloud-primary/50 hover:bg-qcloud-bg'
      }`}
    >
      <div className="font-mono text-sm text-qcloud-text">
        {rule.visualPattern}
      </div>
      <div className="text-xs text-qcloud-muted mt-0.5 truncate">
        {rule.name}
      </div>
    </button>
  )
}

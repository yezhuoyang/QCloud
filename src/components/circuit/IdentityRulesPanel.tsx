import { useState, useMemo } from 'react'
import { Circuit } from '../../types/circuit'
import { IdentityRule, PatternMatch, RuleCategory } from '../../types/identityRules'
import { BUILTIN_IDENTITY_RULES, CATEGORY_LABELS, CATEGORY_DESCRIPTIONS } from '../../data/builtinRules'
import { PatternMatcher } from '../../utils/patternMatcher'
import RuleCard from './RuleCard'

interface IdentityRulesPanelProps {
  circuit: Circuit
  selectedGates: Set<string>
  userRules: IdentityRule[]
  onApplyRule: (ruleId: string, match: PatternMatch) => void
  onHighlightMatches: (matches: PatternMatch[]) => void
  onApplyAllMatches: (ruleId: string, matches: PatternMatch[]) => void
  onAddCustomRule: () => void
}

export default function IdentityRulesPanel({
  circuit,
  selectedGates,
  userRules,
  onApplyRule,
  onHighlightMatches,
  onApplyAllMatches,
  onAddCustomRule
}: IdentityRulesPanelProps) {
  // Expanded/collapsed state for categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['cancellation', 'simplification'])
  )

  // Active rule for highlighting
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null)

  // Combine built-in and user rules
  const allRules = useMemo(() => [...BUILTIN_IDENTITY_RULES, ...userRules], [userRules])

  // Create pattern matcher
  const patternMatcher = useMemo(() => new PatternMatcher(allRules), [allRules])

  // Count matches for each rule
  const matchCounts = useMemo(() => patternMatcher.countMatches(circuit), [patternMatcher, circuit])

  // Check which rules are applicable to current selection
  const applicableRules = useMemo(() => {
    if (selectedGates.size === 0) return new Set<string>()

    const applicable = patternMatcher.findApplicableRules(circuit, selectedGates)
    return new Set(applicable.map(a => a.rule.id))
  }, [patternMatcher, circuit, selectedGates])

  // Group rules by category
  const rulesByCategory = useMemo(() => {
    const groups = new Map<RuleCategory, IdentityRule[]>()

    for (const rule of allRules) {
      const existing = groups.get(rule.category) || []
      existing.push(rule)
      groups.set(rule.category, existing)
    }

    return groups
  }, [allRules])

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  // Handle "Find All" for a rule
  const handleFindAll = (ruleId: string) => {
    const matches = patternMatcher.findMatches(circuit, ruleId)
    setActiveRuleId(ruleId)
    onHighlightMatches(matches)
  }

  // Handle "Apply" for a rule with current selection
  const handleApply = (ruleId: string) => {
    const validation = patternMatcher.validateSelection(circuit, selectedGates, ruleId)
    if (validation.valid && validation.match) {
      onApplyRule(ruleId, validation.match)
      setActiveRuleId(null)
      onHighlightMatches([])
    }
  }

  // Handle "Apply All" for a rule
  const handleApplyAll = (ruleId: string) => {
    const matches = patternMatcher.findMatches(circuit, ruleId)
    if (matches.length > 0) {
      onApplyAllMatches(ruleId, matches)
      setActiveRuleId(null)
      onHighlightMatches([])
    }
  }

  // Clear highlights when clicking outside
  const handleClearHighlights = () => {
    setActiveRuleId(null)
    onHighlightMatches([])
  }

  // Category order for display
  const categoryOrder: RuleCategory[] = ['cancellation', 'simplification', 'decomposition', 'custom']

  return (
    <div className="h-full flex flex-col bg-white border-l border-qcloud-border">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-qcloud-border">
        <h2 className="font-semibold text-qcloud-text">Circuit Identities</h2>
        <p className="text-xs text-qcloud-muted mt-1">
          Select gates and apply rules to simplify
        </p>
      </div>

      {/* Selection status */}
      {selectedGates.size > 0 && (
        <div className="flex-shrink-0 px-4 py-2 bg-qcloud-primary/10 border-b border-qcloud-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-qcloud-primary font-medium">
              {selectedGates.size} gate{selectedGates.size !== 1 ? 's' : ''} selected
            </span>
            {applicableRules.size > 0 && (
              <span className="text-xs text-qcloud-primary">
                {applicableRules.size} applicable rule{applicableRules.size !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Rules list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {categoryOrder.map(category => {
          const rules = rulesByCategory.get(category) || []
          if (rules.length === 0 && category !== 'custom') return null

          const isExpanded = expandedCategories.has(category)
          const totalMatches = rules.reduce((sum, r) => sum + (matchCounts.get(r.id) || 0), 0)

          return (
            <div key={category} className="space-y-2">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between py-2 px-1 text-left hover:bg-qcloud-bg rounded transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className={`w-4 h-4 text-qcloud-muted transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span className="font-medium text-sm text-qcloud-text">
                    {CATEGORY_LABELS[category] || category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {totalMatches > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                      {totalMatches}
                    </span>
                  )}
                  <span className="text-xs text-qcloud-muted">
                    {rules.length}
                  </span>
                </div>
              </button>

              {/* Category description */}
              {isExpanded && (
                <p className="text-xs text-qcloud-muted px-1 mb-2">
                  {CATEGORY_DESCRIPTIONS[category]}
                </p>
              )}

              {/* Rules in category */}
              {isExpanded && (
                <div className="space-y-2">
                  {rules.map(rule => (
                    <RuleCard
                      key={rule.id}
                      rule={rule}
                      matchCount={matchCounts.get(rule.id) || 0}
                      isApplicable={applicableRules.has(rule.id)}
                      onFindAll={() => handleFindAll(rule.id)}
                      onApply={() => handleApply(rule.id)}
                      onApplyAll={
                        (matchCounts.get(rule.id) || 0) > 0
                          ? () => handleApplyAll(rule.id)
                          : undefined
                      }
                      disabled={circuit.gates.length === 0}
                    />
                  ))}

                  {/* Add custom rule button */}
                  {category === 'custom' && (
                    <button
                      onClick={onAddCustomRule}
                      className="w-full p-3 border-2 border-dashed border-qcloud-border rounded-lg text-sm text-qcloud-muted hover:text-qcloud-primary hover:border-qcloud-primary transition-colors flex items-center justify-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Add Custom Rule
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer with clear button */}
      {activeRuleId && (
        <div className="flex-shrink-0 p-4 border-t border-qcloud-border bg-amber-50">
          <button
            onClick={handleClearHighlights}
            className="w-full py-2 text-sm text-amber-700 hover:bg-amber-100 rounded transition-colors"
          >
            Clear Highlights
          </button>
        </div>
      )}

      {/* Help text */}
      <div className="flex-shrink-0 p-4 border-t border-qcloud-border bg-qcloud-bg">
        <div className="text-xs text-qcloud-muted space-y-1">
          <p><strong>How to use:</strong></p>
          <p>1. Click "Find" to highlight matches in circuit</p>
          <p>2. Ctrl+click gates to multi-select</p>
          <p>3. Click "Apply" when selection matches a rule</p>
        </div>
      </div>
    </div>
  )
}

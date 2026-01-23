import { ResourceConstraints, FidelityRequirement } from '../../types/competition'

interface ConstraintsPanelProps {
  constraints: ResourceConstraints
  fidelityRequirement: FidelityRequirement
}

export default function ConstraintsPanel({ constraints, fidelityRequirement }: ConstraintsPanelProps) {
  return (
    <div className="bg-slate-50 rounded-lg p-4 space-y-4">
      <h4 className="font-semibold text-qcloud-text flex items-center gap-2">
        <svg className="w-4 h-4 text-qcloud-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Constraints
      </h4>

      {/* Resource Constraints */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg p-3 border border-qcloud-border">
          <div className="text-xs text-qcloud-muted mb-1">Max Qubits</div>
          <div className="text-lg font-bold text-qcloud-text">{constraints.maxQubits}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-qcloud-border">
          <div className="text-xs text-qcloud-muted mb-1">Max Gates</div>
          <div className="text-lg font-bold text-qcloud-text">{constraints.maxGateCount}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-qcloud-border">
          <div className="text-xs text-qcloud-muted mb-1">Max Depth</div>
          <div className="text-lg font-bold text-qcloud-text">{constraints.maxCircuitDepth}</div>
        </div>
      </div>

      {constraints.maxTwoQubitGates !== undefined && (
        <div className="text-sm text-qcloud-muted">
          Maximum {constraints.maxTwoQubitGates} two-qubit gates allowed
        </div>
      )}

      {constraints.allowedGates && constraints.allowedGates.length > 0 && (
        <div className="text-sm">
          <span className="text-qcloud-muted">Allowed gates: </span>
          <span className="font-mono text-qcloud-text">
            {constraints.allowedGates.join(', ')}
          </span>
        </div>
      )}

      {/* Fidelity Requirements */}
      <div className="pt-3 border-t border-qcloud-border">
        <h5 className="text-sm font-medium text-qcloud-text mb-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-qcloud-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Fidelity Requirements
        </h5>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-qcloud-muted">Minimum to pass:</span>
            <span className="font-mono font-medium text-amber-600">
              {(fidelityRequirement.minFidelity * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-qcloud-muted">Target (full score):</span>
            <span className="font-mono font-medium text-green-600">
              {(fidelityRequirement.targetFidelity * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-xs text-qcloud-muted">
            Metric: {fidelityRequirement.metric.replace(/_/g, ' ')}
          </div>
        </div>
      </div>
    </div>
  )
}

// Compact version for result pages
interface ResourceUsageProps {
  used: number
  max: number
  label: string
}

export function ResourceUsageBar({ used, max, label }: ResourceUsageProps) {
  const percentage = Math.min(100, (used / max) * 100)
  const isOver = used > max
  const isWarning = percentage > 80

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-qcloud-muted">{label}</span>
        <span className={`font-mono ${isOver ? 'text-red-600' : 'text-qcloud-text'}`}>
          {used}/{max}
        </span>
      </div>
      <div className="h-2 bg-qcloud-bg rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Simulation Results Component
 * Displays quantum simulation results with histogram and stats
 */

import { useState } from 'react'
import { SimulationResult, formatMeasurements } from '../utils/simulationService'

interface SimulationResultsProps {
  result: SimulationResult
  onClose?: () => void
  showCloseButton?: boolean
}

export default function SimulationResults({
  result,
  onClose,
  showCloseButton = true
}: SimulationResultsProps) {
  const [showAllResults, setShowAllResults] = useState(false)

  if (!result.success) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center gap-2 text-red-700 mb-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">Simulation Failed</span>
        </div>
        <p className="text-red-600 text-sm">{result.error}</p>
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
          >
            Close
          </button>
        )}
      </div>
    )
  }

  const formattedResults = formatMeasurements(result.measurements, result.shots)
  const displayResults = showAllResults ? formattedResults : formattedResults.slice(0, 8)
  const maxCount = Math.max(...formattedResults.map(r => r.count))

  return (
    <div className="bg-white border border-qcloud-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-qcloud-primary/5 to-qcloud-secondary/5 border-b border-qcloud-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold text-qcloud-text">Simulation Complete</span>
            {result.backend && (
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                result.backend === 'aer_simulator'
                  ? 'bg-blue-100 text-blue-700'
                  : result.backend.includes('ibm_hardware')
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-green-100 text-green-700'
              }`}>
                {result.backend === 'aer_simulator'
                  ? 'Qiskit Aer'
                  : result.backend.includes('ibm_hardware')
                    ? result.backend.replace('ibm_hardware', 'IBM Quantum')
                    : 'Browser'}
              </span>
            )}
          </div>
          {showCloseButton && onClose && (
            <button
              onClick={onClose}
              className="text-qcloud-muted hover:text-qcloud-text transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-qcloud-border bg-qcloud-bg/30">
        <div className="text-center">
          <div className="text-2xl font-bold text-qcloud-primary">{result.numQubits}</div>
          <div className="text-xs text-qcloud-muted">Qubits</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-qcloud-secondary">{result.gateCount}</div>
          <div className="text-xs text-qcloud-muted">Gates</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-500">{result.circuitDepth}</div>
          <div className="text-xs text-qcloud-muted">Depth</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">{result.executionTime}ms</div>
          <div className="text-xs text-qcloud-muted">Time</div>
        </div>
      </div>

      {/* Measurement Histogram */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-qcloud-text text-sm">
            Measurement Results ({result.shots.toLocaleString()} shots)
          </h4>
          {formattedResults.length > 8 && (
            <button
              onClick={() => setShowAllResults(!showAllResults)}
              className="text-xs text-qcloud-primary hover:text-qcloud-secondary transition-colors"
            >
              {showAllResults ? 'Show Less' : `Show All (${formattedResults.length})`}
            </button>
          )}
        </div>

        <div className="space-y-2">
          {displayResults.map(({ bitstring, count, probability }) => (
            <div key={bitstring} className="flex items-center gap-3">
              <code className="w-24 text-sm font-mono text-qcloud-text bg-qcloud-bg px-2 py-1 rounded">
                |{bitstring}⟩
              </code>
              <div className="flex-1 h-6 bg-qcloud-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-qcloud-primary to-qcloud-secondary rounded-full transition-all duration-300"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <div className="w-20 text-right">
                <span className="text-sm font-medium text-qcloud-text">
                  {(probability * 100).toFixed(1)}%
                </span>
                <span className="text-xs text-qcloud-muted ml-1">
                  ({count})
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* State Vector (if available) */}
        {result.stateVector && (
          <div className="mt-4 pt-4 border-t border-qcloud-border">
            <h4 className="font-medium text-qcloud-text text-sm mb-2">State Vector</h4>
            <code className="block text-xs bg-qcloud-bg p-3 rounded-lg overflow-x-auto text-qcloud-text whitespace-pre-wrap">
              |ψ⟩ = {typeof result.stateVector === 'string'
                ? result.stateVector
                : result.stateVector.map((c, i) => {
                    const mag = Math.sqrt(c.re * c.re + c.im * c.im);
                    if (mag < 0.001) return null;
                    const sign = c.im >= 0 ? '+' : '-';
                    return `(${c.re.toFixed(3)}${sign}${Math.abs(c.im).toFixed(3)}i)|${i.toString(2).padStart(result.numQubits, '0')}⟩`;
                  }).filter(Boolean).join(' + ')
              }
            </code>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Modal wrapper for simulation results
 */
interface SimulationModalProps {
  result: SimulationResult | null
  isOpen: boolean
  onClose: () => void
}

export function SimulationModal({ result, isOpen, onClose }: SimulationModalProps) {
  if (!isOpen || !result) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-auto">
        <SimulationResults result={result} onClose={onClose} />
      </div>
    </div>
  )
}

/**
 * Inline results panel (for split view)
 */
interface SimulationPanelProps {
  result: SimulationResult | null
  isLoading?: boolean
  onClear?: () => void
}

export function SimulationPanel({ result, isLoading, onClear }: SimulationPanelProps) {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-qcloud-bg/50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-qcloud-muted">Running simulation...</p>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="h-full flex items-center justify-center bg-qcloud-bg/50">
        <div className="text-center text-qcloud-muted">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>Run simulation to see results</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <SimulationResults result={result} onClose={onClear} showCloseButton={!!onClear} />
    </div>
  )
}

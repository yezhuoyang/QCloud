import { useState } from 'react'
import { TestCaseResult } from '../../types/competition'

interface TestCaseResultsProps {
  results: TestCaseResult[]
  showDetails?: boolean
}

export default function TestCaseResults({ results, showDetails = true }: TestCaseResultsProps) {
  const [expandedTest, setExpandedTest] = useState<string | null>(null)

  const passedCount = results.filter(r => r.passed).length
  const totalCount = results.length

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-qcloud-text">Test Results</h4>
        <div className="flex items-center gap-2">
          <span className={`font-medium ${passedCount === totalCount ? 'text-green-600' : 'text-amber-600'}`}>
            {passedCount}/{totalCount} passed
          </span>
        </div>
      </div>

      {/* Results table */}
      <div className="border border-qcloud-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-qcloud-bg">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-qcloud-muted uppercase">Test</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-qcloud-muted uppercase">Status</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-qcloud-muted uppercase">Fidelity</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-qcloud-muted uppercase">Time</th>
              {showDetails && (
                <th className="px-4 py-2 text-center text-xs font-medium text-qcloud-muted uppercase">Details</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-qcloud-border">
            {results.map(result => (
              <>
                <tr key={result.testCaseId} className="hover:bg-qcloud-bg/50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-qcloud-text">{result.testCaseName}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {result.passed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Fail
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-mono ${
                      result.fidelity >= 0.9 ? 'text-green-600' :
                      result.fidelity >= 0.7 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {(result.fidelity * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-qcloud-muted">{result.executionTime}ms</span>
                  </td>
                  {showDetails && (
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setExpandedTest(
                          expandedTest === result.testCaseId ? null : result.testCaseId
                        )}
                        className="p-1 hover:bg-qcloud-bg rounded transition-colors"
                      >
                        <svg
                          className={`w-4 h-4 text-qcloud-muted transition-transform ${
                            expandedTest === result.testCaseId ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>

                {/* Expanded details */}
                {showDetails && expandedTest === result.testCaseId && (
                  <tr key={`${result.testCaseId}-details`}>
                    <td colSpan={5} className="px-4 py-3 bg-slate-50">
                      <div className="space-y-3">
                        {/* Circuit metrics */}
                        <div className="flex gap-6 text-sm">
                          <div>
                            <span className="text-qcloud-muted">Gates: </span>
                            <span className="font-mono">{result.gateCount}</span>
                          </div>
                          <div>
                            <span className="text-qcloud-muted">Depth: </span>
                            <span className="font-mono">{result.circuitDepth}</span>
                          </div>
                        </div>

                        {/* Measurements */}
                        {result.measurements && Object.keys(result.measurements).length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-qcloud-text mb-2">Measurements:</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(result.measurements)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 8)
                                .map(([state, count]) => (
                                  <div
                                    key={state}
                                    className="px-2 py-1 bg-white rounded border border-qcloud-border text-sm"
                                  >
                                    <span className="font-mono text-qcloud-primary">|{state}⟩</span>
                                    <span className="text-qcloud-muted ml-2">{count}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Error message */}
                        {result.errorMessage && (
                          <div className="p-2 bg-red-50 rounded border border-red-200 text-sm text-red-700">
                            {result.errorMessage}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Simple fidelity meter component
interface FidelityMeterProps {
  fidelity: number
  minRequired: number
  target: number
}

export function FidelityMeter({ fidelity, minRequired, target }: FidelityMeterProps) {
  const percentage = fidelity * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-qcloud-muted">Fidelity</span>
        <span className={`font-mono font-bold ${
          fidelity >= target ? 'text-green-600' :
          fidelity >= minRequired ? 'text-amber-600' : 'text-red-600'
        }`}>
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="relative h-3 bg-qcloud-bg rounded-full overflow-hidden">
        {/* Min required marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
          style={{ left: `${minRequired * 100}%` }}
        />
        {/* Target marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-green-500 z-10"
          style={{ left: `${target * 100}%` }}
        />
        {/* Fill */}
        <div
          className={`h-full rounded-full transition-all ${
            fidelity >= target ? 'bg-green-500' :
            fidelity >= minRequired ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-qcloud-muted">
        <span>0%</span>
        <span className="text-amber-600">Min: {(minRequired * 100).toFixed(0)}%</span>
        <span className="text-green-600">Target: {(target * 100).toFixed(0)}%</span>
        <span>100%</span>
      </div>
    </div>
  )
}

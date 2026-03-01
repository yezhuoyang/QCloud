import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { homeworkApi, type HomeworkSubmissionResult } from '../utils/api'

function HomeworkResultPage() {
  const { homeworkId, submissionId } = useParams<{ homeworkId: string; submissionId: string }>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [submission, setSubmission] = useState<HomeworkSubmissionResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!submissionId || !token) return
    async function fetchSubmission() {
      try {
        const data = await homeworkApi.getStatus(submissionId!, token)
        setSubmission(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load submission')
      } finally {
        setIsLoading(false)
      }
    }
    fetchSubmission()

    // Poll if still running
    const interval = setInterval(async () => {
      try {
        const data = await homeworkApi.getStatus(submissionId!, token)
        setSubmission(data)
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval)
        }
      } catch { /* ignore */ }
    }, 15000)

    return () => clearInterval(interval)
  }, [submissionId, token])

  return (
    <div className="min-h-screen bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg">
      {/* Header */}
      <header className="bg-white border-b border-qcloud-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Logo size="small" />
          </Link>
          <h1 className="text-lg font-bold text-qcloud-text">Submission Results</h1>
        </div>
        <Link
          to={`/homework/${homeworkId}`}
          className="px-4 py-2 text-sm bg-qcloud-primary/10 text-qcloud-primary rounded-lg hover:bg-qcloud-primary/20 transition-colors"
        >
          Back to Homework
        </Link>
      </header>

      <div className="max-w-3xl mx-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">
            {error}
          </div>
        ) : submission ? (
          <div className="space-y-6">
            {/* Status Banner */}
            <div className={`rounded-xl p-6 text-center ${
              submission.status === 'completed' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' :
              submission.status === 'running' ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200' :
              submission.status === 'queued' ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200' :
              'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200'
            }`}>
              <div className="text-4xl mb-2">
                {submission.status === 'completed' ? '✅' :
                 submission.status === 'running' ? '🔄' :
                 submission.status === 'queued' ? '⏳' : '❌'}
              </div>
              <h2 className="text-xl font-bold mb-1">
                {submission.status === 'completed' ? 'Completed!' :
                 submission.status === 'running' ? 'Running on Hardware...' :
                 submission.status === 'queued' ? `In Queue (Position #${submission.queue_position})` :
                 'Failed'}
              </h2>
              {submission.status === 'completed' && submission.score != null && (
                <p className="text-3xl font-bold text-qcloud-primary mt-2">
                  Score: {submission.score}/100
                </p>
              )}
              {submission.error_message && (
                <p className="text-sm text-red-600 mt-2">{submission.error_message}</p>
              )}
            </div>

            {/* Fidelity Results */}
            {submission.status === 'completed' && submission.fidelity_before != null && (
              <div className="bg-white rounded-xl border border-qcloud-border p-6">
                <h3 className="font-semibold text-qcloud-text mb-4">Fidelity Results</h3>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-sm text-qcloud-muted mb-1">Reference Circuit</div>
                    <div className="text-2xl font-bold text-gray-500">
                      {((submission.fidelity_before || 0) * 100).toFixed(1)}%
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                      <div
                        className="bg-gray-400 h-3 rounded-full"
                        style={{ width: `${(submission.fidelity_before || 0) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-qcloud-muted mb-1">Your Circuit</div>
                    <div className="text-2xl font-bold text-qcloud-primary">
                      {((submission.fidelity_after || 0) * 100).toFixed(1)}%
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                      <div
                        className="bg-qcloud-primary h-3 rounded-full"
                        style={{ width: `${(submission.fidelity_after || 0) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-qcloud-muted mb-1">Improvement</div>
                    <div className={`text-2xl font-bold ${
                      (submission.fidelity_improvement || 0) > 0 ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {(submission.fidelity_improvement || 0) > 0 ? '+' : ''}
                      {((submission.fidelity_improvement || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Circuit Stats */}
            <div className="bg-white rounded-xl border border-qcloud-border p-6">
              <h3 className="font-semibold text-qcloud-text mb-4">Submission Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-qcloud-muted">Backend</span>
                  <p className="font-medium">{submission.backend_name}</p>
                </div>
                <div>
                  <span className="text-qcloud-muted">Shots</span>
                  <p className="font-medium">{submission.shots}</p>
                </div>
                {submission.qubit_count != null && (
                  <div>
                    <span className="text-qcloud-muted">Qubits</span>
                    <p className="font-medium">{submission.qubit_count}</p>
                  </div>
                )}
                {submission.gate_count != null && (
                  <div>
                    <span className="text-qcloud-muted">Gates</span>
                    <p className="font-medium">{submission.gate_count}</p>
                  </div>
                )}
                {submission.circuit_depth != null && (
                  <div>
                    <span className="text-qcloud-muted">Circuit Depth</span>
                    <p className="font-medium">{submission.circuit_depth}</p>
                  </div>
                )}
                {submission.execution_time_seconds != null && (
                  <div>
                    <span className="text-qcloud-muted">Execution Time</span>
                    <p className="font-medium">{submission.execution_time_seconds.toFixed(1)}s</p>
                  </div>
                )}
                <div>
                  <span className="text-qcloud-muted">Submitted</span>
                  <p className="font-medium">{new Date(submission.created_at).toLocaleString()}</p>
                </div>
                {submission.completed_at && (
                  <div>
                    <span className="text-qcloud-muted">Completed</span>
                    <p className="font-medium">{new Date(submission.completed_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Measurement Results */}
            {submission.measurements_after && (
              <div className="bg-white rounded-xl border border-qcloud-border p-6">
                <h3 className="font-semibold text-qcloud-text mb-4">Measurement Results (Your Circuit)</h3>
                <div className="space-y-2">
                  {Object.entries(submission.measurements_after)
                    .sort(([, a], [, b]) => b - a)
                    .map(([state, count]) => {
                      const total = Object.values(submission.measurements_after!).reduce((a, b) => a + b, 0)
                      const pct = (count / total) * 100
                      return (
                        <div key={state} className="flex items-center gap-3">
                          <span className="font-mono text-sm w-16 text-right">|{state}⟩</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                            <div
                              className="bg-qcloud-primary h-5 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-sm text-qcloud-muted w-20 text-right">
                            {count} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <Link
                to={`/homework/${homeworkId}`}
                className="flex-1 text-center px-6 py-3 bg-qcloud-primary text-white rounded-lg font-semibold hover:bg-qcloud-secondary transition-colors"
              >
                Submit Again
              </Link>
              <Link
                to={`/homework/${homeworkId}/leaderboard`}
                className="flex-1 text-center px-6 py-3 bg-amber-50 text-amber-700 rounded-lg font-semibold hover:bg-amber-100 transition-colors border border-amber-200"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default HomeworkResultPage

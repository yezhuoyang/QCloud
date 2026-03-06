import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import CodeEditor from '../components/CodeEditor'
import { challengeApi, type ChallengeSubmissionResult } from '../utils/api'

function ChallengeResultPage() {
  const { challengeId, submissionId } = useParams<{ challengeId: string; submissionId: string }>()
  const [submission, setSubmission] = useState<ChallengeSubmissionResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!submissionId) return
    const poll = async () => {
      try {
        const result = await challengeApi.getStatus(submissionId)
        setSubmission(result)
        if (result.status === 'running' || result.status === 'queued') {
          setTimeout(poll, 5000)
        }
      } catch (err) {
        setError('Failed to load submission')
      } finally {
        setIsLoading(false)
      }
    }
    poll()
  }, [submissionId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-qcloud-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !submission) {
    return (
      <div className="min-h-screen bg-qcloud-bg flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-red-200 text-center">
          <p className="text-red-500 text-lg">{error || 'Submission not found'}</p>
          <Link to={`/challenge/${challengeId}`} className="text-qcloud-primary hover:underline mt-4 inline-block">
            Back to Challenge
          </Link>
        </div>
      </div>
    )
  }

  const isRunning = submission.status === 'running' || submission.status === 'queued'

  return (
    <div className="min-h-screen bg-qcloud-bg">
      <header className="bg-white border-b border-qcloud-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/challenge/${challengeId}`} className="text-qcloud-primary hover:underline text-sm">
            ← Back to Challenge
          </Link>
          <h1 className="text-lg font-bold text-qcloud-text">Submission Result</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link to={`/challenge/${challengeId}/leaderboard`} className="text-sm text-qcloud-muted hover:text-qcloud-primary">
            Leaderboard
          </Link>
          <Link to={`/challenge/${challengeId}/queue`} className="text-sm text-qcloud-muted hover:text-qcloud-primary">
            Queue
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Status */}
        <div className="bg-white rounded-xl border border-qcloud-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-qcloud-text">
              {isRunning ? 'Job Running...' : submission.status === 'completed' ? 'Results' : 'Job Failed'}
            </h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              submission.status === 'completed' ? 'bg-green-100 text-green-700' :
              submission.status === 'failed' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {submission.status}
            </span>
          </div>

          {isRunning && (
            <div className="flex items-center gap-3 text-qcloud-muted">
              <div className="w-5 h-5 border-2 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
              <span>Waiting for IBM hardware... (auto-refreshing)</span>
            </div>
          )}

          {submission.status === 'failed' && submission.error_message && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {submission.error_message}
            </div>
          )}

          {submission.status === 'completed' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-qcloud-bg rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-qcloud-primary">
                  {submission.score != null ? (submission.score * 100).toFixed(1) + '%' : 'N/A'}
                </div>
                <div className="text-xs text-qcloud-muted mt-1">Score</div>
              </div>
              <div className="bg-qcloud-bg rounded-lg p-4 text-center">
                <div className="text-lg font-bold text-qcloud-text">{submission.backend_name}</div>
                <div className="text-xs text-qcloud-muted mt-1">Backend</div>
              </div>
              <div className="bg-qcloud-bg rounded-lg p-4 text-center">
                <div className="text-lg font-bold text-qcloud-text">{submission.shots}</div>
                <div className="text-xs text-qcloud-muted mt-1">Shots</div>
              </div>
              <div className="bg-qcloud-bg rounded-lg p-4 text-center">
                <div className="text-lg font-bold text-qcloud-text">
                  {submission.execution_time_seconds ? `${submission.execution_time_seconds.toFixed(1)}s` : '—'}
                </div>
                <div className="text-xs text-qcloud-muted mt-1">Execution Time</div>
              </div>
            </div>
          )}
        </div>

        {/* Circuit Stats */}
        {(submission.qubit_count || submission.gate_count || submission.circuit_depth) && (
          <div className="bg-white rounded-xl border border-qcloud-border p-6">
            <h3 className="font-semibold text-qcloud-text mb-3">Circuit Statistics</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-qcloud-text">{submission.qubit_count ?? '—'}</div>
                <div className="text-xs text-qcloud-muted">Qubits</div>
              </div>
              <div>
                <div className="text-lg font-bold text-qcloud-text">{submission.gate_count ?? '—'}</div>
                <div className="text-xs text-qcloud-muted">Gates</div>
              </div>
              <div>
                <div className="text-lg font-bold text-qcloud-text">{submission.circuit_depth ?? '—'}</div>
                <div className="text-xs text-qcloud-muted">Depth</div>
              </div>
            </div>
          </div>
        )}

        {/* Measurements */}
        {submission.measurements && Object.keys(submission.measurements).length > 0 && (
          <div className="bg-white rounded-xl border border-qcloud-border p-6">
            <h3 className="font-semibold text-qcloud-text mb-3">Measurements</h3>
            <div className="max-h-64 overflow-y-auto">
              <div className="space-y-1">
                {Object.entries(submission.measurements)
                  .sort(([, a], [, b]) => b - a)
                  .map(([bitstring, count]) => {
                    const total = Object.values(submission.measurements!).reduce((s, c) => s + c, 0)
                    const pct = (count / total) * 100
                    return (
                      <div key={bitstring} className="flex items-center gap-2">
                        <code className="text-xs font-mono w-24 text-right">{bitstring}</code>
                        <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                          <div
                            className="bg-qcloud-primary h-full rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-qcloud-muted w-20 text-right">
                          {count} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Submitted Code */}
        {submission.code && (
          <div className="bg-white rounded-xl border border-qcloud-border p-6">
            <h3 className="font-semibold text-qcloud-text mb-3">Your Submitted Code</h3>
            <CodeEditor
              value={submission.code}
              onChange={() => {}}
            />
          </div>
        )}

        {/* Metadata */}
        <div className="bg-white rounded-xl border border-qcloud-border p-6">
          <h3 className="font-semibold text-qcloud-text mb-3">Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-qcloud-muted">Submission ID</div>
            <div className="font-mono text-xs">{submission.id}</div>
            {submission.ibmq_job_id && (
              <>
                <div className="text-qcloud-muted">IBM Job ID</div>
                <div className="font-mono text-xs">{submission.ibmq_job_id}</div>
              </>
            )}
            <div className="text-qcloud-muted">Created</div>
            <div>{new Date(submission.created_at).toLocaleString()}</div>
            {submission.completed_at && (
              <>
                <div className="text-qcloud-muted">Completed</div>
                <div>{new Date(submission.completed_at).toLocaleString()}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChallengeResultPage

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { challengeApi, type ChallengeQueueStatus } from '../utils/api'

function ChallengeQueuePage() {
  const { challengeId } = useParams<{ challengeId: string }>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [queue, setQueue] = useState<ChallengeQueueStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchQueue = async () => {
    if (!challengeId) return
    try {
      const data = await challengeApi.getQueueStatus(challengeId, token || undefined)
      setQueue(data)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 10000)
    return () => clearInterval(interval)
  }, [challengeId, token])

  return (
    <div className="min-h-screen bg-qcloud-bg">
      <header className="bg-white border-b border-qcloud-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/challenge/${challengeId}`} className="text-qcloud-primary hover:underline text-sm">
            ← Back to Challenge
          </Link>
          <h1 className="text-lg font-bold text-qcloud-text">Job Queue</h1>
        </div>
        <button onClick={fetchQueue} className="text-sm text-qcloud-primary hover:underline">
          Refresh
        </button>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !queue ? (
          <div className="text-center py-12 text-qcloud-muted">Failed to load queue status</div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-qcloud-border p-4 text-center">
                <div className="text-2xl font-bold text-yellow-500">{queue.total_queued}</div>
                <div className="text-sm text-qcloud-muted">Queued</div>
              </div>
              <div className="bg-white rounded-xl border border-qcloud-border p-4 text-center">
                <div className="text-2xl font-bold text-green-500">{queue.total_running}</div>
                <div className="text-sm text-qcloud-muted">Running</div>
              </div>
              <div className="bg-white rounded-xl border border-qcloud-border p-4 text-center">
                <div className="text-2xl font-bold text-qcloud-primary">~{queue.estimated_wait_minutes} min</div>
                <div className="text-sm text-qcloud-muted">Est. Wait</div>
              </div>
            </div>

            {/* My submissions */}
            {queue.my_submissions.length > 0 && (
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Your Active Submissions</h3>
                <div className="space-y-2">
                  {queue.my_submissions.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between text-sm">
                      <Link to={`/challenge/${challengeId}/results/${sub.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                        {sub.id.slice(0, 8)}...
                      </Link>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        sub.status === 'running' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {sub.status}{sub.position ? ` (#${sub.position})` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Running */}
            <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden">
              <div className="px-6 py-3 border-b border-qcloud-border bg-green-50">
                <h3 className="font-semibold text-green-800">Running ({queue.running.length})</h3>
              </div>
              <div className="p-4">
                {queue.running.length === 0 ? (
                  <p className="text-center text-qcloud-muted py-4">No jobs running</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-qcloud-muted border-b">
                      <th className="pb-2">Participant</th><th className="pb-2">Backend</th><th className="pb-2">Started</th>
                    </tr></thead>
                    <tbody>
                      {queue.running.map(entry => (
                        <tr key={entry.id} className="border-b last:border-0">
                          <td className="py-2 font-mono text-xs">{entry.participant_label}</td>
                          <td className="py-2">{entry.backend}</td>
                          <td className="py-2 text-qcloud-muted">{entry.started_at ? new Date(entry.started_at).toLocaleTimeString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Queued */}
            <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden">
              <div className="px-6 py-3 border-b border-qcloud-border bg-yellow-50">
                <h3 className="font-semibold text-yellow-800">Queued ({queue.queue.length})</h3>
              </div>
              <div className="p-4">
                {queue.queue.length === 0 ? (
                  <p className="text-center text-qcloud-muted py-4">Queue is empty</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-qcloud-muted border-b">
                      <th className="pb-2">#</th><th className="pb-2">Participant</th><th className="pb-2">Backend</th><th className="pb-2">Submitted</th>
                    </tr></thead>
                    <tbody>
                      {queue.queue.map(entry => (
                        <tr key={entry.id} className="border-b last:border-0">
                          <td className="py-2 font-bold">{entry.position}</td>
                          <td className="py-2 font-mono text-xs">{entry.participant_label}</td>
                          <td className="py-2">{entry.backend}</td>
                          <td className="py-2 text-qcloud-muted">{new Date(entry.submitted_at).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ChallengeQueuePage

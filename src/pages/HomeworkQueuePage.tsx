import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import Logo from '../components/Logo'
import { homeworkApi, type HomeworkQueueStatus } from '../utils/api'

function HomeworkQueuePage() {
  const { homeworkId } = useParams<{ homeworkId: string }>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [queue, setQueue] = useState<HomeworkQueueStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    if (!homeworkId) return
    try {
      const data = await homeworkApi.getQueueStatus(homeworkId, token || undefined)
      setQueue(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to load queue')
    } finally {
      setIsLoading(false)
    }
  }, [homeworkId, token])

  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 8000)
    return () => clearInterval(interval)
  }, [fetchQueue])

  // Build a unified job list: running first, then queued (FIFO order)
  const myJobIds = new Set(queue?.my_submissions.map(s => s.id) || [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg">
      {/* Header */}
      <header className="bg-white border-b border-qcloud-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Logo size="small" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-qcloud-text">Job Queue</h1>
            <p className="text-sm text-qcloud-muted">
              FIFO execution order — max 5 concurrent jobs on IBM hardware
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/homework/${homeworkId}/leaderboard`}
            className="px-4 py-2 text-sm bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
          >
            Leaderboard
          </Link>
          <Link
            to={`/homework/${homeworkId}`}
            className="px-4 py-2 text-sm bg-qcloud-primary/10 text-qcloud-primary rounded-lg hover:bg-qcloud-primary/20 transition-colors"
          >
            Back to Homework
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {/* Stats */}
        {queue && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-qcloud-border p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {queue.total_running}
              </div>
              <div className="text-sm text-qcloud-muted">Running</div>
            </div>
            <div className="bg-white rounded-xl border border-qcloud-border p-4 text-center">
              <div className="text-2xl font-bold text-amber-500">
                {queue.total_queued}
              </div>
              <div className="text-sm text-qcloud-muted">Queued</div>
            </div>
            <div className="bg-white rounded-xl border border-qcloud-border p-4 text-center">
              <div className="text-2xl font-bold text-qcloud-primary">
                {queue.estimated_wait_minutes > 0
                  ? `~${queue.estimated_wait_minutes}m`
                  : '—'}
              </div>
              <div className="text-sm text-qcloud-muted">Est. Wait</div>
            </div>
          </div>
        )}

        {/* Queue Table */}
        <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-16 text-red-500">{error}</div>
          ) : queue && queue.total_running === 0 && queue.total_queued === 0 ? (
            <div className="text-center py-16 text-qcloud-muted">
              <p className="text-lg mb-2">Queue is empty</p>
              <p className="text-sm">No jobs are currently running or waiting.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-qcloud-border text-left text-sm text-qcloud-muted">
                  <th className="px-4 py-3 w-16">#</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Backend</th>
                  <th className="px-4 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {/* Running jobs first */}
                {queue?.running.map((job, idx) => {
                  const isMine = myJobIds.has(job.id)
                  return (
                    <tr
                      key={job.id}
                      className={`border-b border-qcloud-border transition-colors ${
                        isMine ? 'bg-blue-50/50' : 'hover:bg-qcloud-bg/30'
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-qcloud-muted">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          Running
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-sm ${isMine ? 'text-qcloud-primary font-semibold' : 'text-qcloud-text'}`}>
                          {isMine ? 'You' : job.student_label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                          {job.backend}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-qcloud-muted">
                        {job.started_at ? formatTime(job.started_at) : '—'}
                      </td>
                    </tr>
                  )
                })}
                {/* Queued jobs */}
                {queue?.queue.map((job) => {
                  const isMine = myJobIds.has(job.id)
                  return (
                    <tr
                      key={job.id}
                      className={`border-b border-qcloud-border transition-colors ${
                        isMine ? 'bg-blue-50/50' : 'hover:bg-qcloud-bg/30'
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-qcloud-muted">
                        {(queue?.running.length || 0) + job.position}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Queued
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-sm ${isMine ? 'text-qcloud-primary font-semibold' : 'text-qcloud-text'}`}>
                          {isMine ? 'You' : job.student_label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                          {job.backend}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-qcloud-muted">
                        {formatTime(job.submitted_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Auto-refresh notice */}
        <p className="text-center text-xs text-qcloud-muted mt-4">
          Auto-refreshes every 8 seconds
        </p>
      </div>
    </div>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return d.toLocaleDateString()
}

export default HomeworkQueuePage

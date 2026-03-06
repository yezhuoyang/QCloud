import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'
import { hardwareApi, type HardwareSubmission } from '../utils/api'

type StatusFilter = 'all' | 'queued' | 'running' | 'completed' | 'failed'

function JobHistoryPage() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState<HardwareSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const pageSize = 10

  // Load submissions
  useEffect(() => {
    loadSubmissions()
  }, [user, statusFilter, page])

  const loadSubmissions = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await hardwareApi.getHistory({
        user_id: user?.id,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        page_size: pageSize
      })
      setSubmissions(result.submissions)
      setTotalPages(Math.ceil(result.total / pageSize))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job history')
    } finally {
      setLoading(false)
    }
  }

  const refreshJob = async (submissionId: string) => {
    setRefreshingId(submissionId)
    try {
      // Load IBM credentials
      let credentials: { token?: string; channel?: string; instance?: string } = {}
      const storedCreds = localStorage.getItem('qcloud_creds_ibm')
      if (storedCreds) {
        try {
          credentials = JSON.parse(storedCreds)
        } catch {
          // ignore
        }
      }

      await hardwareApi.refreshSubmission(submissionId, credentials)
      await loadSubmissions()
    } catch (err) {
      console.error('Failed to refresh job:', err)
    } finally {
      setRefreshingId(null)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      queued: 'bg-yellow-100 text-yellow-800',
      running: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-qcloud-bg">
      {/* Header */}
      <header className="border-b border-qcloud-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Logo size="small" />
              <span className="font-bold text-xl tracking-tight text-qcloud-text">QuantumArena</span>
            </Link>
            <nav className="flex items-center gap-6">
              <Link to="/editor" className="text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors">
                Editor
              </Link>
              <Link to="/hardware" className="text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors">
                Hardware
              </Link>
              {user && (
                <Link to="/profile" className="text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors">
                  Profile
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-qcloud-text mb-2">Hardware Job History</h1>
            <p className="text-qcloud-muted">
              View your quantum hardware job submissions and their results
            </p>
          </div>
          <button
            onClick={loadSubmissions}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-qcloud-primary text-white rounded-lg hover:bg-qcloud-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <span className="text-sm text-qcloud-muted">Filter by status:</span>
          <div className="flex gap-2">
            {(['all', 'queued', 'running', 'completed', 'failed'] as StatusFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => { setStatusFilter(filter); setPage(1) }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  statusFilter === filter
                    ? 'bg-qcloud-primary text-white'
                    : 'bg-qcloud-bg text-qcloud-text hover:bg-qcloud-primary/10'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Jobs Table */}
        <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden">
          {loading && submissions.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-qcloud-muted mb-4">No hardware jobs found</p>
              <Link
                to="/editor"
                className="inline-flex items-center gap-2 px-4 py-2 bg-qcloud-primary text-white rounded-lg hover:bg-qcloud-primary/90 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Submit a Job
              </Link>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-qcloud-bg border-b border-qcloud-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-qcloud-muted uppercase tracking-wider">
                      Job ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-qcloud-muted uppercase tracking-wider">
                      Backend
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-qcloud-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-qcloud-muted uppercase tracking-wider">
                      Circuit Info
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-qcloud-muted uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-qcloud-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-qcloud-border">
                  {submissions.map((sub) => (
                    <>
                      <tr key={sub.id} className="hover:bg-qcloud-bg/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-mono">
                            {sub.ibmq_job_id ? (
                              <span className="text-qcloud-text" title={sub.ibmq_job_id}>
                                {sub.ibmq_job_id.substring(0, 12)}...
                              </span>
                            ) : (
                              <span className="text-qcloud-muted">Pending</span>
                            )}
                          </div>
                          <div className="text-xs text-qcloud-muted font-mono">
                            ID: {sub.id.substring(0, 8)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-qcloud-text">{sub.backend_name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(sub.status)}`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-qcloud-muted">
                            {sub.qubit_count !== null && <span className="mr-3">{sub.qubit_count}q</span>}
                            {sub.gate_count !== null && <span className="mr-3">{sub.gate_count} gates</span>}
                            {sub.circuit_depth !== null && <span>depth {sub.circuit_depth}</span>}
                          </div>
                          <div className="text-xs text-qcloud-muted">
                            {sub.shots} shots
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-qcloud-text">{formatDate(sub.created_at)}</div>
                          {sub.completed_at && (
                            <div className="text-xs text-qcloud-muted">
                              Completed: {formatDate(sub.completed_at)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                              className="p-1.5 text-qcloud-muted hover:text-qcloud-primary hover:bg-qcloud-bg rounded transition-colors"
                              title="View details"
                            >
                              <svg className={`w-4 h-4 transition-transform ${expandedId === sub.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {['queued', 'running'].includes(sub.status) && (
                              <button
                                onClick={() => refreshJob(sub.id)}
                                disabled={refreshingId === sub.id}
                                className="p-1.5 text-qcloud-muted hover:text-qcloud-primary hover:bg-qcloud-bg rounded transition-colors disabled:opacity-50"
                                title="Refresh status"
                              >
                                {refreshingId === sub.id ? (
                                  <div className="w-4 h-4 border-2 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Details Row */}
                      {expandedId === sub.id && (
                        <tr key={`${sub.id}-expanded`} className="bg-qcloud-bg/30">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid grid-cols-2 gap-6">
                              {/* Circuit Code */}
                              <div>
                                <h4 className="text-sm font-medium text-qcloud-text mb-2">Circuit Code</h4>
                                <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs overflow-x-auto max-h-48 overflow-y-auto">
                                  {sub.circuit_code}
                                </pre>
                              </div>
                              {/* Results */}
                              <div>
                                <h4 className="text-sm font-medium text-qcloud-text mb-2">Results</h4>
                                {sub.status === 'completed' && sub.measurements ? (
                                  <div className="space-y-2">
                                    <div className="bg-white p-3 rounded-lg border border-qcloud-border">
                                      <h5 className="text-xs font-medium text-qcloud-muted mb-2">Measurements</h5>
                                      <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                                        {Object.entries(sub.measurements)
                                          .sort((a, b) => b[1] - a[1])
                                          .map(([state, count]) => (
                                            <div key={state} className="flex items-center justify-between text-xs">
                                              <span className="font-mono text-qcloud-text">{state}</span>
                                              <span className="text-qcloud-muted">{count}</span>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                    {sub.probabilities && (
                                      <div className="bg-white p-3 rounded-lg border border-qcloud-border">
                                        <h5 className="text-xs font-medium text-qcloud-muted mb-2">Probabilities</h5>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                          {Object.entries(sub.probabilities)
                                            .sort((a, b) => b[1] - a[1])
                                            .slice(0, 8)
                                            .map(([state, prob]) => (
                                              <div key={state} className="flex items-center gap-2">
                                                <span className="font-mono text-xs text-qcloud-text w-16">{state}</span>
                                                <div className="flex-1 h-2 bg-qcloud-bg rounded-full overflow-hidden">
                                                  <div
                                                    className="h-full bg-qcloud-primary rounded-full"
                                                    style={{ width: `${prob * 100}%` }}
                                                  />
                                                </div>
                                                <span className="text-xs text-qcloud-muted w-12 text-right">
                                                  {(prob * 100).toFixed(1)}%
                                                </span>
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : sub.status === 'failed' ? (
                                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                    <p className="text-sm text-red-700">
                                      {sub.error_message || 'Job failed'}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                    <p className="text-sm text-yellow-700">
                                      Job is {sub.status}. Results will appear here when complete.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-qcloud-border">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm text-qcloud-text hover:bg-qcloud-bg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-qcloud-muted">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm text-qcloud-text hover:bg-qcloud-bg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default JobHistoryPage

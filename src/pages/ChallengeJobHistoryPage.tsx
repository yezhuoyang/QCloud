import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import CodeEditor from '../components/CodeEditor'
import { challengeApi, type ChallengeSubmissionResult } from '../utils/api'

function ChallengeJobHistoryPage() {
  const { challengeId } = useParams<{ challengeId: string }>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [submissions, setSubmissions] = useState<ChallengeSubmissionResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !challengeId) return
    challengeApi.getSubmissions(token, challengeId)
      .then(r => setSubmissions(r.submissions))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [token, challengeId])

  const handleLoadCode = (code: string) => {
    if (challengeId) {
      localStorage.setItem(`challenge_load_code_${challengeId}`, code)
      window.location.href = `/challenge/${challengeId}`
    }
  }

  return (
    <div className="min-h-screen bg-qcloud-bg">
      <header className="bg-white border-b border-qcloud-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/challenge/${challengeId}`} className="text-qcloud-primary hover:underline text-sm">
            ← Back to Challenge
          </Link>
          <h1 className="text-lg font-bold text-qcloud-text">Job History</h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12 text-qcloud-muted">
            <p className="text-lg">No submissions yet</p>
            <Link to={`/challenge/${challengeId}`} className="text-qcloud-primary hover:underline mt-2 inline-block">
              Go submit your first solution!
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-qcloud-muted border-b bg-qcloud-bg/50">
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Backend</th>
                  <th className="px-4 py-3">Qubits</th>
                  <th className="px-4 py-3">Depth</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => (
                  <React.Fragment key={sub.id}>
                    <tr className="border-b hover:bg-qcloud-bg/30">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          sub.status === 'completed' ? 'bg-green-100 text-green-700' :
                          sub.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-qcloud-primary">
                        {sub.score != null ? (sub.score * 100).toFixed(1) + '%' : '—'}
                      </td>
                      <td className="px-4 py-3">{sub.backend_name}</td>
                      <td className="px-4 py-3">{sub.qubit_count ?? '—'}</td>
                      <td className="px-4 py-3">{sub.circuit_depth ?? '—'}</td>
                      <td className="px-4 py-3 text-qcloud-muted">{new Date(sub.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 space-x-2">
                        <Link
                          to={`/challenge/${challengeId}/results/${sub.id}`}
                          className="text-qcloud-primary hover:underline text-xs"
                        >
                          Details
                        </Link>
                        {sub.code && (
                          <>
                            <button
                              onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                              className="text-purple-600 hover:underline text-xs"
                            >
                              Code
                            </button>
                            <button
                              onClick={() => handleLoadCode(sub.code!)}
                              className="text-green-600 hover:underline text-xs"
                            >
                              Load
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                    {expandedId === sub.id && sub.code && (
                      <tr>
                        <td colSpan={7} className="px-4 py-3 bg-gray-50">
                          <CodeEditor value={sub.code} onChange={() => {}} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChallengeJobHistoryPage

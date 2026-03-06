import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import CodeEditor from '../components/CodeEditor'
import { useAuth } from '../contexts/AuthContext'
import {
  challengeApi,
  type ChallengeLeaderboard,
  type ChallengeLeaderboardEntryType,
  type AdminChallengeSubmission,
} from '../utils/api'

function ChallengeLeaderboardPage() {
  const { challengeId } = useParams<{ challengeId: string }>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const { user } = useAuth()
  const isAdmin = !!user?.is_admin

  const [leaderboard, setLeaderboard] = useState<ChallengeLeaderboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [participantLabel, setParticipantLabel] = useState<string | null>(null)

  // Detail panel
  const [selectedEntry, setSelectedEntry] = useState<AdminChallengeSubmission | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!challengeId) return
    challengeApi.getLeaderboard(challengeId)
      .then(data => setLeaderboard(data))
      .catch(() => {})
      .finally(() => setIsLoading(false))

    if (token) {
      challengeApi.verifyToken(token)
        .then(info => { if (info.participant_label) setParticipantLabel(info.participant_label) })
        .catch(() => {})
    }
  }, [challengeId, token])

  const canClick = isAdmin || !!participantLabel

  const handleEntryClick = async (entry: ChallengeLeaderboardEntryType) => {
    if (!canClick) return
    const isOwn = participantLabel && entry.participant_label === participantLabel
    if (!isAdmin && !isOwn) return

    setDetailLoading(true)
    try {
      const detail = await challengeApi.getAdminSubmission(entry.submission_id)
      setSelectedEntry(detail)
    } catch {
      // Student may not have admin access - just ignore
      setSelectedEntry(null)
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-qcloud-bg">
      <header className="bg-white border-b border-qcloud-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/challenge/${challengeId}`} className="text-qcloud-primary hover:underline text-sm">
            ← Back to Challenge
          </Link>
          <h1 className="text-lg font-bold text-qcloud-text">
            {leaderboard?.challenge_title || 'Leaderboard'}
          </h1>
        </div>
        <div className="text-sm text-qcloud-muted">
          {leaderboard ? `${leaderboard.total_participants} participants` : ''}
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          Rankings are based solely on <strong>score</strong> (higher is better).
          {canClick && (
            <span className="ml-2">
              {isAdmin ? 'As admin, click any row to see details.' : 'Click your own rows to see details.'}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !leaderboard || leaderboard.leaderboard.length === 0 ? (
          <div className="text-center py-12 text-qcloud-muted">
            <p className="text-lg">No submissions yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-qcloud-muted border-b bg-qcloud-bg/50">
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">Participant</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Backend</th>
                  <th className="px-4 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.leaderboard.map(entry => {
                  const isOwn = participantLabel && entry.participant_label === participantLabel
                  const rowClickable = isAdmin || isOwn

                  return (
                    <React.Fragment key={entry.submission_id}>
                      <tr
                        className={`border-b transition-colors ${
                          isOwn ? 'bg-blue-50/50' : ''
                        } ${rowClickable ? 'cursor-pointer hover:bg-qcloud-bg/50' : ''}`}
                        onClick={() => rowClickable && handleEntryClick(entry)}
                      >
                        <td className="px-4 py-3 font-bold">
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{entry.display_name || entry.participant_label}</span>
                            {isOwn && (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">You</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-qcloud-muted">{entry.method_name || '—'}</td>
                        <td className="px-4 py-3 font-bold text-qcloud-primary">
                          {(entry.score * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3">{entry.backend_name || '—'}</td>
                        <td className="px-4 py-3 text-qcloud-muted">
                          {entry.submitted_at ? new Date(entry.submitted_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                      {selectedEntry && selectedEntry.id === entry.submission_id && (
                        <tr>
                          <td colSpan={6} className="px-4 py-4 bg-gray-50 border-b">
                            <DetailPanel entry={selectedEntry} isAdmin={isAdmin} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {detailLoading && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-qcloud-muted mt-2">Loading details...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailPanel({ entry, isAdmin }: { entry: AdminChallengeSubmission; isAdmin: boolean }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-xl font-bold text-qcloud-primary">
            {entry.score != null ? (entry.score * 100).toFixed(1) + '%' : 'N/A'}
          </div>
          <div className="text-xs text-qcloud-muted">Score</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-lg font-bold">{entry.qubit_count ?? '—'}</div>
          <div className="text-xs text-qcloud-muted">Qubits</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-lg font-bold">{entry.gate_count ?? '—'}</div>
          <div className="text-xs text-qcloud-muted">Gates</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-lg font-bold">{entry.circuit_depth ?? '—'}</div>
          <div className="text-xs text-qcloud-muted">Depth</div>
        </div>
      </div>

      {/* Measurements histogram */}
      {entry.measurements && Object.keys(entry.measurements).length > 0 && (
        <div className="bg-white rounded-lg border p-3">
          <h4 className="text-sm font-semibold mb-2">Measurements</h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {Object.entries(entry.measurements)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 20)
              .map(([bs, count]) => {
                const total = Object.values(entry.measurements!).reduce((s, c) => s + c, 0)
                const pct = (count / total) * 100
                return (
                  <div key={bs} className="flex items-center gap-2 text-xs">
                    <code className="w-20 text-right font-mono">{bs}</code>
                    <div className="flex-1 bg-gray-100 rounded h-3">
                      <div className="bg-qcloud-primary h-full rounded" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-16 text-right text-qcloud-muted">{pct.toFixed(1)}%</span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Code */}
      {entry.code && (
        <div className="bg-white rounded-lg border p-3">
          <h4 className="text-sm font-semibold mb-2">
            {isAdmin ? 'Participant Code' : 'Your Code'}
          </h4>
          <CodeEditor value={entry.code} onChange={() => {}} />
        </div>
      )}
    </div>
  )
}

export default ChallengeLeaderboardPage

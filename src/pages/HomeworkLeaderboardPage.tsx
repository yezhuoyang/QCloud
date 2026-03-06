import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import Logo from '../components/Logo'
import CodeEditor from '../components/CodeEditor'
import { useAuth } from '../contexts/AuthContext'
import {
  homeworkApi,
  type HomeworkLeaderboard,
  type HomeworkLeaderboardEntryType,
  type FakeHardwareLeaderboard,
  type FakeHardwareLeaderboardEntry,
  type HomeworkSubmissionResult,
  type FakeHardwareSubmissionDetail,
  type AdminSubmission,
} from '../utils/api'

function HomeworkLeaderboardPage() {
  const { homeworkId } = useParams<{ homeworkId: string }>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const { user } = useAuth()
  const isAdmin = user?.is_admin === true

  const [leaderboard, setLeaderboard] = useState<HomeworkLeaderboard | null>(null)
  const [fakeLeaderboard, setFakeLeaderboard] = useState<FakeHardwareLeaderboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFakeLoading, setIsFakeLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fakeError, setFakeError] = useState<string | null>(null)

  // Student identity for highlighting own entries
  const [studentLabel, setStudentLabel] = useState<string | null>(null)

  // Expandable detail state
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<HomeworkSubmissionResult | AdminSubmission | FakeHardwareSubmissionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!homeworkId) return
    homeworkApi.getLeaderboard(homeworkId).then(setLeaderboard).catch(e => setError(e.message)).finally(() => setIsLoading(false))
    homeworkApi.getFakeLeaderboard(homeworkId).then(setFakeLeaderboard).catch(e => setFakeError(e.message)).finally(() => setIsFakeLoading(false))

    if (token) {
      homeworkApi.verifyToken(token).then(info => {
        if (info.valid && info.student_label) setStudentLabel(info.student_label)
      }).catch(() => {})
    }
  }, [homeworkId, token])

  const isOwn = (entryLabel: string) => studentLabel && entryLabel === studentLabel
  // Anyone can click — admin is tried first, then student token. Backend enforces access control.
  const canClick = isAdmin || !!studentLabel

  async function handleEntryClick(submissionId: string, type: 'hw' | 'fake') {
    if (!canClick) return
    if (expandedId === submissionId) { setExpandedId(null); return }
    setExpandedId(submissionId)
    setDetailData(null)
    setDetailLoading(true)
    try {
      if (type === 'hw') {
        // Try admin endpoint first, fall back to student endpoint
        if (isAdmin) {
          setDetailData(await homeworkApi.getAdminSubmission(submissionId))
        } else {
          setDetailData(await homeworkApi.getStatus(submissionId, token))
        }
      } else {
        if (isAdmin) {
          setDetailData(await homeworkApi.getAdminFakeHardwareSubmission(submissionId))
        } else {
          setDetailData(await homeworkApi.getFakeHardwareSubmission(submissionId, token))
        }
      }
    } catch {
      setDetailData(null)
    } finally {
      setDetailLoading(false)
    }
  }

  // Render the detail panel for an expanded submission
  function DetailPanel({ type }: { type: 'hw' | 'fake' }) {
    if (detailLoading) {
      return (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-xs text-qcloud-muted">Loading details...</span>
        </div>
      )
    }
    if (!detailData) return <div className="text-xs text-red-500 py-3">Failed to load details</div>

    const d = detailData as any
    const code = type === 'hw' ? (d.code_after || d.code) : d.code
    const codeBefore = type === 'hw' && isAdmin ? d.code_before : null

    return (
      <div className="space-y-3 py-3">
        {/* Metrics row */}
        <div className="flex flex-wrap gap-4 text-xs">
          {d.fidelity_after != null && (
            <div><span className="text-qcloud-muted">Fidelity:</span> <span className="font-semibold text-qcloud-primary">{(d.fidelity_after * 100).toFixed(2)}%</span></div>
          )}
          {d.success_probability != null && (
            <div><span className="text-qcloud-muted">Success Prob:</span> <span className="font-semibold text-amber-600">{(d.success_probability * 100).toFixed(1)}%</span></div>
          )}
          {d.post_selected_shots != null && d.shots && (
            <div><span className="text-qcloud-muted">Post-selected:</span> {d.post_selected_shots}/{d.shots}</div>
          )}
          {d.qubit_count != null && <div><span className="text-qcloud-muted">Qubits:</span> {d.qubit_count}</div>}
          {d.gate_count != null && <div><span className="text-qcloud-muted">Gates:</span> {d.gate_count}</div>}
          {d.circuit_depth != null && <div><span className="text-qcloud-muted">Depth:</span> {d.circuit_depth}</div>}
          {d.eval_method && (
            <div><span className="text-qcloud-muted">Eval:</span> {d.eval_method === 'inverse_bell' ? 'Inverse Bell' : d.eval_method === 'tomography' ? 'Tomography' : d.eval_method}</div>
          )}
          {d.backend_name && <div><span className="text-qcloud-muted">Backend:</span> {d.backend_name}</div>}
        </div>

        {/* Initial layout */}
        {d.initial_layout && (
          <div className="text-xs text-qcloud-muted">
            <span className="font-medium">INITIAL_LAYOUT:</span> [{d.initial_layout.join(', ')}]
          </div>
        )}

        {/* Tomography correlators */}
        {d.tomography_correlators && (
          <div className="flex gap-3 text-xs">
            {Object.entries(d.tomography_correlators).map(([key, val]) => (
              <span key={key} className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                {key}: {(val as number).toFixed(3)}
              </span>
            ))}
          </div>
        )}

        {/* Student code */}
        {code && (
          <div>
            <span className="text-xs text-qcloud-muted block mb-1 font-medium">
              {type === 'hw' && isAdmin ? 'Student Circuit Code:' : 'Submitted Code:'}
            </span>
            <div className="h-48 border rounded overflow-hidden">
              <CodeEditor value={code} onChange={() => {}} />
            </div>
          </div>
        )}

        {/* Reference code (admin only) */}
        {codeBefore && (
          <div>
            <span className="text-xs text-qcloud-muted block mb-1 font-medium">Reference Circuit Code (Admin):</span>
            <div className="h-32 border rounded overflow-hidden">
              <CodeEditor value={codeBefore} onChange={() => {}} />
            </div>
          </div>
        )}

        {/* Measurements */}
        {(d.measurements_after || d.measurements) && (
          <div>
            <span className="text-xs text-qcloud-muted block mb-1 font-medium">Measurements (top 10):</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(d.measurements_after || d.measurements || {})
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 10)
                .map(([state, count]) => (
                  <span key={state} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                    |{state}⟩: {count as number}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg">
      {/* Header */}
      <header className="bg-white border-b border-qcloud-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/"><Logo size="small" /></Link>
          <div>
            <h1 className="text-lg font-bold text-qcloud-text">
              {leaderboard?.homework_title || 'Homework'} - Leaderboard
            </h1>
            <p className="text-sm text-qcloud-muted">
              Rankings are based <span className="font-semibold text-qcloud-primary">solely on fidelity (accuracy)</span> of the output Bell pair — circuit size, depth, and gate count do not affect your rank.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/homework/${homeworkId}/hardware-ranking`} className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
            Hardware Ranking
          </Link>
          <Link to={`/homework/${homeworkId}`} className="px-4 py-2 text-sm bg-qcloud-primary/10 text-qcloud-primary rounded-lg hover:bg-qcloud-primary/20 transition-colors">
            Back to Homework
          </Link>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto p-6">
        {/* Hint about clicking */}
        {canClick && (
          <div className="mb-4 text-xs text-qcloud-muted bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            {isAdmin
              ? 'Admin: Click any row to view submitted code and details.'
              : 'Click your own entry (highlighted in blue) to view your submitted code and details.'}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* ===== Hardware Leaderboard (Left Column) ===== */}
          <div>
            <h2 className="text-base font-bold text-green-700 mb-3">Hardware Leaderboard</h2>
            {leaderboard && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl border border-qcloud-border p-3 text-center">
                  <div className="text-xl font-bold text-qcloud-primary">{leaderboard.total_students}</div>
                  <div className="text-xs text-qcloud-muted">Total Students</div>
                </div>
                <div className="bg-white rounded-xl border border-qcloud-border p-3 text-center">
                  <div className="text-xl font-bold text-amber-500">{leaderboard.leaderboard.length}</div>
                  <div className="text-xs text-qcloud-muted">Total Submissions</div>
                </div>
              </div>
            )}
            <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-16 text-red-500">{error}</div>
              ) : leaderboard && leaderboard.leaderboard.length === 0 ? (
                <div className="text-center py-16 text-qcloud-muted">
                  <p className="text-lg mb-2">No submissions yet</p>
                  <p className="text-sm">Be the first to submit!</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-qcloud-border text-left text-xs text-qcloud-muted">
                      <th className="px-3 py-2 w-12">Rank</th>
                      <th className="px-3 py-2">Student</th>
                      <th className="px-3 py-2">Method</th>
                      <th className="px-3 py-2">Backend</th>
                      <th className="px-3 py-2 text-right">Fidelity</th>
                      <th className="px-3 py-2 text-right">Succ. Prob.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard?.leaderboard.map((entry: HomeworkLeaderboardEntryType) => {
                      const own = isOwn(entry.student_label)
                      const rowClickable = isAdmin || own
                      return (
                        <React.Fragment key={entry.submission_id}>
                          <tr
                            onClick={() => rowClickable && handleEntryClick(entry.submission_id, 'hw')}
                            className={`border-b border-qcloud-border transition-colors ${
                              own ? 'bg-blue-50/50' : ''
                            } ${rowClickable ? 'cursor-pointer hover:bg-blue-100/50' : 'hover:bg-qcloud-bg/30'} ${
                              expandedId === entry.submission_id ? 'bg-blue-100/70' : ''
                            }`}
                          >
                            <td className="px-3 py-2">
                              <span className={`font-bold ${
                                entry.rank === 1 ? 'text-yellow-500 text-base' :
                                entry.rank === 2 ? 'text-gray-400 text-base' :
                                entry.rank === 3 ? 'text-orange-400 text-base' :
                                'text-qcloud-muted text-sm'
                              }`}>
                                {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                {entry.display_name ? (
                                  <div>
                                    <span className="text-xs font-medium text-qcloud-text">{entry.display_name}</span>
                                    <span className="text-[10px] text-qcloud-muted ml-1 font-mono">{entry.student_label}</span>
                                  </div>
                                ) : (
                                  <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{entry.student_label}</span>
                                )}
                                {own && <span className="text-[9px] bg-blue-500 text-white px-1 py-0.5 rounded font-medium">You</span>}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-0.5">
                                {entry.method_name && <span className="text-[11px] text-qcloud-text font-medium">{entry.method_name}</span>}
                                {entry.eval_method && entry.eval_method !== 'legacy' ? (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium w-fit ${
                                    entry.eval_method === 'inverse_bell' ? 'bg-teal-50 text-teal-700' :
                                    entry.eval_method === 'tomography' ? 'bg-purple-50 text-purple-700' :
                                    'bg-gray-50 text-gray-500'
                                  }`}>
                                    {entry.eval_method === 'inverse_bell' ? 'InvBell' : entry.eval_method === 'tomography' ? 'Tomo' : entry.eval_method}
                                  </span>
                                ) : !entry.method_name ? <span className="text-xs text-qcloud-muted">—</span> : null}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {entry.backend_name ? (
                                <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">{entry.backend_name}</span>
                              ) : <span className="text-xs text-qcloud-muted">—</span>}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className="font-semibold text-sm text-qcloud-primary">{(entry.fidelity_after * 100).toFixed(1)}%</span>
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-amber-600">
                              {entry.success_probability != null ? `${(entry.success_probability * 100).toFixed(1)}%` : '—'}
                            </td>
                          </tr>
                          {expandedId === entry.submission_id && (
                            <tr><td colSpan={6} className="px-4 bg-gray-50 border-b border-qcloud-border"><DetailPanel type="hw" /></td></tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ===== Fake Hardware Leaderboard (Right Column) ===== */}
          <div>
            <h2 className="text-base font-bold text-orange-600 mb-3">Fake Hardware Leaderboard (4x4 Grid)</h2>
            {fakeLeaderboard && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl border border-qcloud-border p-3 text-center">
                  <div className="text-xl font-bold text-orange-600">{fakeLeaderboard.total_students}</div>
                  <div className="text-xs text-qcloud-muted">Total Students</div>
                </div>
                <div className="bg-white rounded-xl border border-qcloud-border p-3 text-center">
                  <div className="text-xl font-bold text-amber-500">{fakeLeaderboard.entries.length}</div>
                  <div className="text-xs text-qcloud-muted">Best Submissions</div>
                </div>
              </div>
            )}
            <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden">
              {isFakeLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : fakeError ? (
                <div className="text-center py-16 text-red-500">{fakeError}</div>
              ) : fakeLeaderboard && fakeLeaderboard.entries.length === 0 ? (
                <div className="text-center py-16 text-qcloud-muted">
                  <p className="text-lg mb-2">No fake hardware submissions yet</p>
                  <p className="text-sm">Submit to the 4x4 grid fake hardware to appear here!</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-orange-50 border-b border-qcloud-border text-left text-xs text-qcloud-muted">
                      <th className="px-3 py-2 w-12">Rank</th>
                      <th className="px-3 py-2">Student</th>
                      <th className="px-3 py-2">Method</th>
                      <th className="px-3 py-2 text-right">Fidelity</th>
                      <th className="px-3 py-2 text-right">Succ. Prob.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fakeLeaderboard?.entries.map((entry: FakeHardwareLeaderboardEntry) => {
                      const own = isOwn(entry.student_label)
                      const rowClickable = isAdmin || own
                      return (
                        <React.Fragment key={`${entry.student_label}-${entry.rank}`}>
                          <tr
                            onClick={() => rowClickable && handleEntryClick(entry.submission_id, 'fake')}
                            className={`border-b border-qcloud-border transition-colors ${
                              own ? 'bg-blue-50/50' : ''
                            } ${rowClickable ? 'cursor-pointer hover:bg-orange-100/50' : 'hover:bg-orange-50/30'} ${
                              expandedId === entry.submission_id ? 'bg-orange-100/70' : ''
                            }`}
                          >
                            <td className="px-3 py-2">
                              <span className={`font-bold ${
                                entry.rank === 1 ? 'text-yellow-500 text-base' :
                                entry.rank === 2 ? 'text-gray-400 text-base' :
                                entry.rank === 3 ? 'text-orange-400 text-base' :
                                'text-qcloud-muted text-sm'
                              }`}>
                                {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                {entry.display_name ? (
                                  <div>
                                    <span className="text-xs font-medium text-qcloud-text">{entry.display_name}</span>
                                    <span className="text-[10px] text-qcloud-muted ml-1 font-mono">{entry.student_label}</span>
                                  </div>
                                ) : (
                                  <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{entry.student_label}</span>
                                )}
                                {own && <span className="text-[9px] bg-blue-500 text-white px-1 py-0.5 rounded font-medium">You</span>}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-0.5">
                                {entry.method_name && <span className="text-[11px] text-qcloud-text font-medium">{entry.method_name}</span>}
                                {entry.eval_method ? (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium w-fit ${
                                    entry.eval_method === 'inverse_bell' ? 'bg-teal-50 text-teal-700' :
                                    entry.eval_method === 'tomography' ? 'bg-purple-50 text-purple-700' :
                                    'bg-gray-50 text-gray-500'
                                  }`}>
                                    {entry.eval_method === 'inverse_bell' ? 'InvBell' : entry.eval_method === 'tomography' ? 'Tomo' : entry.eval_method}
                                  </span>
                                ) : !entry.method_name ? <span className="text-xs text-qcloud-muted">—</span> : null}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className="font-semibold text-sm text-orange-600">{(entry.fidelity_after * 100).toFixed(1)}%</span>
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-amber-600">
                              {entry.success_probability != null ? `${(entry.success_probability * 100).toFixed(1)}%` : '—'}
                            </td>
                          </tr>
                          {expandedId === entry.submission_id && (
                            <tr><td colSpan={5} className="px-4 bg-orange-50/50 border-b border-qcloud-border"><DetailPanel type="fake" /></td></tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomeworkLeaderboardPage

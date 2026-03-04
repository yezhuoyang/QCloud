import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { homeworkApi, type HomeworkLeaderboard, type HomeworkLeaderboardEntryType } from '../utils/api'

function HomeworkLeaderboardPage() {
  const { homeworkId } = useParams<{ homeworkId: string }>()
  const [leaderboard, setLeaderboard] = useState<HomeworkLeaderboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!homeworkId) return
    async function fetchLeaderboard() {
      try {
        const data = await homeworkApi.getLeaderboard(homeworkId!)
        setLeaderboard(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load leaderboard')
      } finally {
        setIsLoading(false)
      }
    }
    fetchLeaderboard()
  }, [homeworkId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg">
      {/* Header */}
      <header className="bg-white border-b border-qcloud-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Logo size="small" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-qcloud-text">
              {leaderboard?.homework_title || 'Homework'} - Leaderboard
            </h1>
            <p className="text-sm text-qcloud-muted">
              Ranked by final Bell pair fidelity
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/homework/${homeworkId}/hardware-ranking`}
            className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Hardware Ranking
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
        {leaderboard && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-qcloud-border p-4 text-center">
              <div className="text-2xl font-bold text-qcloud-primary">
                {leaderboard.total_students}
              </div>
              <div className="text-sm text-qcloud-muted">Total Students</div>
            </div>
            <div className="bg-white rounded-xl border border-qcloud-border p-4 text-center">
              <div className="text-2xl font-bold text-amber-500">
                {leaderboard.leaderboard.length}
              </div>
              <div className="text-sm text-qcloud-muted">Total Submissions</div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
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
                <tr className="bg-gray-50 border-b border-qcloud-border text-left text-sm text-qcloud-muted">
                  <th className="px-4 py-3 w-16">Rank</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Backend</th>
                  <th className="px-4 py-3 text-right">Fidelity</th>
                  <th className="px-4 py-3 text-right">Success Prob.</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard?.leaderboard.map((entry: HomeworkLeaderboardEntryType) => (
                  <tr
                    key={entry.submission_id}
                    className="border-b border-qcloud-border hover:bg-qcloud-bg/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className={`font-bold ${
                        entry.rank === 1 ? 'text-yellow-500 text-lg' :
                        entry.rank === 2 ? 'text-gray-400 text-lg' :
                        entry.rank === 3 ? 'text-orange-400 text-lg' :
                        'text-qcloud-muted'
                      }`}>
                        {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.display_name ? (
                        <div>
                          <span className="text-sm font-medium text-qcloud-text">{entry.display_name}</span>
                          <span className="text-[10px] text-qcloud-muted ml-1.5 font-mono">{entry.student_label}</span>
                        </div>
                      ) : (
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {entry.student_label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {entry.method_name && (
                          <span className="text-xs text-qcloud-text font-medium">{entry.method_name}</span>
                        )}
                        {entry.eval_method && entry.eval_method !== 'legacy' ? (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium w-fit ${
                            entry.eval_method === 'inverse_bell' ? 'bg-teal-50 text-teal-700' :
                            entry.eval_method === 'tomography' ? 'bg-purple-50 text-purple-700' :
                            'bg-gray-50 text-gray-500'
                          }`}>
                            {entry.eval_method === 'inverse_bell' ? 'InvBell' :
                             entry.eval_method === 'tomography' ? 'Tomo' :
                             entry.eval_method}
                          </span>
                        ) : !entry.method_name ? (
                          <span className="text-xs text-qcloud-muted">—</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {entry.backend_name ? (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                          {entry.backend_name}
                        </span>
                      ) : (
                        <span className="text-xs text-qcloud-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-qcloud-primary">
                        {(entry.fidelity_after * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-amber-600">
                      {entry.success_probability != null
                        ? `${(entry.success_probability * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default HomeworkLeaderboardPage

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { hardwareApi, type HardwareLeaderboardEntry } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'

function HardwareLeaderboardPage() {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState<HardwareLeaderboardEntry[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalJobs, setTotalJobs] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLeaderboard() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await hardwareApi.getLeaderboard(50)
        setLeaderboard(response.leaderboard)
        setTotalUsers(response.total_users)
        setTotalJobs(response.total_jobs)
      } catch (err) {
        console.error('Failed to fetch hardware leaderboard:', err)
        setError('Failed to load leaderboard')
        setLeaderboard([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchLeaderboard()
  }, [])

  // Find current user's rank
  const myEntry = user ? leaderboard.find(e => e.user_id === user.id) : null

  return (
    <div className="min-h-screen bg-qcloud-bg">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-qcloud-border bg-white">
        <div className="flex items-center gap-4">
          <Link to="/hardware" className="flex items-center gap-2 text-qcloud-muted hover:text-qcloud-text">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Hardware</span>
          </Link>
          <div className="w-px h-6 bg-qcloud-border" />
          <Link to="/" className="flex items-center gap-2 hover:opacity-80">
            <Logo size="small" />
            <span className="font-semibold text-lg text-qcloud-text">QuantumArena</span>
          </Link>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            to="/editor"
            className="px-4 py-2 text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors"
          >
            Editor
          </Link>
          <Link
            to="/hardware"
            className="px-4 py-2 text-sm text-qcloud-primary font-medium"
          >
            Hardware
          </Link>
          <Link
            to="/jobs"
            className="px-4 py-2 text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors"
          >
            Job History
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-indigo-600 bg-clip-text text-transparent">
            Hardware Leaderboard
          </h1>
          <p className="text-qcloud-muted mt-3 max-w-xl mx-auto">
            Rankings based on quantum hardware submissions.
            Run circuits on real IBM quantum computers to climb the leaderboard!
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border border-qcloud-border text-center">
            <div className="text-3xl font-bold text-purple-600">{totalUsers}</div>
            <div className="text-sm text-qcloud-muted mt-1">Total Users</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-qcloud-border text-center">
            <div className="text-3xl font-bold text-indigo-600">{totalJobs}</div>
            <div className="text-sm text-qcloud-muted mt-1">Completed Jobs</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-qcloud-border text-center">
            <div className="text-3xl font-bold text-green-600">
              {leaderboard.length > 0 ? leaderboard[0].score : 0}
            </div>
            <div className="text-sm text-qcloud-muted mt-1">Top Score</div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-qcloud-muted">Loading leaderboard...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-red-500">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600"
              >
                Retry
              </button>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <p className="text-qcloud-muted">No hardware submissions yet.</p>
              <p className="text-sm text-qcloud-muted mt-2">Be the first to run a circuit on real quantum hardware!</p>
              <Link
                to="/editor"
                className="inline-block mt-4 px-6 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600"
              >
                Go to Editor
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-qcloud-border">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-qcloud-muted uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-qcloud-muted uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-qcloud-muted uppercase tracking-wider">Jobs</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-qcloud-muted uppercase tracking-wider">Qubits</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-qcloud-muted uppercase tracking-wider">Gates</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-qcloud-muted uppercase tracking-wider">Avg Depth</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-qcloud-muted uppercase tracking-wider">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-qcloud-border">
                {leaderboard.map((entry) => (
                  <tr
                    key={entry.user_id}
                    className={`hover:bg-gray-50 transition-colors ${
                      user && entry.user_id === user.id ? 'bg-purple-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {entry.rank <= 3 ? (
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            entry.rank === 1 ? 'bg-yellow-400' :
                            entry.rank === 2 ? 'bg-gray-400' :
                            'bg-amber-600'
                          }`}>
                            {entry.rank}
                          </span>
                        ) : (
                          <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium">
                            {entry.rank}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {entry.avatar_url ? (
                          <img
                            src={entry.avatar_url}
                            alt={entry.username}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-medium">
                            {entry.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-qcloud-text">
                            {entry.username}
                            {user && entry.user_id === user.id && (
                              <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">You</span>
                            )}
                          </div>
                          {entry.last_submission && (
                            <div className="text-xs text-qcloud-muted">
                              Last: {new Date(entry.last_submission).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                        {entry.completed_jobs}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-qcloud-text">
                      {entry.total_qubits}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-qcloud-text">
                      {entry.total_gates}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-qcloud-text">
                      {entry.avg_circuit_depth.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-lg font-bold text-purple-600">{entry.score}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* User Stats */}
        {user && (
          <div className="mt-8 bg-white rounded-xl p-6 border border-qcloud-border">
            <h3 className="font-semibold text-qcloud-text mb-4">Your Hardware Stats</h3>
            {myEntry ? (
              <div className="grid grid-cols-5 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">#{myEntry.rank}</div>
                  <div className="text-sm text-qcloud-muted">Your Rank</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{myEntry.completed_jobs}</div>
                  <div className="text-sm text-qcloud-muted">Completed Jobs</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{myEntry.total_qubits}</div>
                  <div className="text-sm text-qcloud-muted">Total Qubits</div>
                </div>
                <div className="text-center p-4 bg-indigo-50 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-600">{myEntry.total_gates}</div>
                  <div className="text-sm text-qcloud-muted">Total Gates</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{myEntry.score}</div>
                  <div className="text-sm text-qcloud-muted">Total Score</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-qcloud-muted">You haven't run any circuits on quantum hardware yet.</p>
                <Link
                  to="/editor"
                  className="inline-block mt-4 px-6 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600"
                >
                  Run Your First Circuit
                </Link>
              </div>
            )}
          </div>
        )}

        {!user && (
          <div className="mt-8 bg-white rounded-xl p-6 border border-qcloud-border text-center">
            <p className="text-qcloud-muted mb-4">
              Log in to track your hardware submissions and appear on the leaderboard!
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Log In
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        )}

        {/* Scoring Info */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
          <h3 className="font-semibold text-qcloud-text mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How Scoring Works
          </h3>
          <div className="text-sm text-qcloud-muted space-y-2">
            <p>Your score is calculated based on your hardware submissions:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>Completed Jobs:</strong> +100 points per successful job</li>
              <li><strong>Total Qubits:</strong> +10 points per qubit used across all jobs</li>
              <li><strong>Total Gates:</strong> +1 point per gate in all circuits</li>
            </ul>
            <p className="mt-3">
              <strong>Formula:</strong> Score = (Jobs x 100) + (Qubits x 10) + Gates
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default HardwareLeaderboardPage

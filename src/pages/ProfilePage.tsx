import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usersApi, submissionsApi, type UserProblemProgress, type Submission } from '../utils/api'

function ProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth()
  const navigate = useNavigate()
  const [progress, setProgress] = useState<UserProblemProgress[]>([])
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: '/profile' } })
    }
  }, [authLoading, isAuthenticated, navigate])

  useEffect(() => {
    if (isAuthenticated) {
      Promise.all([
        usersApi.getMyProgress().catch(() => []),
        submissionsApi.getMine({ limit: 5 }).catch(() => ({ submissions: [], total: 0 }))
      ]).then(([progressData, submissionsData]) => {
        setProgress(progressData)
        setRecentSubmissions(submissionsData.submissions)
      }).finally(() => {
        setIsLoadingData(false)
      })
    }
  }, [isAuthenticated])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg">
        <div className="text-qcloud-muted">Loading...</div>
      </div>
    )
  }

  const stats = user.stats || {
    total_score: 0,
    problems_solved: 0,
    total_submissions: 0,
    global_rank: null,
    badges: []
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-qcloud-muted hover:text-qcloud-text mb-8 transition-colors"
        >
          ← Back to Home
        </Link>

        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-qcloud-primary to-qcloud-secondary flex items-center justify-center text-white text-3xl font-bold">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-qcloud-text">{user.username}</h1>
                <p className="text-qcloud-muted">{user.email}</p>
                <p className="text-sm text-qcloud-muted mt-1">
                  Member since {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6 text-center">
            <div className="text-3xl font-bold bg-gradient-to-r from-qcloud-primary to-qcloud-secondary bg-clip-text text-transparent">
              {stats.total_score}
            </div>
            <div className="text-sm text-qcloud-muted mt-1">Total Score</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6 text-center">
            <div className="text-3xl font-bold text-green-600">
              {stats.problems_solved}
            </div>
            <div className="text-sm text-qcloud-muted mt-1">Problems Solved</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">
              {stats.total_submissions}
            </div>
            <div className="text-sm text-qcloud-muted mt-1">Submissions</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6 text-center">
            <div className="text-3xl font-bold text-amber-600">
              {stats.global_rank ? `#${stats.global_rank}` : '-'}
            </div>
            <div className="text-sm text-qcloud-muted mt-1">Global Rank</div>
          </div>
        </div>

        {/* Badges */}
        {stats.badges.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6 mb-6">
            <h2 className="font-semibold text-qcloud-text mb-4">Badges</h2>
            <div className="flex flex-wrap gap-2">
              {stats.badges.map((badge, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 rounded-full text-sm font-medium"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Problem Progress */}
          <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6">
            <h2 className="font-semibold text-qcloud-text mb-4">Problem Progress</h2>
            {isLoadingData ? (
              <div className="text-qcloud-muted text-center py-4">Loading...</div>
            ) : progress.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-qcloud-muted mb-4">No progress yet</p>
                <Link
                  to="/competition"
                  className="text-qcloud-primary hover:text-qcloud-secondary font-medium"
                >
                  Start solving problems →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {progress.slice(0, 5).map((p) => (
                  <Link
                    key={p.problem_id}
                    to={`/competition/problem/${p.problem_id}`}
                    className="flex items-center justify-between p-3 bg-qcloud-bg/50 rounded-lg hover:bg-qcloud-bg transition-colors"
                  >
                    <div>
                      <div className="font-medium text-qcloud-text text-sm">
                        Problem {p.problem_id}
                      </div>
                      <div className="text-xs text-qcloud-muted">
                        {p.submission_count} attempts
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        p.status === 'solved' ? 'text-green-600' :
                        p.status === 'attempted' ? 'text-amber-600' :
                        'text-qcloud-muted'
                      }`}>
                        {p.status === 'solved' ? 'Solved' :
                         p.status === 'attempted' ? 'Attempted' : 'Not Started'}
                      </div>
                      {p.best_score > 0 && (
                        <div className="text-xs text-qcloud-muted">
                          Best: {p.best_score} pts
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Submissions */}
          <div className="bg-white rounded-xl shadow-sm border border-qcloud-border p-6">
            <h2 className="font-semibold text-qcloud-text mb-4">Recent Submissions</h2>
            {isLoadingData ? (
              <div className="text-qcloud-muted text-center py-4">Loading...</div>
            ) : recentSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-qcloud-muted mb-4">No submissions yet</p>
                <Link
                  to="/editor"
                  className="text-qcloud-primary hover:text-qcloud-secondary font-medium"
                >
                  Start coding →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 bg-qcloud-bg/50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-qcloud-text text-sm">
                        Problem {sub.problem_id}
                      </div>
                      <div className="text-xs text-qcloud-muted">
                        {new Date(sub.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        sub.status === 'completed' ? 'text-green-600' :
                        sub.status === 'failed' ? 'text-red-600' :
                        sub.status === 'running' ? 'text-blue-600' :
                        'text-qcloud-muted'
                      }`}>
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </div>
                      {sub.score !== null && (
                        <div className="text-xs text-qcloud-muted">
                          Score: {sub.score}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage

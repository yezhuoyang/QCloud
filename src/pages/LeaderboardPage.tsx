import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Logo from '../components/Logo'
import Leaderboard from '../components/competition/Leaderboard'
import DifficultyBadge from '../components/competition/DifficultyBadge'
import { COMPETITION_PROBLEMS, getProblemById } from '../data/competitionProblems'
import { leaderboardApi, type LeaderboardEntry as ApiLeaderboardEntry } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { LeaderboardEntry } from '../types/competition'

// Convert API leaderboard entry to local type
function convertApiEntry(entry: ApiLeaderboardEntry, type: 'global' | 'problem'): LeaderboardEntry {
  return {
    rank: entry.rank,
    username: entry.username,
    userId: entry.user_id,
    score: type === 'global' ? (entry.total_score || 0) : (entry.score || 0),
    problemsSolved: entry.problems_solved || 0,
    totalSubmissions: entry.total_submissions || 0,
    submittedAt: entry.submitted_at || new Date().toISOString()
  }
}

function LeaderboardPage() {
  const [searchParams] = useSearchParams()
  const problemIdParam = searchParams.get('problem')
  const { user } = useAuth()

  const [selectedProblem, setSelectedProblem] = useState<string | null>(problemIdParam)
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([])
  const [problemLeaderboard, setProblemLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [myRank, setMyRank] = useState<number | null>(null)

  // Fetch global leaderboard from API
  useEffect(() => {
    async function fetchGlobalLeaderboard() {
      setIsLoading(true)
      try {
        const response = await leaderboardApi.getGlobal({ limit: 50 })
        setGlobalLeaderboard(response.leaderboard.map(e => convertApiEntry(e, 'global')))
        if (response.my_rank) {
          setMyRank(response.my_rank)
        }
      } catch (error) {
        console.error('Failed to fetch global leaderboard:', error)
        setGlobalLeaderboard([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchGlobalLeaderboard()
  }, [])

  // Fetch problem leaderboard when a problem is selected
  useEffect(() => {
    if (selectedProblem) {
      async function fetchProblemLeaderboard() {
        setIsLoading(true)
        try {
          const response = await leaderboardApi.getProblem(selectedProblem!, { limit: 50 })
          setProblemLeaderboard(response.leaderboard.map(e => convertApiEntry(e, 'problem')))
        } catch (error) {
          console.error('Failed to fetch problem leaderboard:', error)
          setProblemLeaderboard([])
        } finally {
          setIsLoading(false)
        }
      }
      fetchProblemLeaderboard()
    }
  }, [selectedProblem])

  const selectedProblemData = selectedProblem ? getProblemById(selectedProblem) : null

  // Get user stats from auth context
  const userStats = user?.stats

  return (
    <div className="min-h-screen bg-qcloud-bg">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-qcloud-border bg-white">
        <div className="flex items-center gap-4">
          <Link to="/competition" className="flex items-center gap-2 text-qcloud-muted hover:text-qcloud-text">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Challenges</span>
          </Link>
          <div className="w-px h-6 bg-qcloud-border" />
          <Link to="/" className="flex items-center gap-2 hover:opacity-80">
            <Logo size="small" />
            <span className="font-semibold text-lg text-qcloud-text">QCloud</span>
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
            to="/composer"
            className="px-4 py-2 text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors"
          >
            Circuit Composer
          </Link>
          <Link
            to="/competition"
            className="px-4 py-2 text-sm text-qcloud-primary font-medium"
          >
            Challenges
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.3L10 14.5 5.1 17l.9-5.3-4-3.9 5.5-.8L10 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-qcloud-primary to-qcloud-secondary bg-clip-text text-transparent">
            Leaderboard
          </h1>
          <p className="text-qcloud-muted mt-3 max-w-xl mx-auto">
            See how you rank against other quantum programmers.
            Compete for the highest scores and best solutions!
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 mb-6 p-1 bg-white rounded-xl border border-qcloud-border inline-flex">
          <button
            onClick={() => setSelectedProblem(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !selectedProblem
                ? 'bg-qcloud-primary text-white'
                : 'text-qcloud-muted hover:text-qcloud-text hover:bg-qcloud-bg'
            }`}
          >
            Global Rankings
          </button>
          <div className="w-px h-6 bg-qcloud-border" />
          <span className="px-3 text-sm text-qcloud-muted">By Problem:</span>
          <select
            value={selectedProblem || ''}
            onChange={e => setSelectedProblem(e.target.value || null)}
            className="px-3 py-2 border border-qcloud-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-qcloud-primary bg-white"
          >
            <option value="">Select a problem...</option>
            {COMPETITION_PROBLEMS.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        {/* Selected Problem Info */}
        {selectedProblemData && (
          <div className="bg-white rounded-xl p-4 border border-qcloud-border mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-qcloud-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-qcloud-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-qcloud-text">{selectedProblemData.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <DifficultyBadge difficulty={selectedProblemData.difficulty} size="small" />
                  <span className="text-sm text-qcloud-muted">
                    {selectedProblemData.solveCount} solves / {selectedProblemData.attemptCount} attempts
                  </span>
                </div>
              </div>
            </div>
            <Link
              to={`/competition/problem/${selectedProblemData.id}`}
              className="px-4 py-2 bg-qcloud-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Solve This
            </Link>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-qcloud-muted">Loading leaderboard...</p>
              </div>
            </div>
          ) : selectedProblem ? (
            problemLeaderboard.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-qcloud-muted">No submissions for this problem yet.</p>
                <p className="text-sm text-qcloud-muted mt-2">Be the first to solve it!</p>
              </div>
            ) : (
              <Leaderboard
                entries={problemLeaderboard}
                type="problem"
                showProblemsSolved={false}
              />
            )
          ) : (
            globalLeaderboard.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-qcloud-muted">No users on the leaderboard yet.</p>
                <p className="text-sm text-qcloud-muted mt-2">Start solving challenges to appear here!</p>
              </div>
            ) : (
              <Leaderboard
                entries={globalLeaderboard}
                type="global"
                showProblemsSolved={true}
              />
            )
          )}
        </div>

        {/* User Stats */}
        <div className="mt-8 bg-white rounded-xl p-6 border border-qcloud-border">
          <h3 className="font-semibold text-qcloud-text mb-4">Your Stats</h3>
          {user ? (
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-qcloud-bg rounded-lg">
                <div className="text-2xl font-bold text-qcloud-primary">
                  {myRank || userStats?.global_rank || '-'}
                </div>
                <div className="text-sm text-qcloud-muted">Global Rank</div>
              </div>
              <div className="text-center p-4 bg-qcloud-bg rounded-lg">
                <div className="text-2xl font-bold text-green-500">
                  {userStats?.problems_solved || 0}
                </div>
                <div className="text-sm text-qcloud-muted">Problems Solved</div>
              </div>
              <div className="text-center p-4 bg-qcloud-bg rounded-lg">
                <div className="text-2xl font-bold text-qcloud-secondary">
                  {userStats?.total_score || 0}
                </div>
                <div className="text-sm text-qcloud-muted">Total Score</div>
              </div>
              <div className="text-center p-4 bg-qcloud-bg rounded-lg">
                <div className="text-2xl font-bold text-amber-500">
                  {userStats?.total_submissions || 0}
                </div>
                <div className="text-sm text-qcloud-muted">Submissions</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-qcloud-bg rounded-lg">
                <div className="text-2xl font-bold text-qcloud-primary">-</div>
                <div className="text-sm text-qcloud-muted">Global Rank</div>
              </div>
              <div className="text-center p-4 bg-qcloud-bg rounded-lg">
                <div className="text-2xl font-bold text-green-500">0</div>
                <div className="text-sm text-qcloud-muted">Problems Solved</div>
              </div>
              <div className="text-center p-4 bg-qcloud-bg rounded-lg">
                <div className="text-2xl font-bold text-qcloud-secondary">0</div>
                <div className="text-sm text-qcloud-muted">Total Score</div>
              </div>
              <div className="text-center p-4 bg-qcloud-bg rounded-lg">
                <div className="text-2xl font-bold text-amber-500">0</div>
                <div className="text-sm text-qcloud-muted">Submissions</div>
              </div>
            </div>
          )}

          {!user && (
            <div className="mt-6 text-center">
              <p className="text-qcloud-muted text-sm mb-4">
                Log in to track your progress and appear on the leaderboard!
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-qcloud-primary to-qcloud-secondary text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Log In
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          )}
        </div>

        {/* Badges Section */}
        {user && (
          <div className="mt-8 bg-white rounded-xl p-6 border border-qcloud-border">
            <h3 className="font-semibold text-qcloud-text mb-4">Achievement Badges</h3>
            <div className="grid grid-cols-5 gap-4">
              {[
                { name: 'First Solve', icon: '1', desc: 'Solve your first problem', unlocked: (userStats?.problems_solved || 0) >= 1 },
                { name: 'Grover Master', icon: '🔍', desc: 'Solve all Grover problems', unlocked: false },
                { name: 'Perfect Score', icon: '100', desc: 'Get 100 on any problem', unlocked: false },
                { name: 'Speed Demon', icon: '⚡', desc: 'Solve a problem under 100ms', unlocked: false },
                { name: 'Expert Level', icon: '👑', desc: 'Solve an Expert problem', unlocked: false },
              ].map((badge, i) => (
                <div
                  key={i}
                  className={`text-center p-4 rounded-lg border ${
                    badge.unlocked
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-slate-50 border-slate-200 opacity-50'
                  }`}
                >
                  <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center text-xl ${
                    badge.unlocked
                      ? 'bg-yellow-400 text-white'
                      : 'bg-slate-300 text-slate-500'
                  }`}>
                    {badge.icon}
                  </div>
                  <div className="font-medium text-sm text-qcloud-text">{badge.name}</div>
                  <div className="text-xs text-qcloud-muted mt-1">{badge.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default LeaderboardPage

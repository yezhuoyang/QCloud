import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import AuthHeader from '../components/AuthHeader'
import { COMPETITION_PROBLEMS, COMPETITION_CATEGORIES } from '../data/competitionProblems'
import { leaderboardApi, hardwareApi, type LeaderboardEntry, type HardwareLeaderboardEntry } from '../utils/api'
import DifficultyBadge from '../components/competition/DifficultyBadge'

function LandingPage() {
  const [userLeaderboard, setUserLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true)
  const [hardwareLeaderboard, setHardwareLeaderboard] = useState<HardwareLeaderboardEntry[]>([])
  const [isLoadingHardware, setIsLoadingHardware] = useState(true)

  // Fetch real leaderboard data
  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const response = await leaderboardApi.getGlobal({ limit: 5 })
        setUserLeaderboard(response.leaderboard)
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error)
      } finally {
        setIsLoadingLeaderboard(false)
      }
    }
    fetchLeaderboard()
  }, [])

  // Fetch hardware leaderboard data
  useEffect(() => {
    async function fetchHardwareLeaderboard() {
      try {
        const response = await hardwareApi.getLeaderboard(5)
        setHardwareLeaderboard(response.leaderboard)
      } catch (error) {
        console.error('Failed to fetch hardware leaderboard:', error)
      } finally {
        setIsLoadingHardware(false)
      }
    }
    fetchHardwareLeaderboard()
  }, [])
  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg py-12 px-4 relative">
      {/* Auth Header */}
      <div className="absolute top-4 right-4 z-10">
        <AuthHeader />
      </div>

      {/* Logo Section */}
      <Logo size="large" />

      {/* Title */}
      <h1 className="text-5xl font-bold mt-8 bg-gradient-to-r from-qcloud-primary to-qcloud-secondary bg-clip-text text-transparent">
        QCloud
      </h1>

      {/* Tagline */}
      <p className="text-xl text-qcloud-muted mt-4 text-center max-w-md">
        Quantum Computing in the Cloud
      </p>
      <p className="text-qcloud-muted mt-2">
        Write Qiskit code and run it on real quantum hardware
      </p>

      {/* Connection Diagram */}
      <div className="mt-12 w-full max-w-4xl px-4">
        <svg viewBox="0 0 800 280" className="w-full h-auto">
          {/* Left Side - Programmer with Code */}
          <g>
            {/* Programmer Icon */}
            <circle cx="100" cy="80" r="30" fill="#6366f1" opacity="0.15" />
            <circle cx="100" cy="70" r="15" fill="#6366f1" />
            <path d="M70 120 Q100 140 130 120" stroke="#6366f1" strokeWidth="3" fill="none" />
            <rect x="75" y="90" width="50" height="35" rx="5" fill="#6366f1" />

            {/* Code Block */}
            <rect x="50" y="150" width="100" height="80" rx="8" fill="#ffffff" stroke="#6366f1" strokeWidth="2" />
            <line x1="60" y1="170" x2="110" y2="170" stroke="#8b5cf6" strokeWidth="2" />
            <line x1="60" y1="185" x2="130" y2="185" stroke="#6366f1" strokeWidth="2" />
            <line x1="60" y1="200" x2="100" y2="200" stroke="#8b5cf6" strokeWidth="2" />
            <line x1="60" y1="215" x2="120" y2="215" stroke="#6366f1" strokeWidth="2" />

            <text x="100" y="260" textAnchor="middle" fill="#64748b" fontSize="14" fontWeight="500">Developers</text>
          </g>

          {/* Center - QCloud */}
          <g>
            {/* Cloud shape */}
            <ellipse cx="400" cy="140" rx="100" ry="60" fill="#ffffff" stroke="url(#centerGradient)" strokeWidth="3" />
            <circle cx="340" cy="130" r="35" fill="#ffffff" stroke="url(#centerGradient)" strokeWidth="3" />
            <circle cx="460" cy="130" r="35" fill="#ffffff" stroke="url(#centerGradient)" strokeWidth="3" />
            <circle cx="400" cy="100" r="30" fill="#ffffff" stroke="url(#centerGradient)" strokeWidth="3" />

            {/* Inner fill to cover overlaps */}
            <ellipse cx="400" cy="140" rx="95" ry="55" fill="#ffffff" />
            <circle cx="340" cy="130" r="30" fill="#ffffff" />
            <circle cx="460" cy="130" r="30" fill="#ffffff" />
            <circle cx="400" cy="100" r="25" fill="#ffffff" />

            {/* QCloud Text */}
            <text x="400" y="145" textAnchor="middle" fill="#6366f1" fontSize="24" fontWeight="bold">QCloud</text>
            <text x="400" y="170" textAnchor="middle" fill="#64748b" fontSize="12">Connect & Execute</text>
          </g>

          {/* Right Side - Quantum Computers */}
          <g>
            {/* IBM Quantum */}
            <rect x="620" y="40" width="80" height="60" rx="8" fill="#ffffff" stroke="#0ea5e9" strokeWidth="2" />
            <circle cx="660" cy="65" r="15" fill="none" stroke="#0ea5e9" strokeWidth="2" />
            <circle cx="660" cy="65" r="5" fill="#0ea5e9" />
            <text x="660" y="90" textAnchor="middle" fill="#64748b" fontSize="10">IBM Quantum</text>

            {/* IonQ */}
            <rect x="620" y="110" width="80" height="60" rx="8" fill="#ffffff" stroke="#a855f7" strokeWidth="2" />
            <polygon points="660,125 675,155 645,155" fill="none" stroke="#a855f7" strokeWidth="2" />
            <circle cx="660" cy="145" r="4" fill="#a855f7" />
            <text x="660" y="160" textAnchor="middle" fill="#64748b" fontSize="10">IonQ</text>

            {/* Rigetti */}
            <rect x="620" y="180" width="80" height="60" rx="8" fill="#ffffff" stroke="#f59e0b" strokeWidth="2" />
            <rect x="645" y="195" width="30" height="30" rx="4" fill="none" stroke="#f59e0b" strokeWidth="2" />
            <circle cx="660" cy="210" r="8" fill="#f59e0b" opacity="0.5" />
            <text x="660" y="230" textAnchor="middle" fill="#64748b" fontSize="10">Rigetti</text>

            <text x="660" y="265" textAnchor="middle" fill="#64748b" fontSize="14" fontWeight="500">Quantum Hardware</text>
          </g>

          {/* Connection Arrows */}
          {/* Left to Center */}
          <g>
            <defs>
              <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="centerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#8b5cf6" />
              </marker>
            </defs>
            <line x1="160" y1="140" x2="290" y2="140" stroke="url(#arrowGradient)" strokeWidth="3" markerEnd="url(#arrowhead)" strokeDasharray="8,4" />
            <text x="225" y="125" textAnchor="middle" fill="#6366f1" fontSize="12">Submit</text>
          </g>

          {/* Center to Right */}
          <g>
            <line x1="510" y1="100" x2="610" y2="70" stroke="url(#arrowGradient)" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <line x1="510" y1="140" x2="610" y2="140" stroke="url(#arrowGradient)" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <line x1="510" y1="180" x2="610" y2="210" stroke="url(#arrowGradient)" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <text x="560" y="125" textAnchor="middle" fill="#6366f1" fontSize="12">Execute</text>
          </g>
        </svg>
      </div>

      {/* CTA Buttons */}
      <div className="mt-12 flex flex-col sm:flex-row gap-4">
        <Link
          to="/editor"
          className="px-8 py-4 bg-gradient-to-r from-qcloud-primary to-qcloud-secondary rounded-lg text-white font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-qcloud-primary/25"
        >
          Start Coding
        </Link>
        <Link
          to="/composer"
          className="px-8 py-4 bg-white border-2 border-qcloud-primary rounded-lg text-qcloud-primary font-semibold text-lg hover:bg-qcloud-primary/5 transition-colors shadow-sm"
        >
          Circuit Composer
        </Link>
        <Link
          to="/applications"
          className="px-8 py-4 bg-white border border-qcloud-border rounded-lg text-qcloud-text font-semibold text-lg hover:bg-qcloud-bg transition-colors shadow-sm"
        >
          Browse Examples
        </Link>
        <Link
          to="/hardware"
          className="px-8 py-4 bg-white border border-qcloud-border rounded-lg text-qcloud-text font-semibold text-lg hover:bg-qcloud-bg transition-colors shadow-sm flex items-center gap-2"
        >
          <span>⚛️</span> Hardware
        </Link>
      </div>

      {/* Features */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6 text-center max-w-6xl">
        <div className="p-6 bg-white rounded-xl shadow-sm border border-qcloud-border">
          <div className="text-3xl mb-2">📝</div>
          <h3 className="font-semibold text-qcloud-text">VS Code Editor</h3>
          <p className="text-sm text-qcloud-muted">Full-featured Python editor</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-qcloud-border">
          <div className="text-3xl mb-2">🎨</div>
          <h3 className="font-semibold text-qcloud-text">Circuit Composer</h3>
          <p className="text-sm text-qcloud-muted">Drag-and-drop circuit builder</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-qcloud-border">
          <div className="text-3xl mb-2">🔬</div>
          <h3 className="font-semibold text-qcloud-text">Qiskit Support</h3>
          <p className="text-sm text-qcloud-muted">Write quantum circuits</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-qcloud-border">
          <div className="text-3xl mb-2">⚡</div>
          <h3 className="font-semibold text-qcloud-text">Real Hardware</h3>
          <p className="text-sm text-qcloud-muted">Run on quantum computers</p>
        </div>
      </div>

      {/* Quantum Programming Challenges Section */}
      <div className="mt-20 w-full max-w-6xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-qcloud-primary to-qcloud-secondary bg-clip-text text-transparent">
            Quantum Programming Challenges
          </h2>
          <p className="text-qcloud-muted mt-2">
            Test your skills with real quantum algorithm challenges
          </p>
        </div>

        {/* Challenge Categories */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {COMPETITION_CATEGORIES.map(category => (
            <Link
              key={category.id}
              to={`/competition?category=${category.id}`}
              className="p-4 bg-white rounded-xl border border-qcloud-border hover:border-qcloud-primary/50 hover:shadow-lg transition-all text-center group"
            >
              <div className="text-3xl mb-2">{category.icon}</div>
              <h3 className="font-semibold text-qcloud-text group-hover:text-qcloud-primary text-sm">
                {category.name}
              </h3>
              <p className="text-xs text-qcloud-muted mt-1">{category.problemCount} problems</p>
            </Link>
          ))}
        </div>

        {/* Featured Problems */}
        <div className="bg-white rounded-xl border border-qcloud-border p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-qcloud-text flex items-center gap-2">
              <span className="text-xl">🏆</span>
              Featured Challenges
            </h3>
            <Link
              to="/competition"
              className="text-sm text-qcloud-primary hover:text-qcloud-secondary transition-colors"
            >
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COMPETITION_PROBLEMS.slice(0, 3).map(problem => (
              <Link
                key={problem.id}
                to={`/competition/problem/${problem.id}`}
                className="p-4 bg-qcloud-bg/50 rounded-lg hover:bg-qcloud-bg transition-colors group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-qcloud-text group-hover:text-qcloud-primary text-sm line-clamp-1">
                    {problem.title}
                  </h4>
                  <DifficultyBadge difficulty={problem.difficulty} size="small" />
                </div>
                <div className="flex items-center gap-3 text-xs text-qcloud-muted">
                  <span>{problem.solveCount} solved</span>
                  <span>•</span>
                  <span>{Math.round((problem.solveCount / problem.attemptCount) * 100)}% success</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Start Challenge CTA */}
        <div className="text-center">
          <Link
            to="/competition"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg text-white font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
          >
            <span className="text-xl">🎯</span>
            Start Competing
          </Link>
        </div>
      </div>

      {/* Leaderboards Section */}
      <div className="mt-20 w-full max-w-6xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-qcloud-primary to-qcloud-secondary bg-clip-text text-transparent">
            Leaderboards
          </h2>
          <p className="text-qcloud-muted mt-2">
            Top quantum programmers
          </p>
        </div>

        {/* Two Leaderboards Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Competition Leaderboard */}
          <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden">
            <div className="px-6 py-4 border-b border-qcloud-border bg-gradient-to-r from-qcloud-primary/5 to-qcloud-secondary/5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-qcloud-text flex items-center gap-2">
                  <span className="text-xl">👑</span>
                  Challenge Leaders
                </h3>
                <Link
                  to="/competition/leaderboard"
                  className="text-sm text-qcloud-primary hover:text-qcloud-secondary transition-colors"
                >
                  View All →
                </Link>
              </div>
            </div>
            <div className="p-4">
              {isLoadingLeaderboard ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : userLeaderboard.length === 0 ? (
                <div className="text-center py-8 text-qcloud-muted">
                  <p>No users on the leaderboard yet.</p>
                  <p className="text-sm mt-2">Be the first to solve challenges!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userLeaderboard.map((user, index) => (
                    <div
                      key={user.user_id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-qcloud-bg/50 transition-colors"
                    >
                      <span className={`w-6 text-center font-bold ${
                        index === 0 ? 'text-yellow-500' :
                        index === 1 ? 'text-slate-400' :
                        index === 2 ? 'text-orange-400' :
                        'text-qcloud-muted'
                      }`}>
                        {user.rank}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-qcloud-primary to-qcloud-secondary flex items-center justify-center text-white text-sm font-medium">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full rounded-full" />
                        ) : (
                          user.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-qcloud-text text-sm">{user.username}</div>
                        <div className="text-xs text-qcloud-muted">{user.problems_solved} problems solved</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-qcloud-primary">{user.total_score}</div>
                        <div className="text-xs text-qcloud-muted">points</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hardware Leaderboard */}
          <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden">
            <div className="px-6 py-4 border-b border-qcloud-border bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-qcloud-text flex items-center gap-2">
                  <span className="text-xl">⚛️</span>
                  Hardware Leaders
                </h3>
                <Link
                  to="/hardware/leaderboard"
                  className="text-sm text-purple-600 hover:text-purple-700 transition-colors"
                >
                  View All →
                </Link>
              </div>
            </div>
            <div className="p-4">
              {isLoadingHardware ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : hardwareLeaderboard.length === 0 ? (
                <div className="text-center py-8 text-qcloud-muted">
                  <p>No hardware submissions yet.</p>
                  <p className="text-sm mt-2">Be the first to run on real quantum hardware!</p>
                  <Link
                    to="/hardware"
                    className="inline-block mt-3 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition-colors"
                  >
                    Explore Hardware
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {hardwareLeaderboard.map((user, index) => (
                    <div
                      key={user.user_id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-50/50 transition-colors"
                    >
                      <span className={`w-6 text-center font-bold ${
                        index === 0 ? 'text-yellow-500' :
                        index === 1 ? 'text-slate-400' :
                        index === 2 ? 'text-orange-400' :
                        'text-qcloud-muted'
                      }`}>
                        {user.rank}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full rounded-full" />
                        ) : (
                          user.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-qcloud-text text-sm">{user.username}</div>
                        <div className="text-xs text-qcloud-muted">{user.completed_jobs} jobs completed</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-600">{user.score}</div>
                        <div className="text-xs text-qcloud-muted">points</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer spacing */}
      <div className="h-16" />
    </div>
  )
}

export default LandingPage

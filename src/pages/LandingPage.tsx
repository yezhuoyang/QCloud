import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import AuthHeader from '../components/AuthHeader'
import {
  leaderboardApi, hardwareApi,
  challengeApi,
  type LeaderboardEntry, type HardwareLeaderboardEntry,
  type ChallengePublicInfo,
  type GlobalProgrammerEntry,
  type GlobalHardwareEntry,
} from '../utils/api'

function LandingPage() {
  const [searchQuery, setSearchQuery] = useState('')

  // Existing leaderboards (from competition system)
  const [userLeaderboard, setUserLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true)
  const [hardwareLeaderboard, setHardwareLeaderboard] = useState<HardwareLeaderboardEntry[]>([])
  const [isLoadingHardware, setIsLoadingHardware] = useState(true)

  // Challenge system
  const [challenges, setChallenges] = useState<ChallengePublicInfo[]>([])
  const [isLoadingChallenges, setIsLoadingChallenges] = useState(true)
  const [challengeProgrammers, setChallengeProgrammers] = useState<GlobalProgrammerEntry[]>([])
  const [challengeHardware, setChallengeHardware] = useState<GlobalHardwareEntry[]>([])

  useEffect(() => {
    // Existing leaderboards
    leaderboardApi.getGlobal({ limit: 10 })
      .then(r => setUserLeaderboard(r.leaderboard))
      .catch(() => {})
      .finally(() => setIsLoadingLeaderboard(false))

    hardwareApi.getLeaderboard(10)
      .then(r => setHardwareLeaderboard(r.leaderboard))
      .catch(() => {})
      .finally(() => setIsLoadingHardware(false))

    // Challenge system data
    challengeApi.list({ limit: 20 })
      .then(r => setChallenges(r.challenges))
      .catch(() => {})
      .finally(() => setIsLoadingChallenges(false))

    challengeApi.getGlobalLeaderboard(10)
      .then(r => setChallengeProgrammers(r.leaderboard))
      .catch(() => {})

    challengeApi.getGlobalHardwareRanking(10)
      .then(r => setChallengeHardware(r.leaderboard))
      .catch(() => {})
  }, [])

  // Search with debounce
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q)
    if (q.trim().length >= 2) {
      challengeApi.search(q)
        .then(r => setChallenges(r.challenges))
        .catch(() => {})
    } else if (q.trim().length === 0) {
      challengeApi.list({ limit: 20 })
        .then(r => setChallenges(r.challenges))
        .catch(() => {})
    }
  }, [])

  // Merge programmer leaderboards: existing users + challenge participants
  const hasChallengeData = challengeProgrammers.length > 0 || challengeHardware.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg">
      {/* Header Bar */}
      <header className="bg-white/80 backdrop-blur border-b border-qcloud-border px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Logo size="small" />
          <span className="text-xl font-bold bg-gradient-to-r from-qcloud-primary to-qcloud-secondary bg-clip-text text-transparent">
            QuantumArena
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/homework/distillation" className="text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors">
            CS238B Homework
          </Link>
          <AuthHeader />
        </div>
      </header>

      {/* Hero Section */}
      <section className="text-center pt-16 pb-8 px-4">
        <Logo size="large" />
        <h1 className="text-5xl font-bold mt-6 bg-gradient-to-r from-qcloud-primary to-qcloud-secondary bg-clip-text text-transparent">
          QuantumArena
        </h1>
        <p className="text-lg text-qcloud-muted mt-3 max-w-2xl mx-auto">
          Competition of quantum programmers and quantum hardware in the early fault-tolerant era
        </p>
      </section>

      {/* Search Bar */}
      <section className="max-w-2xl mx-auto px-4 mb-12">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-qcloud-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search challenges by name, category, or keyword..."
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-qcloud-border rounded-2xl text-qcloud-text placeholder-qcloud-muted focus:outline-none focus:border-qcloud-primary shadow-sm text-lg"
          />
        </div>
      </section>

      {/* Two Leaderboards Side by Side */}
      <section className="max-w-6xl mx-auto px-4 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Programmer Leaderboard */}
          <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden">
            <div className="px-6 py-4 border-b border-qcloud-border bg-gradient-to-r from-qcloud-primary/5 to-qcloud-secondary/5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-qcloud-text flex items-center gap-2">
                  <span className="text-xl">👑</span>
                  Programmer Leaderboard
                </h2>
                <Link
                  to="/competition/leaderboard"
                  className="text-sm text-qcloud-primary hover:text-qcloud-secondary transition-colors"
                >
                  View All →
                </Link>
              </div>
            </div>
            <div className="p-4">
              {/* Challenge global programmer leaderboard */}
              {challengeProgrammers.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-qcloud-muted font-medium mb-2 uppercase tracking-wide">Challenge Rankings</div>
                  <div className="space-y-2">
                    {challengeProgrammers.map((entry, index) => (
                      <div key={entry.participant_label} className="flex items-center gap-3 p-2 rounded-lg hover:bg-qcloud-bg/50 transition-colors">
                        <span className={`w-7 text-center font-bold text-sm ${
                          index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-400' : index === 2 ? 'text-orange-400' : 'text-qcloud-muted'
                        }`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : entry.rank}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-qcloud-primary to-qcloud-secondary flex items-center justify-center text-white text-sm font-medium">
                          {(entry.display_name || entry.participant_label).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-qcloud-text text-sm truncate">{entry.display_name || entry.participant_label}</div>
                          <div className="text-xs text-qcloud-muted">{entry.challenges_solved} challenges</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-qcloud-primary">{(entry.total_score * 100).toFixed(0)}%</div>
                          <div className="text-xs text-qcloud-muted">score</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing competition leaderboard */}
              {isLoadingLeaderboard ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : userLeaderboard.length === 0 && challengeProgrammers.length === 0 ? (
                <div className="text-center py-12 text-qcloud-muted">
                  <p className="text-lg mb-1">No competitors yet</p>
                  <p className="text-sm">Be the first to solve a challenge!</p>
                </div>
              ) : userLeaderboard.length > 0 ? (
                <>
                  {hasChallengeData && (
                    <div className="text-xs text-qcloud-muted font-medium mb-2 uppercase tracking-wide">Competition Rankings</div>
                  )}
                  <div className="space-y-2">
                    {userLeaderboard.map((user, index) => (
                      <div key={user.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-qcloud-bg/50 transition-colors">
                        <span className={`w-7 text-center font-bold text-sm ${
                          index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-400' : index === 2 ? 'text-orange-400' : 'text-qcloud-muted'
                        }`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : user.rank}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-qcloud-primary to-qcloud-secondary flex items-center justify-center text-white text-sm font-medium">
                          {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full rounded-full" /> : user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-qcloud-text text-sm truncate">{user.username}</div>
                          <div className="text-xs text-qcloud-muted">{user.problems_solved} solved</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-qcloud-primary">{user.total_score}</div>
                          <div className="text-xs text-qcloud-muted">pts</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* Hardware Leaderboard */}
          <div className="bg-white rounded-xl border border-qcloud-border overflow-hidden">
            <div className="px-6 py-4 border-b border-qcloud-border bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-qcloud-text flex items-center gap-2">
                  <span className="text-xl">⚛️</span>
                  Hardware Leaderboard
                </h2>
                <Link
                  to="/hardware/leaderboard"
                  className="text-sm text-purple-600 hover:text-purple-700 transition-colors"
                >
                  View All →
                </Link>
              </div>
            </div>
            <div className="p-4">
              {/* Challenge hardware rankings */}
              {challengeHardware.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-qcloud-muted font-medium mb-2 uppercase tracking-wide">Challenge Backend Rankings</div>
                  <div className="space-y-2">
                    {challengeHardware.map((entry, index) => (
                      <div key={entry.backend_name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-50/50 transition-colors">
                        <span className={`w-7 text-center font-bold text-sm ${
                          index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-400' : index === 2 ? 'text-orange-400' : 'text-qcloud-muted'
                        }`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : entry.rank}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                          HW
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-qcloud-text text-sm truncate">{entry.backend_name}</div>
                          <div className="text-xs text-qcloud-muted">{entry.total_jobs} jobs</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-purple-600">{(entry.avg_score * 100).toFixed(1)}%</div>
                          <div className="text-xs text-qcloud-muted">avg</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing hardware leaderboard */}
              {isLoadingHardware ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : hardwareLeaderboard.length === 0 && challengeHardware.length === 0 ? (
                <div className="text-center py-12 text-qcloud-muted">
                  <p className="text-lg mb-1">No hardware data yet</p>
                  <p className="text-sm">Submit to real quantum hardware to see rankings!</p>
                </div>
              ) : hardwareLeaderboard.length > 0 ? (
                <>
                  {hasChallengeData && (
                    <div className="text-xs text-qcloud-muted font-medium mb-2 uppercase tracking-wide">User Rankings</div>
                  )}
                  <div className="space-y-2">
                    {hardwareLeaderboard.map((user, index) => (
                      <div key={user.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-50/50 transition-colors">
                        <span className={`w-7 text-center font-bold text-sm ${
                          index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-400' : index === 2 ? 'text-orange-400' : 'text-qcloud-muted'
                        }`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : user.rank}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                          {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full rounded-full" /> : user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-qcloud-text text-sm truncate">{user.username}</div>
                          <div className="text-xs text-qcloud-muted">{user.completed_jobs} jobs</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-purple-600">{user.score}</div>
                          <div className="text-xs text-qcloud-muted">pts</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Challenge Cards */}
      <section className="max-w-6xl mx-auto px-4 mb-16">
        <h2 className="text-2xl font-bold text-qcloud-text mb-6">
          {searchQuery ? `Challenges matching "${searchQuery}"` : 'Active Challenges'}
        </h2>
        {isLoadingChallenges ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : challenges.length === 0 ? (
          <div className="bg-white rounded-xl border border-qcloud-border p-12 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-qcloud-muted text-lg">
              {searchQuery ? 'No challenges match your search' : 'No active challenges yet'}
            </p>
            <p className="text-sm text-qcloud-muted mt-2">
              Check out the <Link to="/homework/distillation" className="text-qcloud-primary hover:underline">CS238B Entanglement Distillation</Link> homework
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map(c => (
              <Link
                key={c.id}
                to={`/challenge/${c.id}`}
                className="bg-white rounded-xl border border-qcloud-border p-5 hover:border-qcloud-primary/50 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    c.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    c.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {c.difficulty}
                  </span>
                  {c.category && (
                    <span className="text-xs text-qcloud-muted">{c.category}</span>
                  )}
                </div>
                <h3 className="font-semibold text-qcloud-text group-hover:text-qcloud-primary mb-1">
                  {c.title}
                </h3>
                {c.description && (
                  <p className="text-sm text-qcloud-muted line-clamp-2 mb-3">
                    {c.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-qcloud-muted">
                  <span>{c.total_participants || 0} participants</span>
                  {c.top_score != null && (
                    <span className="font-medium text-qcloud-primary">
                      Top: {(c.top_score * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
                {c.tags && c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 bg-qcloud-bg rounded text-xs text-qcloud-muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Tools Section */}
      <section className="max-w-6xl mx-auto px-4 mb-16">
        <h3 className="text-lg font-semibold text-qcloud-muted mb-4">Tools & Resources</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/editor" className="p-4 bg-white rounded-xl border border-qcloud-border hover:border-qcloud-primary/50 hover:shadow-md transition-all text-center group">
            <div className="text-2xl mb-1">📝</div>
            <h4 className="font-semibold text-qcloud-text group-hover:text-qcloud-primary text-sm">Code Editor</h4>
            <p className="text-xs text-qcloud-muted">Write Qiskit code</p>
          </Link>
          <Link to="/composer" className="p-4 bg-white rounded-xl border border-qcloud-border hover:border-qcloud-primary/50 hover:shadow-md transition-all text-center group">
            <div className="text-2xl mb-1">🎨</div>
            <h4 className="font-semibold text-qcloud-text group-hover:text-qcloud-primary text-sm">Circuit Composer</h4>
            <p className="text-xs text-qcloud-muted">Drag-and-drop circuits</p>
          </Link>
          <Link to="/applications" className="p-4 bg-white rounded-xl border border-qcloud-border hover:border-qcloud-primary/50 hover:shadow-md transition-all text-center group">
            <div className="text-2xl mb-1">📚</div>
            <h4 className="font-semibold text-qcloud-text group-hover:text-qcloud-primary text-sm">Examples</h4>
            <p className="text-xs text-qcloud-muted">Browse code examples</p>
          </Link>
          <Link to="/hardware" className="p-4 bg-white rounded-xl border border-qcloud-border hover:border-qcloud-primary/50 hover:shadow-md transition-all text-center group">
            <div className="text-2xl mb-1">⚛️</div>
            <h4 className="font-semibold text-qcloud-text group-hover:text-qcloud-primary text-sm">Hardware</h4>
            <p className="text-xs text-qcloud-muted">Explore quantum backends</p>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-qcloud-border py-6 text-center text-sm text-qcloud-muted">
        QuantumArena — Quantum computing competition platform
      </footer>
    </div>
  )
}

export default LandingPage

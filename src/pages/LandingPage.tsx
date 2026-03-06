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
          <Link to="/about" className="text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors">About</Link>
          <Link to="/people" className="text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors">People</Link>
          <Link to="/homework/distillation" className="text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors">
            CS238B Homework
          </Link>
          <AuthHeader />
        </div>
      </header>

      {/* Hero Section */}
      <section className="text-center pt-12 pb-6 px-4">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-qcloud-primary to-qcloud-secondary bg-clip-text text-transparent">
          QuantumArena
        </h1>
        <p className="text-lg text-qcloud-muted mt-3 max-w-2xl mx-auto">
          Competition of quantum programmers and quantum hardware in the early fault-tolerant era
        </p>

        {/* Workflow Diagram */}
        <div className="mt-10 max-w-6xl mx-auto flex items-center justify-center gap-0">

          {/* Left: Quantum Circuit Code */}
          <div className="flex flex-col items-center gap-2 min-w-[120px]">
            <div className="bg-white rounded-xl border-2 border-blue-200 p-3 shadow-lg w-[110px]">
              {/* Mini circuit diagram */}
              <svg viewBox="0 0 100 70" className="w-full">
                {/* Qubit lines */}
                <line x1="5" y1="15" x2="95" y2="15" stroke="#3b82f6" strokeWidth="1.5" />
                <line x1="5" y1="35" x2="95" y2="35" stroke="#3b82f6" strokeWidth="1.5" />
                <line x1="5" y1="55" x2="95" y2="55" stroke="#3b82f6" strokeWidth="1.5" />
                {/* |0⟩ labels */}
                <text x="2" y="18" fontSize="7" fill="#6366f1" fontFamily="monospace">|0⟩</text>
                <text x="2" y="38" fontSize="7" fill="#6366f1" fontFamily="monospace">|0⟩</text>
                <text x="2" y="58" fontSize="7" fill="#6366f1" fontFamily="monospace">|0⟩</text>
                {/* H gate */}
                <rect x="22" y="7" width="14" height="16" rx="2" fill="#6366f1" />
                <text x="25" y="18" fontSize="9" fill="white" fontWeight="bold">H</text>
                {/* CNOT */}
                <circle cx="50" cy="15" r="4" fill="#6366f1" />
                <line x1="50" y1="19" x2="50" y2="35" stroke="#6366f1" strokeWidth="1.5" />
                <circle cx="50" cy="35" r="5" fill="none" stroke="#6366f1" strokeWidth="1.5" />
                <line x1="46" y1="35" x2="54" y2="35" stroke="#6366f1" strokeWidth="1.5" />
                <line x1="50" y1="31" x2="50" y2="39" stroke="#6366f1" strokeWidth="1.5" />
                {/* Rz gate */}
                <rect x="62" y="27" width="14" height="16" rx="2" fill="#8b5cf6" />
                <text x="63" y="38" fontSize="7" fill="white" fontWeight="bold">Rz</text>
                {/* CNOT 2 */}
                <circle cx="82" cy="35" r="4" fill="#6366f1" />
                <line x1="82" y1="39" x2="82" y2="55" stroke="#6366f1" strokeWidth="1.5" />
                <circle cx="82" cy="55" r="5" fill="none" stroke="#6366f1" strokeWidth="1.5" />
                <line x1="78" y1="55" x2="86" y2="55" stroke="#6366f1" strokeWidth="1.5" />
                <line x1="82" y1="51" x2="82" y2="59" stroke="#6366f1" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-qcloud-text">Quantum Circuit</div>
          </div>

          {/* Plus sign */}
          <div className="flex-shrink-0 px-2 text-2xl font-bold text-qcloud-muted">+</div>

          {/* Surface Code QEC */}
          <div className="flex flex-col items-center gap-2 min-w-[120px]">
            <div className="bg-white rounded-xl border-2 border-emerald-200 p-3 shadow-lg w-[110px]">
              {/* Surface code lattice */}
              <svg viewBox="0 0 100 100" className="w-full">
                {/* Z stabilizers (green) */}
                <rect x="5" y="5" width="20" height="20" rx="2" fill="#86efac" opacity="0.7" />
                <rect x="45" y="5" width="20" height="20" rx="2" fill="#86efac" opacity="0.7" />
                <rect x="25" y="25" width="20" height="20" rx="2" fill="#86efac" opacity="0.7" />
                <rect x="65" y="25" width="20" height="20" rx="2" fill="#86efac" opacity="0.7" />
                <rect x="5" y="45" width="20" height="20" rx="2" fill="#86efac" opacity="0.7" />
                <rect x="45" y="45" width="20" height="20" rx="2" fill="#86efac" opacity="0.7" />
                <rect x="25" y="65" width="20" height="20" rx="2" fill="#86efac" opacity="0.7" />
                <rect x="65" y="65" width="20" height="20" rx="2" fill="#86efac" opacity="0.7" />
                {/* X stabilizers (pink) */}
                <rect x="25" y="5" width="20" height="20" rx="2" fill="#fca5a5" opacity="0.7" />
                <rect x="65" y="5" width="20" height="20" rx="2" fill="#fca5a5" opacity="0.7" />
                <rect x="5" y="25" width="20" height="20" rx="2" fill="#fca5a5" opacity="0.7" />
                <rect x="45" y="25" width="20" height="20" rx="2" fill="#fca5a5" opacity="0.7" />
                <rect x="25" y="45" width="20" height="20" rx="2" fill="#fca5a5" opacity="0.7" />
                <rect x="65" y="45" width="20" height="20" rx="2" fill="#fca5a5" opacity="0.7" />
                <rect x="5" y="65" width="20" height="20" rx="2" fill="#fca5a5" opacity="0.7" />
                <rect x="45" y="65" width="20" height="20" rx="2" fill="#fca5a5" opacity="0.7" />
                {/* Data qubits (white circles on vertices) */}
                {[5,25,45,65,85].map(x => [5,25,45,65,85].map(y => (
                  <circle key={`d${x}-${y}`} cx={x} cy={y} r="4" fill="white" stroke="#374151" strokeWidth="1.2" />
                )))}
                {/* Syndrome qubits (dark circles in centers) */}
                {[15,35,55,75].map(x => [15,35,55,75].map(y => (
                  <circle key={`s${x}-${y}`} cx={x} cy={y} r="3" fill="#4b5563" />
                )))}
              </svg>
            </div>
            <div className="text-sm font-semibold text-qcloud-text">QEC Code</div>
          </div>

          {/* Arrow 1 */}
          <div className="flex-shrink-0 px-1 md:px-3">
            <svg className="w-12 md:w-16 h-8 text-qcloud-primary" viewBox="0 0 80 24" fill="none">
              <path d="M0 12h65" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
              <path d="M60 4l12 8-12 8" fill="currentColor" />
            </svg>
          </div>

          {/* Center: Platform */}
          <div className="flex flex-col items-center gap-2 min-w-[100px]">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-qcloud-primary to-qcloud-secondary p-[3px] shadow-xl">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <Logo size="medium" />
              </div>
            </div>
            <div className="text-sm font-bold text-qcloud-primary">QuantumArena</div>
          </div>

          {/* Arrow 2 */}
          <div className="flex-shrink-0 px-1 md:px-3">
            <svg className="w-12 md:w-16 h-8 text-purple-500" viewBox="0 0 80 24" fill="none">
              <path d="M0 12h65" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
              <path d="M60 4l12 8-12 8" fill="currentColor" />
            </svg>
          </div>

          {/* Right: Quantum Hardware */}
          <div className="flex items-center gap-3">
            {/* Cartoon Dilution Refrigerator */}
            <div className="flex flex-col items-center gap-2">
              <div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl p-2 shadow-xl w-[100px]">
                <svg viewBox="0 0 80 110" className="w-full">
                  {/* Top plate */}
                  <ellipse cx="40" cy="8" rx="32" ry="5" fill="#d4a574" stroke="#b8860b" strokeWidth="0.8" />
                  <rect x="8" y="5" width="64" height="6" fill="#c9975c" />
                  <ellipse cx="40" cy="11" rx="32" ry="5" fill="#d4a574" stroke="#b8860b" strokeWidth="0.8" />
                  {/* Wiring between plates */}
                  <path d="M15 11 Q10 22 18 30" stroke="#d4a574" strokeWidth="1" fill="none" />
                  <path d="M25 11 Q18 22 23 30" stroke="#d4a574" strokeWidth="1" fill="none" />
                  <path d="M35 11 Q30 22 33 30" stroke="#c9975c" strokeWidth="1" fill="none" />
                  <path d="M45 11 Q50 22 47 30" stroke="#c9975c" strokeWidth="1" fill="none" />
                  <path d="M55 11 Q62 22 57 30" stroke="#d4a574" strokeWidth="1" fill="none" />
                  <path d="M65 11 Q70 22 62 30" stroke="#d4a574" strokeWidth="1" fill="none" />
                  {/* Second plate */}
                  <ellipse cx="40" cy="30" rx="28" ry="4" fill="#d4a574" stroke="#b8860b" strokeWidth="0.8" />
                  <rect x="12" y="28" width="56" height="5" fill="#c9975c" />
                  <ellipse cx="40" cy="33" rx="28" ry="4" fill="#d4a574" stroke="#b8860b" strokeWidth="0.8" />
                  {/* Wiring 2 */}
                  <path d="M18 33 Q14 42 20 50" stroke="#d4a574" strokeWidth="0.8" fill="none" />
                  <path d="M28 33 Q24 42 27 50" stroke="#c9975c" strokeWidth="0.8" fill="none" />
                  <path d="M40 33 Q40 42 40 50" stroke="#d4a574" strokeWidth="0.8" fill="none" />
                  <path d="M52 33 Q56 42 53 50" stroke="#c9975c" strokeWidth="0.8" fill="none" />
                  <path d="M62 33 Q66 42 60 50" stroke="#d4a574" strokeWidth="0.8" fill="none" />
                  {/* Third plate */}
                  <ellipse cx="40" cy="50" rx="24" ry="4" fill="#d4a574" stroke="#b8860b" strokeWidth="0.8" />
                  <rect x="16" y="48" width="48" height="5" fill="#c9975c" />
                  <ellipse cx="40" cy="53" rx="24" ry="4" fill="#d4a574" stroke="#b8860b" strokeWidth="0.8" />
                  {/* Wiring 3 */}
                  <path d="M22 53 Q20 62 24 68" stroke="#d4a574" strokeWidth="0.8" fill="none" />
                  <path d="M32 53 Q30 62 32 68" stroke="#c9975c" strokeWidth="0.8" fill="none" />
                  <path d="M48 53 Q50 62 48 68" stroke="#c9975c" strokeWidth="0.8" fill="none" />
                  <path d="M58 53 Q60 62 56 68" stroke="#d4a574" strokeWidth="0.8" fill="none" />
                  {/* Bottom plate (coldest) */}
                  <ellipse cx="40" cy="68" rx="20" ry="3.5" fill="#d4a574" stroke="#b8860b" strokeWidth="0.8" />
                  <rect x="20" y="66" width="40" height="5" fill="#c9975c" />
                  <ellipse cx="40" cy="71" rx="20" ry="3.5" fill="#d4a574" stroke="#b8860b" strokeWidth="0.8" />
                  {/* Chip at bottom - glowing */}
                  <path d="M32 71 Q30 80 34 85" stroke="#d4a574" strokeWidth="0.8" fill="none" />
                  <path d="M40 71 Q40 80 40 85" stroke="#c9975c" strokeWidth="0.8" fill="none" />
                  <path d="M48 71 Q50 80 46 85" stroke="#d4a574" strokeWidth="0.8" fill="none" />
                  <rect x="30" y="85" width="20" height="12" rx="2" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1" />
                  {/* Chip glow */}
                  <rect x="33" y="88" width="14" height="6" rx="1" fill="#6366f1" opacity="0.4" />
                  <circle cx="40" cy="91" r="2" fill="#818cf8" opacity="0.8" />
                  {/* Label */}
                  <text x="40" y="106" textAnchor="middle" fontSize="6" fill="#9ca3af" fontWeight="bold">QPU</text>
                </svg>
              </div>
              <div className="text-xs font-semibold text-qcloud-text">Quantum Computer</div>
            </div>

            {/* Qubit Layout / Topology */}
            <div className="flex flex-col items-center gap-2">
              <div className="bg-white rounded-xl border-2 border-indigo-200 p-2 shadow-lg w-[100px]">
                {/* Heavy-hex topology */}
                <svg viewBox="0 0 90 90" className="w-full">
                  {/* Connections (edges) */}
                  {/* Row 1 horizontal */}
                  <line x1="15" y1="10" x2="35" y2="10" stroke="#1e1b4b" strokeWidth="1.2" />
                  <line x1="35" y1="10" x2="55" y2="10" stroke="#1e1b4b" strokeWidth="1.2" />
                  <line x1="55" y1="10" x2="75" y2="10" stroke="#1e1b4b" strokeWidth="1.2" />
                  {/* Vertical from row 1 */}
                  <line x1="15" y1="10" x2="15" y2="30" stroke="#1e1b4b" strokeWidth="1.2" />
                  <line x1="55" y1="10" x2="55" y2="30" stroke="#1e1b4b" strokeWidth="1.2" />
                  {/* Row 2 horizontal */}
                  <line x1="15" y1="30" x2="35" y2="30" stroke="#1e1b4b" strokeWidth="1.2" />
                  <line x1="35" y1="30" x2="55" y2="30" stroke="#1e1b4b" strokeWidth="1.2" />
                  <line x1="55" y1="30" x2="75" y2="30" stroke="#1e1b4b" strokeWidth="1.2" />
                  {/* Vertical from row 2 */}
                  <line x1="35" y1="30" x2="35" y2="50" stroke="#1e1b4b" strokeWidth="1.2" />
                  <line x1="75" y1="30" x2="75" y2="50" stroke="#1e1b4b" strokeWidth="1.2" />
                  {/* Row 3 horizontal */}
                  <line x1="15" y1="50" x2="35" y2="50" stroke="#1e1b4b" strokeWidth="1.2" />
                  <line x1="35" y1="50" x2="55" y2="50" stroke="#1e1b4b" strokeWidth="1.2" />
                  <line x1="55" y1="50" x2="75" y2="50" stroke="#1e1b4b" strokeWidth="1.2" />
                  {/* Vertical from row 3 */}
                  <line x1="15" y1="50" x2="15" y2="70" stroke="#1e1b4b" strokeWidth="1.2" />
                  <line x1="55" y1="50" x2="55" y2="70" stroke="#1e1b4b" strokeWidth="1.2" />
                  {/* Row 4 horizontal */}
                  <line x1="15" y1="70" x2="35" y2="70" stroke="#1e1b4b" strokeWidth="1.2" />
                  <line x1="35" y1="70" x2="55" y2="70" stroke="#1e1b4b" strokeWidth="1.2" />
                  <line x1="55" y1="70" x2="75" y2="70" stroke="#1e1b4b" strokeWidth="1.2" />
                  {/* Vertical from row 4 */}
                  <line x1="35" y1="70" x2="35" y2="85" stroke="#1e1b4b" strokeWidth="1.2" />
                  <line x1="75" y1="70" x2="75" y2="85" stroke="#1e1b4b" strokeWidth="1.2" />
                  {/* Qubits (dark blue dots) */}
                  {[15,35,55,75].map(x => [10,30,50,70].map(y => (
                    <circle key={`q${x}-${y}`} cx={x} cy={y} r="4" fill="#1e1b4b" />
                  )))}
                  {/* A few highlighted qubits (lighter) */}
                  <circle cx="35" cy="10" r="4" fill="#6366f1" />
                  <circle cx="55" cy="50" r="4" fill="#6366f1" />
                  <circle cx="15" cy="70" r="4" fill="#6366f1" />
                  {/* Bottom row partial */}
                  <circle cx="35" cy="85" r="3.5" fill="#1e1b4b" />
                  <circle cx="75" cy="85" r="3.5" fill="#1e1b4b" />
                  {/* Provider labels */}
                  <text x="45" y="8" textAnchor="middle" fontSize="5" fill="#6366f1" fontWeight="bold" opacity="0.6">IBM</text>
                </svg>
              </div>
              <div className="flex flex-wrap justify-center gap-1 max-w-[100px]">
                {['IBM', 'IonQ', 'QuEra', 'Rigetti'].map(name => (
                  <span key={name} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold">{name}</span>
                ))}
              </div>
              <div className="text-xs font-semibold text-qcloud-text">Qubit Topology</div>
            </div>
          </div>
        </div>
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
            placeholder="Search applications by name, category, or keyword..."
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
                  <div className="text-xs text-qcloud-muted font-medium mb-2 uppercase tracking-wide">Application Rankings</div>
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
                          <div className="text-xs text-qcloud-muted">{entry.challenges_solved} applications</div>
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
                  <p className="text-sm">Be the first to submit!</p>
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
                  <div className="text-xs text-qcloud-muted font-medium mb-2 uppercase tracking-wide">Application Backend Rankings</div>
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
          {searchQuery ? `Applications matching "${searchQuery}"` : 'Applications'}
        </h2>
        {isLoadingChallenges ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : challenges.length === 0 ? (
          <div className="bg-white rounded-xl border border-qcloud-border p-12 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-qcloud-muted text-lg">
              {searchQuery ? 'No applications match your search' : 'No applications yet'}
            </p>
            <p className="text-sm text-qcloud-muted mt-2">
              Applications will appear here once created by an admin.
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

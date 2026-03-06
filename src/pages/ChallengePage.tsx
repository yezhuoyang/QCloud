import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import CodeEditor from '../components/CodeEditor'
import {
  challengeApi,
  type ChallengeInfo,
  type ChallengePublicDetail,
  type ChallengeSimulateResult,
} from '../utils/api'

const DEFAULT_STARTER = `# Write your quantum circuit here
# The evaluation criteria depends on the challenge.
# Your circuit will be run on real quantum hardware and scored by a custom evaluator.

qc = QuantumCircuit(2, 2)

# Example: Create a Bell pair
qc.h(0)
qc.cx(0, 1)

# Measure all qubits
qc.measure([0, 1], [0, 1])
`

function ChallengePage() {
  const { challengeId } = useParams<{ challengeId: string }>()
  const navigate = useNavigate()

  // Auth
  const [token, setToken] = useState('')
  const [challengeInfo, setChallengeInfo] = useState<ChallengeInfo | null>(null)
  const [publicInfo, setPublicInfo] = useState<ChallengePublicDetail | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Editor
  const [code, setCode] = useState('')
  const [codeSaved, setCodeSaved] = useState(true)

  // Submission
  const [selectedBackend, setSelectedBackend] = useState('')
  const [shots, setShots] = useState(1024)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Simulator
  const [isSimulating, setIsSimulating] = useState(false)
  const [simResult, setSimResult] = useState<ChallengeSimulateResult | null>(null)

  // Auto-save debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load public info
  useEffect(() => {
    if (!challengeId) return
    challengeApi.getInfo(challengeId)
      .then(info => {
        setPublicInfo(info)
        const starter = info.starter_code || DEFAULT_STARTER
        // Check for draft or loaded code
        const draft = localStorage.getItem(`challenge_draft_code_${challengeId}`)
        const loaded = localStorage.getItem(`challenge_load_code_${challengeId}`)
        if (loaded) {
          localStorage.removeItem(`challenge_load_code_${challengeId}`)
          setCode(loaded)
        } else if (draft) {
          setCode(draft)
        } else {
          setCode(starter)
        }
        if (info.allowed_backends.length > 0) {
          setSelectedBackend(info.allowed_backends[0])
        }
      })
      .catch(() => {})
  }, [challengeId])

  // Auto-save code
  useEffect(() => {
    if (!challengeId || !code) return
    setCodeSaved(false)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      localStorage.setItem(`challenge_draft_code_${challengeId}`, code)
      setCodeSaved(true)
    }, 500)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [code, challengeId])

  // Verify token
  const handleVerify = useCallback(async () => {
    if (!token.trim()) return
    setIsVerifying(true)
    setAuthError(null)
    try {
      const info = await challengeApi.verifyToken(token)
      if (info.valid) {
        setChallengeInfo(info)
        if (info.allowed_backends && info.allowed_backends.length > 0 && !selectedBackend) {
          setSelectedBackend(info.allowed_backends[0])
        }
      } else {
        setAuthError(info.error || 'Invalid token')
      }
    } catch {
      setAuthError('Failed to verify token')
    } finally {
      setIsVerifying(false)
    }
  }, [token, selectedBackend])

  // Submit to hardware
  const handleSubmit = async () => {
    if (!challengeInfo || !token) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const result = await challengeApi.submit({
        token,
        code,
        backend: selectedBackend,
        shots,
      })
      navigate(`/challenge/${challengeId}/results/${result.id}`)
    } catch (err: any) {
      setSubmitError(err?.detail || err?.message || 'Submission failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Simulate
  const handleSimulate = async () => {
    if (!challengeId) return
    setIsSimulating(true)
    setSimResult(null)
    try {
      const result = await challengeApi.simulate({
        challenge_id: challengeId,
        code,
        shots,
      })
      setSimResult(result)
    } catch {
      setSimResult({ success: false, error: 'Simulation failed', backend: 'noisy_simulator' })
    } finally {
      setIsSimulating(false)
    }
  }

  // Reset to starter code
  const handleReset = () => {
    const starter = publicInfo?.starter_code || DEFAULT_STARTER
    setCode(starter)
    if (challengeId) localStorage.removeItem(`challenge_draft_code_${challengeId}`)
  }

  return (
    <div className="min-h-screen bg-qcloud-bg flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-qcloud-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Logo size="small" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-qcloud-text">
              {publicInfo?.title || 'Challenge'}
            </h1>
            {publicInfo?.difficulty && (
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                publicInfo.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                publicInfo.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {publicInfo.difficulty}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {challengeInfo && (
            <>
              <Link
                to={`/challenge/${challengeId}/job-history?token=${encodeURIComponent(token)}`}
                className="text-qcloud-muted hover:text-qcloud-primary"
              >
                Job History
              </Link>
              <Link
                to={`/challenge/${challengeId}/leaderboard?token=${encodeURIComponent(token)}`}
                className="text-qcloud-muted hover:text-qcloud-primary"
              >
                Leaderboard
              </Link>
              <Link
                to={`/challenge/${challengeId}/queue?token=${encodeURIComponent(token)}`}
                className="text-qcloud-muted hover:text-qcloud-primary"
              >
                Queue
              </Link>
            </>
          )}
          <span className="text-xs text-qcloud-muted">
            {codeSaved ? 'Draft saved' : 'Saving...'}
          </span>
          <button onClick={handleReset} className="text-xs text-red-500 hover:underline">
            Reset
          </button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Left: Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          <CodeEditor
            value={code}
            onChange={v => setCode(v || '')}
          />
        </div>

        {/* Right: Controls */}
        <div className="w-80 border-l border-qcloud-border bg-white overflow-y-auto flex flex-col">
          {/* Description */}
          {publicInfo?.description && (
            <div className="p-4 border-b border-qcloud-border">
              <h3 className="font-semibold text-sm text-qcloud-text mb-2">Description</h3>
              <div className="text-xs text-qcloud-muted whitespace-pre-wrap max-h-32 overflow-y-auto">
                {publicInfo.description}
              </div>
            </div>
          )}

          {/* Token Auth */}
          {!challengeInfo ? (
            <div className="p-4 border-b border-qcloud-border">
              <h3 className="font-semibold text-sm text-qcloud-text mb-2">Authenticate</h3>
              <p className="text-xs text-qcloud-muted mb-2">
                Enter your challenge token to submit to hardware.
              </p>
              <input
                type="text"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Paste your token..."
                className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm focus:outline-none focus:border-qcloud-primary"
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
              />
              {authError && <p className="text-xs text-red-500 mt-1">{authError}</p>}
              <button
                onClick={handleVerify}
                disabled={isVerifying || !token.trim()}
                className="mt-2 w-full px-3 py-2 bg-qcloud-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-qcloud-secondary transition-colors"
              >
                {isVerifying ? 'Verifying...' : 'Verify Token'}
              </button>
            </div>
          ) : (
            <>
              {/* Budget */}
              <div className="p-4 border-b border-qcloud-border">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-sm text-qcloud-text">Budget</h3>
                  <span className="text-xs text-qcloud-muted">
                    {challengeInfo.submission_count} submissions
                  </span>
                </div>
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-qcloud-primary h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(0, Math.min(100, ((challengeInfo.budget_used_seconds || 0) / (challengeInfo.budget_total_seconds || 1)) * 100))}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-qcloud-muted mt-1">
                  <span>{Math.round((challengeInfo.budget_remaining_seconds || 0) / 60)} min remaining</span>
                  <span>{Math.round((challengeInfo.budget_total_seconds || 0) / 60)} min total</span>
                </div>
              </div>

              {/* Submit Controls */}
              <div className="p-4 border-b border-qcloud-border space-y-3">
                <h3 className="font-semibold text-sm text-qcloud-text">Submit to Hardware</h3>

                <div>
                  <label className="text-xs text-qcloud-muted block mb-1">Backend</label>
                  <select
                    value={selectedBackend}
                    onChange={e => setSelectedBackend(e.target.value)}
                    className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm"
                  >
                    {(challengeInfo.allowed_backends || []).map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-qcloud-muted block mb-1">Shots</label>
                  <input
                    type="number"
                    value={shots}
                    onChange={e => setShots(Math.max(1, Math.min(8192, parseInt(e.target.value) || 1024)))}
                    className="w-full px-3 py-2 border border-qcloud-border rounded-lg text-sm"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2.5 bg-qcloud-primary text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-qcloud-secondary transition-colors"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit to Hardware'}
                </button>

                {submitError && (
                  <p className="text-xs text-red-500">{submitError}</p>
                )}
              </div>
            </>
          )}

          {/* Simulator */}
          <div className="p-4 border-b border-qcloud-border">
            <h3 className="font-semibold text-sm text-qcloud-text mb-2">Noisy Simulator</h3>
            <p className="text-xs text-qcloud-muted mb-2">Test your code without using budget.</p>
            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-700 transition-colors"
            >
              {isSimulating ? 'Simulating...' : 'Run Simulator'}
            </button>

            {simResult && (
              <div className="mt-3 p-3 rounded-lg border text-xs space-y-1" style={{
                borderColor: simResult.success ? '#22c55e' : '#ef4444',
                backgroundColor: simResult.success ? '#f0fdf4' : '#fef2f2',
              }}>
                {simResult.error ? (
                  <p className="text-red-600">{simResult.error}</p>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-qcloud-muted">Score:</span>
                      <span className="font-bold text-qcloud-primary">
                        {simResult.score != null ? (simResult.score * 100).toFixed(1) + '%' : 'N/A'}
                      </span>
                    </div>
                    {simResult.qubit_count != null && (
                      <div className="flex justify-between">
                        <span className="text-qcloud-muted">Qubits:</span>
                        <span>{simResult.qubit_count}</span>
                      </div>
                    )}
                    {simResult.circuit_depth != null && (
                      <div className="flex justify-between">
                        <span className="text-qcloud-muted">Depth:</span>
                        <span>{simResult.circuit_depth}</span>
                      </div>
                    )}
                    {simResult.execution_time_ms != null && (
                      <div className="flex justify-between">
                        <span className="text-qcloud-muted">Time:</span>
                        <span>{simResult.execution_time_ms.toFixed(0)}ms</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Deadline */}
          {publicInfo?.deadline && (
            <div className="p-4 text-center">
              <p className="text-xs text-qcloud-muted">
                Deadline: {new Date(publicInfo.deadline).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChallengePage

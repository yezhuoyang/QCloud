import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import Logo from '../components/Logo'
import CodeEditor from '../components/CodeEditor'
import GateToolbar from '../components/circuit/GateToolbar'
import CircuitCanvas from '../components/circuit/CircuitCanvas'
import ParameterModal, { QubitSelectionModal, ConditionalGateModal } from '../components/circuit/ParameterModal'
import { Circuit, GateType, PlacedGate, GateCondition, GATE_DEFINITIONS, createEmptyCircuit, generateGateId } from '../types/circuit'
import { compileToQiskit } from '../utils/circuitCompiler'
import {
  homeworkApi,
  type HomeworkInfo,
  type HomeworkSubmissionResult,
  type HomeworkQueueStatus,
} from '../utils/api'

const STARTER_CODE = `# Distilled Bell Pair Circuit
# Implement your distillation protocol here.
# Start with noisy Bell pairs and apply distillation
# (Bennett96 or Deutsch96) to produce higher-fidelity Bell pairs.
#
# The output should be a Bell pair measured on 2 qubits.
# Fidelity = P(|00>) + P(|11>)

qc = QuantumCircuit(2, 2)

# TODO: Implement your distillation protocol
qc.h(0)
qc.cx(0, 1)
qc.measure([0, 1], [0, 1])
`

type EditorMode = 'code' | 'composer'

function HomeworkPage() {
  const { homeworkId } = useParams<{ homeworkId: string }>()

  // Token state
  const [token, setToken] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [homeworkInfo, setHomeworkInfo] = useState<HomeworkInfo | null>(null)

  // Code & editor state
  const [code, setCode] = useState(STARTER_CODE)
  const [editorMode, setEditorMode] = useState<EditorMode>('code')
  const [selectedBackend, setSelectedBackend] = useState('')
  const [shots, setShots] = useState(1024)

  // Circuit composer state
  const [circuit, setCircuit] = useState<Circuit>(createEmptyCircuit(4))
  const [draggingGate, setDraggingGate] = useState<GateType | null>(null)
  const [selectedGates, setSelectedGates] = useState<Set<string>>(new Set())

  // Modal states for composer
  const [paramModal, setParamModal] = useState<{
    isOpen: boolean; gateType: GateType | null; qubitIndex: number; column: number
  }>({ isOpen: false, gateType: null, qubitIndex: 0, column: 0 })
  const [qubitModal, setQubitModal] = useState<{
    isOpen: boolean; gateType: GateType | null; column: number; pendingParams?: number[]
  }>({ isOpen: false, gateType: null, column: 0 })
  const [conditionalModal, setConditionalModal] = useState<{
    isOpen: boolean; qubitIndex: number; column: number
  }>({ isOpen: false, qubitIndex: 0, column: 0 })

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Queue & history state
  const [queueStatus, setQueueStatus] = useState<HomeworkQueueStatus | null>(null)
  const [submissions, setSubmissions] = useState<HomeworkSubmissionResult[]>([])

  // Sidebar collapse state
  const [showRefCircuit, setShowRefCircuit] = useState(false)

  // Load token from localStorage on mount
  useEffect(() => {
    if (homeworkId) {
      const savedToken = localStorage.getItem(`hw_token_${homeworkId}`)
      if (savedToken) {
        setToken(savedToken)
        handleVerifyToken(savedToken)
      }
    }
  }, [homeworkId])

  // Auto-refresh queue every 10 seconds when verified
  useEffect(() => {
    if (!isVerified || !homeworkId || !token) return
    const interval = setInterval(() => {
      refreshQueue()
      refreshSubmissions()
    }, 10000)
    return () => clearInterval(interval)
  }, [isVerified, homeworkId, token])

  // ============ Token / API handlers ============

  const handleVerifyToken = async (tokenValue?: string) => {
    const t = tokenValue || token
    if (!t.trim()) return
    setIsVerifying(true)
    try {
      const info = await homeworkApi.verifyToken(t)
      if (info.valid) {
        setHomeworkInfo(info)
        setIsVerified(true)
        if (info.allowed_backends && info.allowed_backends.length > 0) {
          setSelectedBackend(info.allowed_backends[0])
        }
        if (homeworkId) {
          localStorage.setItem(`hw_token_${homeworkId}`, t)
        }
        refreshQueue(t)
        refreshSubmissions(t)
      } else {
        setHomeworkInfo({ valid: false, error: info.error || 'Invalid token' })
      }
    } catch {
      setHomeworkInfo({ valid: false, error: 'Failed to verify token' })
    } finally {
      setIsVerifying(false)
    }
  }

  const refreshQueue = useCallback(async (t?: string) => {
    if (!homeworkId) return
    try {
      const status = await homeworkApi.getQueueStatus(homeworkId, t || token)
      setQueueStatus(status)
    } catch { /* ignore */ }
  }, [homeworkId, token])

  const refreshSubmissions = useCallback(async (t?: string) => {
    try {
      const result = await homeworkApi.getSubmissions(t || token)
      setSubmissions(result.submissions)
    } catch { /* ignore */ }
  }, [token])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const codeToSubmit = editorMode === 'composer' ? compileToQiskit(circuit) : code
      await homeworkApi.submit({
        token,
        code: codeToSubmit,
        backend: selectedBackend,
        shots,
      })
      refreshQueue()
      refreshSubmissions()
    } catch (err: any) {
      setSubmitError(err.detail || err.message || 'Submission failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = () => {
    if (homeworkId) {
      localStorage.removeItem(`hw_token_${homeworkId}`)
    }
    setIsVerified(false)
    setHomeworkInfo(null)
    setToken('')
    setSubmissions([])
    setQueueStatus(null)
  }

  // ============ Circuit composer handlers ============

  const findNextColumn = useCallback((qubits: number[]): number => {
    let maxColumn = -1
    circuit.gates.forEach(gate => {
      if (gate.qubits.some(q => qubits.includes(q))) {
        maxColumn = Math.max(maxColumn, gate.column)
      }
    })
    return maxColumn + 1
  }, [circuit.gates])

  const addGate = useCallback((
    gateType: GateType, qubits: number[], column: number,
    params?: number[], classicalBit?: number, condition?: GateCondition
  ) => {
    const newGate: PlacedGate = {
      id: generateGateId(), type: gateType, qubits, column,
      params, classicalBit, condition,
    }
    setCircuit(prev => ({ ...prev, gates: [...prev.gates, newGate] }))
  }, [])

  const handleGateDragStart = useCallback((gateType: GateType) => {
    setDraggingGate(gateType)
  }, [])

  const handleDropGate = useCallback((gateType: GateType, qubitIndex: number, column: number) => {
    const gate = GATE_DEFINITIONS[gateType]
    setDraggingGate(null)
    if (gateType === 'IF_ELSE') {
      setConditionalModal({ isOpen: true, qubitIndex, column })
      return
    }
    if (gateType === 'BARRIER') {
      const allQubits = Array.from({ length: circuit.numQubits }, (_, i) => i)
      addGate(gateType, allQubits, column)
      return
    }
    if (gate.numQubits === 1) {
      if (gate.numParams > 0) {
        setParamModal({ isOpen: true, gateType, qubitIndex, column })
      } else {
        const classicalBit = gateType === 'MEASURE' ? qubitIndex : undefined
        addGate(gateType, [qubitIndex], column, undefined, classicalBit)
      }
    } else {
      if (gate.numParams > 0) {
        setParamModal({ isOpen: true, gateType, qubitIndex, column })
      } else {
        setQubitModal({ isOpen: true, gateType, column })
      }
    }
  }, [addGate, circuit.numQubits])

  const handleParamConfirm = useCallback((params: number[]) => {
    const { gateType, qubitIndex, column } = paramModal
    if (!gateType) return
    const gate = GATE_DEFINITIONS[gateType]
    if (gate.numQubits === 1) {
      addGate(gateType, [qubitIndex], column, params)
    } else {
      setQubitModal({ isOpen: true, gateType, column, pendingParams: params })
    }
    setParamModal({ isOpen: false, gateType: null, qubitIndex: 0, column: 0 })
  }, [paramModal, addGate])

  const handleQubitConfirm = useCallback((qubits: number[]) => {
    const { gateType, pendingParams } = qubitModal
    if (!gateType) return
    const actualColumn = findNextColumn(qubits)
    addGate(gateType, qubits, actualColumn, pendingParams)
    setQubitModal({ isOpen: false, gateType: null, column: 0 })
  }, [qubitModal, addGate, findNextColumn])

  const handleRemoveGate = useCallback((gateId: string) => {
    setCircuit(prev => ({ ...prev, gates: prev.gates.filter(g => g.id !== gateId) }))
  }, [])

  const handleMoveGate = useCallback((gateId: string, newQubitIndex: number, newColumn: number) => {
    setCircuit(prev => {
      const gateToMove = prev.gates.find(g => g.id === gateId)
      if (!gateToMove) return prev
      if (gateToMove.qubits.length === 1) {
        return {
          ...prev,
          gates: prev.gates.map(g =>
            g.id === gateId
              ? { ...g, qubits: [newQubitIndex], column: newColumn, classicalBit: g.type === 'MEASURE' ? newQubitIndex : g.classicalBit }
              : g
          ),
        }
      }
      return { ...prev, gates: prev.gates.map(g => g.id === gateId ? { ...g, column: newColumn } : g) }
    })
  }, [])

  const handleConditionalConfirm = useCallback((gateType: GateType, condition: GateCondition) => {
    const { qubitIndex, column } = conditionalModal
    const gate = GATE_DEFINITIONS[gateType]
    if (gate.numParams > 0) {
      addGate(gateType, [qubitIndex], column, [Math.PI / 2], undefined, condition)
    } else {
      addGate(gateType, [qubitIndex], column, undefined, undefined, condition)
    }
    setConditionalModal({ isOpen: false, qubitIndex: 0, column: 0 })
  }, [conditionalModal, addGate])

  const addQubit = () => {
    if (circuit.numQubits >= 10) return
    setCircuit(prev => ({ ...prev, numQubits: prev.numQubits + 1, numClassicalBits: prev.numClassicalBits + 1 }))
  }

  const removeQubit = () => {
    if (circuit.numQubits <= 1) return
    const n = circuit.numQubits - 1
    setCircuit(prev => ({
      ...prev, numQubits: n, numClassicalBits: n,
      gates: prev.gates.filter(g => g.qubits.every(q => q < n)),
    }))
  }

  // ============ Mode switching ============

  const handleSwitchToCode = () => {
    if (editorMode === 'composer') {
      const compiled = compileToQiskit(circuit)
      if (compiled && compiled.trim()) {
        setCode(compiled)
      }
    }
    setEditorMode('code')
  }

  const handleSwitchToComposer = () => {
    setEditorMode('composer')
  }

  // Budget percentage
  const budgetPercent = homeworkInfo
    ? Math.min(100, ((homeworkInfo.budget_used_seconds || 0) / (homeworkInfo.budget_total_seconds || 1)) * 100)
    : 0
  const budgetLow = (homeworkInfo?.budget_remaining_seconds || 0) < 60

  // ============ Token Input Screen ============

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg flex items-center justify-center">
        <div className="max-w-lg w-full mx-4 p-8 bg-white rounded-xl shadow-sm border border-qcloud-border">
          <div className="flex items-center gap-3 mb-6">
            <Link to="/">
              <Logo size="small" />
            </Link>
            <div>
              <h2 className="text-xl font-bold text-qcloud-text">Homework Access</h2>
              <p className="text-sm text-qcloud-muted">Enter the token provided by your TA</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyToken()}
              placeholder="Paste your token here..."
              className="flex-1 px-4 py-2 border border-qcloud-border rounded-lg focus:outline-none focus:ring-2 focus:ring-qcloud-primary/50 font-mono text-sm"
            />
            <button
              onClick={() => handleVerifyToken()}
              disabled={isVerifying || !token.trim()}
              className="px-6 py-2 bg-qcloud-primary text-white rounded-lg hover:bg-qcloud-secondary transition-colors disabled:opacity-50"
            >
              {isVerifying ? 'Verifying...' : 'Verify'}
            </button>
          </div>
          {homeworkInfo && !homeworkInfo.valid && (
            <p className="mt-3 text-sm text-red-500">{homeworkInfo.error}</p>
          )}
        </div>
      </div>
    )
  }

  // ============ Main Editor Layout ============

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-qcloud-border bg-white">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80">
            <Logo size="small" />
          </Link>
          <div className="h-6 w-px bg-qcloud-border" />
          <span className="text-sm font-semibold text-qcloud-text">
            {homeworkInfo?.homework_title || 'Homework'}
          </span>
          <span className="text-xs text-qcloud-muted">
            {homeworkInfo?.course}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Budget mini bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-qcloud-muted">Budget:</span>
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${budgetLow ? 'bg-red-500' : 'bg-qcloud-primary'}`}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${budgetLow ? 'text-red-500' : 'text-qcloud-muted'}`}>
              {Math.round(homeworkInfo?.budget_remaining_seconds || 0)}s
            </span>
          </div>
          {homeworkId && (
            <Link
              to={`/homework/${homeworkId}/leaderboard`}
              className="px-3 py-1 text-xs bg-amber-50 text-amber-700 rounded hover:bg-amber-100 transition-colors"
            >
              Leaderboard
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="px-2 py-1 text-xs text-qcloud-muted hover:text-red-500 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="h-9 flex-shrink-0 bg-slate-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={handleSwitchToCode}
            className={`px-3 py-1.5 rounded-t text-xs flex items-center gap-1.5 transition-colors ${
              editorMode === 'code'
                ? 'bg-slate-900 text-slate-200'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <span className="font-mono text-[10px]">{'</>'}</span> Code Editor
          </button>
          <button
            onClick={handleSwitchToComposer}
            className={`px-3 py-1.5 rounded-t text-xs flex items-center gap-1.5 transition-colors ${
              editorMode === 'composer'
                ? 'bg-slate-900 text-slate-200'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Circuit Composer
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedBackend}
            onChange={(e) => setSelectedBackend(e.target.value)}
            className="px-2 py-1 bg-slate-700 text-slate-200 border border-slate-600 rounded text-xs focus:outline-none"
          >
            {(homeworkInfo?.allowed_backends || []).map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <input
            type="number"
            value={shots}
            onChange={(e) => setShots(Math.max(1, Math.min(8192, parseInt(e.target.value) || 1024)))}
            className="w-16 px-2 py-1 bg-slate-700 text-slate-200 border border-slate-600 rounded text-xs focus:outline-none"
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (homeworkInfo?.budget_remaining_seconds || 0) < 30}
            className="px-4 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-500 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700 flex items-center justify-between">
          <span>{submitError}</span>
          <button onClick={() => setSubmitError(null)} className="text-red-500 hover:text-red-700 ml-2">x</button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 flex-shrink-0 bg-white border-r border-qcloud-border overflow-y-auto">
          {/* Queue Status */}
          <div className="p-3 border-b border-qcloud-border">
            <h4 className="text-xs font-semibold text-qcloud-text mb-2 uppercase tracking-wider">Queue Status</h4>
            {queueStatus ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-qcloud-muted">Running</span>
                  <span className="font-medium text-green-600">{queueStatus.total_running}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-qcloud-muted">Queued</span>
                  <span className="font-medium text-amber-600">{queueStatus.total_queued}</span>
                </div>
                {queueStatus.estimated_wait_minutes > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-qcloud-muted">Est. wait</span>
                    <span className="font-medium">~{queueStatus.estimated_wait_minutes}m</span>
                  </div>
                )}
                {queueStatus.my_submissions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-qcloud-border">
                    <p className="text-[10px] font-semibold text-qcloud-primary mb-1">YOUR JOBS</p>
                    {queueStatus.my_submissions.map((s) => (
                      <div key={s.id} className="flex justify-between text-xs bg-qcloud-primary/5 rounded px-2 py-0.5 mb-0.5">
                        <span className="text-qcloud-primary">{s.status === 'queued' ? `#${s.position}` : 'Running'}</span>
                        <span className={s.status === 'running' ? 'text-green-600' : 'text-amber-600'}>{s.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-qcloud-muted">Loading...</p>
            )}
          </div>

          {/* Submission History */}
          <div className="p-3 border-b border-qcloud-border">
            <h4 className="text-xs font-semibold text-qcloud-text mb-2 uppercase tracking-wider">Submissions</h4>
            {submissions.length === 0 ? (
              <p className="text-xs text-qcloud-muted">No submissions yet.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {submissions.map((sub) => (
                  <Link
                    key={sub.id}
                    to={`/homework/${homeworkId}/results/${sub.id}?token=${encodeURIComponent(token)}`}
                    className="block p-1.5 rounded hover:bg-qcloud-bg/50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        sub.status === 'completed' ? 'bg-green-100 text-green-700' :
                        sub.status === 'running' ? 'bg-blue-100 text-blue-700' :
                        sub.status === 'queued' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {sub.status}
                      </span>
                      <span className="text-[10px] text-qcloud-muted">
                        {new Date(sub.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    {sub.status === 'completed' && sub.fidelity_after != null && (
                      <div className="mt-0.5 flex justify-between text-[10px]">
                        <span className="text-qcloud-muted">
                          F: {(sub.fidelity_after).toFixed(3)}
                        </span>
                        <span className="font-medium text-qcloud-primary">
                          Score: {sub.score}
                        </span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Reference Circuit (collapsible) */}
          {homeworkInfo?.reference_circuit && (
            <div className="p-3 border-b border-qcloud-border">
              <button
                onClick={() => setShowRefCircuit(!showRefCircuit)}
                className="text-xs font-semibold text-qcloud-text uppercase tracking-wider flex items-center gap-1 w-full"
              >
                <svg className={`w-3 h-3 transition-transform ${showRefCircuit ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Reference Circuit
              </button>
              {showRefCircuit && (
                <pre className="mt-2 text-[10px] bg-slate-900 text-slate-300 p-2 rounded max-h-40 overflow-auto font-mono leading-relaxed">
                  {homeworkInfo.reference_circuit}
                </pre>
              )}
            </div>
          )}

          {/* Problem Description */}
          {homeworkInfo?.description && (
            <div className="p-3">
              <h4 className="text-xs font-semibold text-qcloud-text mb-2 uppercase tracking-wider">Description</h4>
              <div className="text-xs text-qcloud-muted whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                {homeworkInfo.description}
              </div>
            </div>
          )}
        </div>

        {/* Right: Editor or Composer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {editorMode === 'code' ? (
            <div className="flex-1">
              <CodeEditor value={code} onChange={(v) => setCode(v || '')} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <GateToolbar onGateDragStart={handleGateDragStart} />
              {/* Circuit controls */}
              <div className="flex-shrink-0 px-4 py-1.5 bg-gray-50 border-b border-qcloud-border flex items-center gap-3 text-xs">
                <span className="text-qcloud-muted">Qubits:</span>
                <button onClick={removeQubit} disabled={circuit.numQubits <= 1}
                  className="w-5 h-5 rounded bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-30 flex items-center justify-center text-xs">-</button>
                <span className="font-medium w-4 text-center">{circuit.numQubits}</span>
                <button onClick={addQubit} disabled={circuit.numQubits >= 10}
                  className="w-5 h-5 rounded bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-30 flex items-center justify-center text-xs">+</button>
                <div className="w-px h-4 bg-qcloud-border mx-1" />
                <span className="text-qcloud-muted">Gates: {circuit.gates.length}</span>
                <button onClick={() => setCircuit(createEmptyCircuit(circuit.numQubits))}
                  className="ml-auto text-red-500 hover:text-red-700 text-xs">Clear</button>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-qcloud-bg">
                <CircuitCanvas
                  circuit={circuit}
                  onDropGate={handleDropGate}
                  onRemoveGate={handleRemoveGate}
                  onMoveGate={handleMoveGate}
                  draggingGate={draggingGate}
                  selectedGates={selectedGates}
                  onSelectGate={(id) => setSelectedGates(prev => {
                    const next = new Set(prev)
                    if (next.has(id)) next.delete(id)
                    else next.add(id)
                    return next
                  })}
                  highlightedMatches={[]}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <footer className="h-6 flex-shrink-0 bg-qcloud-primary px-4 text-[10px] flex items-center justify-between text-white/80">
        <span>Python - Qiskit</span>
        <div className="flex items-center gap-4">
          <span>{editorMode === 'code' ? 'Code Editor' : 'Circuit Composer'}</span>
          <span>{selectedBackend}</span>
          <span>UTF-8</span>
        </div>
      </footer>

      {/* Modals for circuit composer */}
      {paramModal.isOpen && paramModal.gateType && (
        <ParameterModal
          isOpen={paramModal.isOpen}
          gateType={paramModal.gateType}
          onConfirm={handleParamConfirm}
          onCancel={() => setParamModal({ isOpen: false, gateType: null, qubitIndex: 0, column: 0 })}
        />
      )}
      {qubitModal.isOpen && qubitModal.gateType && (
        <QubitSelectionModal
          isOpen={qubitModal.isOpen}
          gateType={qubitModal.gateType}
          numQubits={circuit.numQubits}
          onConfirm={handleQubitConfirm}
          onCancel={() => setQubitModal({ isOpen: false, gateType: null, column: 0 })}
        />
      )}
      {conditionalModal.isOpen && (
        <ConditionalGateModal
          isOpen={conditionalModal.isOpen}
          numQubits={circuit.numQubits}
          numClassicalBits={circuit.numClassicalBits}
          onConfirm={handleConditionalConfirm}
          onCancel={() => setConditionalModal({ isOpen: false, qubitIndex: 0, column: 0 })}
        />
      )}
    </div>
  )
}

export default HomeworkPage

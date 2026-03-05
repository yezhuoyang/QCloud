import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'
import HomeworkAdminPanel from '../components/HomeworkAdminPanel'
import CodeEditor from '../components/CodeEditor'
import GateToolbar from '../components/circuit/GateToolbar'
import CircuitCanvas from '../components/circuit/CircuitCanvas'
import ParameterModal, { QubitSelectionModal, ConditionalGateModal } from '../components/circuit/ParameterModal'
import { Circuit, GateType, PlacedGate, GateCondition, GATE_DEFINITIONS, createEmptyCircuit, generateGateId } from '../types/circuit'
import { compileToQiskit, decompileToCircuit } from '../utils/circuitCompiler'
import { validateCircuitCode, extractMeasurementsFromCode, extractMeasurementsFromCircuit, validatePostSelectLength } from '../utils/codeValidator'
import {
  homeworkApi,
  type HomeworkInfo,
  type HomeworkPublicInfo,
  type HomeworkSubmissionResult,
  type HomeworkQueueStatus,
  type HomeworkSimulateResult,
  type CheckTranspileResult,
  type FakeHardwareSubmitResult,
} from '../utils/api'
import { findProviderByBackend, HARDWARE_PROVIDERS } from '../data/hardwareProviders'
import { getCalibrationData } from '../data/hardwareCalibrationData'
import HardwareTopology from '../components/HardwareTopology'

const STARTER_CODE = `# BBPSSW Entanglement Distillation Protocol
#
# RULES:
#   - Output Bell pair is ALWAYS on qubits 0 and 1.
#   - Ancilla qubits: 2, 3, ... (used for distillation).
#   - You MUST measure ALL qubits.
#   - Fidelity is measured via Inverse Bell or Tomography (choose above).
#
# POST-SELECTION:
#   POST_SELECT = set of bitstrings to filter ancilla measurements.
#   Only shots where the ancilla bits match a string in POST_SELECT are kept.
#   If POST_SELECT is not defined, all shots are kept (no filtering).
#
#   STRING LENGTH:
#     Must equal the number of ancilla measurements (all measurements
#     except q0 and q1, which are measured by the fidelity test).
#
#   BIT ORDERING (Qiskit convention):
#     Follows Qiskit's bit ordering: highest classical bit index FIRST (leftmost).
#     POST_SELECT string = c[n-1] c[n-2] ... c[2]  (left-to-right)
#     Example below: ancilla q2->c2, q3->c3
#       POST_SELECT positions: [c3, c2]
#       {"00"} = c3=0, c2=0   |   {"01"} = c3=0, c2=1
#       {"10"} = c3=1, c2=0   |   {"11"} = c3=1, c2=1
#
# QUBIT LAYOUT (optional):
#   INITIAL_LAYOUT = [physical_qubit_for_q0, physical_qubit_for_q1, ...]
#   Maps your logical qubits to specific physical qubits on the hardware.
#   Check the hardware topology (click info button) to pick low-error qubits.
#   If not defined, the transpiler chooses automatically (optimization_level=3).
#   Example: INITIAL_LAYOUT = [0, 1, 2, 3]
#
# BBPSSW Protocol:
#   1. Prepare two Bell pairs: (q0,q1) and (q2,q3)
#   2. Bilateral CNOT from pair 1 to pair 2
#   3. Measure all qubits
#   4. Post-select on ancilla = "00" (c3=0, c2=0)

qc = QuantumCircuit(4, 4)

# Bell pair 1 (output): q0, q1
qc.h(0)
qc.cx(0, 1)

# Bell pair 2 (ancilla): q2, q3
qc.h(2)
qc.cx(2, 3)

# BBPSSW bilateral CNOT
qc.cx(0, 2)
qc.cx(1, 3)

# Measure ALL qubits (q0->c0, q1->c1, q2->c2, q3->c3)
qc.measure([0, 1, 2, 3], [0, 1, 2, 3])

# Post-selection (Qiskit bit order: c3 c2, highest bit first)
# "00" means c3=0, c2=0 (both ancillas measured 0)
POST_SELECT = {"00"}
`

type EditorMode = 'code' | 'composer'

function HomeworkPage() {
  const { homeworkId } = useParams<{ homeworkId: string }>()
  const { user } = useAuth()
  const isAdmin = user?.is_admin === true
  const [showAdmin, setShowAdmin] = useState(false)

  // Public homework info (loaded without token)
  const [publicInfo, setPublicInfo] = useState<HomeworkPublicInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Token state
  const [token, setToken] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [homeworkInfo, setHomeworkInfo] = useState<HomeworkInfo | null>(null)

  // Code & editor state
  const [code, setCode] = useState(STARTER_CODE)
  const [editorMode, setEditorMode] = useState<EditorMode>('code')
  const [selectedBackend, setSelectedBackend] = useState('')
  const [shots, setShots] = useState(1024)
  const [evalMethod, setEvalMethod] = useState<'inverse_bell' | 'tomography'>('inverse_bell')
  const [postSelect, setPostSelect] = useState('{"00"}')
  const [initialLayout, setInitialLayout] = useState('')
  const [parseWarning, setParseWarning] = useState<string | null>(null)

  // Optional student-provided IBM API key and instance (stored in localStorage only)
  const [customApiKey, setCustomApiKey] = useState(() =>
    localStorage.getItem(`hw_custom_apikey_${homeworkId}`) || ''
  )
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
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitKeyChoice, setSubmitKeyChoice] = useState<'platform' | 'own'>('platform')

  // Simulator state
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulatorResult, setSimulatorResult] = useState<HomeworkSimulateResult | null>(null)
  const [simulateError, setSimulateError] = useState<string | null>(null)
  const [simulateMode, setSimulateMode] = useState<'distillation' | 'bell_pair'>('distillation')
  const [singleQubitError, setSingleQubitError] = useState(0.01)
  const [twoQubitError, setTwoQubitError] = useState(0.02)

  // Fake hardware state
  const [isSubmittingFakeHw, setIsSubmittingFakeHw] = useState(false)
  const [fakeHwResult, setFakeHwResult] = useState<FakeHardwareSubmitResult | null>(null)
  const [fakeHwError, setFakeHwError] = useState<string | null>(null)

  // Queue & history state
  const [queueStatus, setQueueStatus] = useState<HomeworkQueueStatus | null>(null)
  const [submissions, setSubmissions] = useState<HomeworkSubmissionResult[]>([])

  // Sidebar collapse state
  const [showRefCircuit, setShowRefCircuit] = useState(false)

  // Sidebar resize state
  const [sidebarWidth, setSidebarWidth] = useState(288)
  const isResizing = useRef(false)

  // Student profile (display name on leaderboard)
  const [displayName, setDisplayName] = useState('')
  const [methodName, setMethodName] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  // Hardware info modal
  const [showHardwareInfo, setShowHardwareInfo] = useState(false)
  // Preview compiled circuit modal
  const [showPreviewCircuit, setShowPreviewCircuit] = useState(false)
  // Check transpiled code modal
  const [showTranspileCheck, setShowTranspileCheck] = useState(false)
  const [transpileResult, setTranspileResult] = useState<CheckTranspileResult | null>(null)
  const [isCheckingTranspile, setIsCheckingTranspile] = useState(false)

  // ============ Load public info on mount ============

  useEffect(() => {
    if (!homeworkId) return

    // Load public homework info (no token needed)
    homeworkApi.getInfo(homeworkId)
      .then(info => {
        setPublicInfo(info)
        if (HARDWARE_PROVIDERS.length > 0) {
          setSelectedBackend(HARDWARE_PROVIDERS[0].backendName)
        }
      })
      .catch(() => setLoadError('Homework not found'))

    // Try to restore token from localStorage
    const savedToken = localStorage.getItem(`hw_token_${homeworkId}`)
    if (savedToken) {
      setToken(savedToken)
      handleVerifyToken(savedToken)
    }

    // Fetch queue status (public)
    refreshQueue()
  }, [homeworkId])

  // Auto-refresh queue and submissions every 10 seconds
  useEffect(() => {
    if (!homeworkId) return
    const interval = setInterval(() => {
      refreshQueue()
      if (homeworkInfo?.valid && token) {
        refreshSubmissions()
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [homeworkId, homeworkInfo?.valid, token])

  // ============ Token / API handlers ============

  const handleVerifyToken = async (tokenValue?: string) => {
    const t = tokenValue || token
    if (!t.trim()) return
    setIsVerifying(true)
    try {
      const info = await homeworkApi.verifyToken(t)
      if (info.valid) {
        setHomeworkInfo(info)
        setDisplayName(info.display_name || '')
        setMethodName(info.method_name || '')
        if (homeworkId) {
          localStorage.setItem(`hw_token_${homeworkId}`, t)
        }
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
      const status = await homeworkApi.getQueueStatus(homeworkId, t || token || undefined)
      setQueueStatus(status)
    } catch { /* ignore */ }
  }, [homeworkId, token])

  const refreshSubmissions = useCallback(async (t?: string) => {
    const tokenToUse = t || token
    if (!tokenToUse) return
    try {
      const result = await homeworkApi.getSubmissions(tokenToUse)
      setSubmissions(result.submissions)
    } catch { /* ignore */ }
  }, [token])

  const openSubmitModal = () => {
    // Pre-select based on whether student has a custom key
    setSubmitKeyChoice(customApiKey.trim() ? 'own' : 'platform')
    setShowSubmitModal(true)
  }

  const handleSubmitConfirm = async () => {
    setShowSubmitModal(false)
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const codeToSubmit = editorMode === 'composer' ? compileToQiskit(circuit, postSelect, initialLayout || undefined) : code
      const validation = validateCircuitCode(codeToSubmit)
      if (!validation.valid) {
        setSubmitError('Code validation failed:\n' + validation.errors.join('\n'))
        setIsSubmitting(false)
        return
      }
      const useOwnKey = submitKeyChoice === 'own' && customApiKey.trim()
      await homeworkApi.submit({
        token,
        code: codeToSubmit,
        backend: selectedBackend,
        shots,
        eval_method: evalMethod,
        ibmq_api_key: useOwnKey ? customApiKey.trim() : undefined,
      })
      refreshQueue()
      refreshSubmissions()
    } catch (err: any) {
      setSubmitError(err.detail || err.message || 'Submission failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSimulate = async (mode: 'distillation' | 'bell_pair' = 'distillation') => {
    if (!homeworkId) return
    setIsSimulating(true)
    setSimulateError(null)
    setSimulatorResult(null)
    setSimulateMode(mode)
    try {
      const codeToRun = editorMode === 'composer' ? compileToQiskit(circuit, postSelect, initialLayout || undefined) : code
      const validation = validateCircuitCode(codeToRun)
      if (!validation.valid) {
        setSimulateError('Code validation failed:\n' + validation.errors.join('\n'))
        setIsSimulating(false)
        return
      }
      const result = await homeworkApi.simulate({
        homework_id: homeworkId,
        code: codeToRun,
        shots,
        mode,
        eval_method: evalMethod,
        single_qubit_error: singleQubitError,
        two_qubit_error: twoQubitError,
      })
      setSimulatorResult(result)
    } catch (err: any) {
      setSimulateError(err.detail || err.message || 'Simulation failed')
    } finally {
      setIsSimulating(false)
    }
  }

  const handleSubmitFakeHardware = async () => {
    if (!homeworkId || !token) return
    setIsSubmittingFakeHw(true)
    setFakeHwError(null)
    setFakeHwResult(null)
    try {
      const codeToRun = editorMode === 'composer' ? compileToQiskit(circuit, postSelect, initialLayout || undefined) : code
      const validation = validateCircuitCode(codeToRun)
      if (!validation.valid) {
        setFakeHwError('Code validation failed:\n' + validation.errors.join('\n'))
        setIsSubmittingFakeHw(false)
        return
      }
      // Validate INITIAL_LAYOUT length matches qubit count (skip comments)
      const layoutMatch = codeToRun.match(/^[^#\n]*INITIAL_LAYOUT\s*=\s*\[([^\]]*)\]/m)
      if (layoutMatch) {
        const layoutNums = layoutMatch[1].split(',').map(s => s.trim()).filter(s => /^\d+$/.test(s))
        const qcMatch = codeToRun.match(/QuantumCircuit\(\s*(\d+)/)
        const numQubits = qcMatch ? parseInt(qcMatch[1]) : (editorMode === 'composer' ? circuit.numQubits : 0)
        if (numQubits > 0 && layoutNums.length > 0 && layoutNums.length !== numQubits) {
          setFakeHwError(`INITIAL_LAYOUT has ${layoutNums.length} entries but circuit has ${numQubits} qubits. They must match.`)
          setIsSubmittingFakeHw(false)
          return
        }
      }
      const result = await homeworkApi.submitFakeHardware({
        token,
        homework_id: homeworkId,
        code: codeToRun,
        shots,
        eval_method: evalMethod,
      })
      setFakeHwResult(result)
    } catch (err: any) {
      setFakeHwError(err.detail || err.message || 'Fake hardware submission failed')
    } finally {
      setIsSubmittingFakeHw(false)
    }
  }

  const handleClearToken = () => {
    if (homeworkId) {
      localStorage.removeItem(`hw_token_${homeworkId}`)
    }
    setHomeworkInfo(null)
    setToken('')
    setSubmissions([])
  }

  const handleSaveProfile = async () => {
    if (!token) return
    setProfileSaving(true)
    setProfileSaved(false)
    try {
      await homeworkApi.updateProfile({
        token,
        display_name: displayName,
        method_name: methodName,
      })
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2000)
    } catch { /* ignore */ }
    finally { setProfileSaving(false) }
  }

  // ============ Sidebar resize handlers ============

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    const startX = e.clientX
    const startWidth = sidebarWidth

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const newWidth = Math.min(500, Math.max(200, startWidth + (e.clientX - startX)))
      setSidebarWidth(newWidth)
    }

    const onMouseUp = () => {
      isResizing.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [sidebarWidth])

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
      const compiled = compileToQiskit(circuit, postSelect, initialLayout || undefined)
      if (compiled && compiled.trim()) {
        setCode(compiled)
      }
    }
    setParseWarning(null)
    setEditorMode('code')
  }

  const handleSwitchToComposer = () => {
    if (editorMode === 'code') {
      const result = decompileToCircuit(code)
      if (result) {
        setCircuit(result.circuit)
        if (result.postSelect) {
          setPostSelect(result.postSelect)
        }
        setInitialLayout(result.initialLayout || '')
        setParseWarning(null)
      } else {
        setParseWarning('Could not parse code into visual circuit. The composer shows the previous circuit.')
      }
    }
    setEditorMode('composer')
  }

  // Budget percentage (only meaningful when token is verified)
  const budgetPercent = homeworkInfo?.valid
    ? Math.min(100, ((homeworkInfo.budget_used_seconds || 0) / (homeworkInfo.budget_total_seconds || 1)) * 100)
    : 0
  const budgetLow = (homeworkInfo?.budget_remaining_seconds || 0) < 60

  const isTokenVerified = homeworkInfo?.valid === true
  const canSubmitHardware = isTokenVerified && (homeworkInfo?.budget_remaining_seconds || 0) >= 30

  // ============ Preview compiled test circuit ============

  const generatePreviewCode = (basis?: string): string => {
    const studentCode = editorMode === 'composer' ? compileToQiskit(circuit, postSelect, initialLayout || undefined) : code
    // Strip measurements and POST_SELECT from student code
    const lines = studentCode.split('\n').filter(l => {
      const t = l.trim()
      if (t.startsWith('POST_SELECT')) return false
      if (/\.measure_all\s*\(/.test(t)) return false
      if (/\.measure\s*\(/.test(t)) return false
      if (t.startsWith('# Post-selection')) return false
      if (t.startsWith('# Keep shots')) return false
      if (t.startsWith('# For BBPSSW')) return false
      return true
    })

    const header = `# ===== FULL TEST CIRCUIT =====\n# This is what actually runs on hardware.\n# Your circuit + ${evalMethod === 'tomography' ? `Tomography (${basis} basis)` : 'Inverse Bell verification'}\n`

    if (evalMethod === 'inverse_bell') {
      return header + lines.join('\n') + `

# --- Inverse Bell Verification ---
# Maps |Phi+> -> |00>: F(Phi+) = P(output qubits = 00)
qc.cx(0, 1)
qc.h(0)
qc.measure_all()
`
    } else {
      // Tomography
      const b = basis || 'ZZ'
      let basisGates = ''
      if (b === 'XX') {
        basisGates = `# XX basis: apply H on output qubits before measurement
qc.h(0)
qc.h(1)`
      } else if (b === 'YY') {
        basisGates = `# YY basis: apply Sdg+H on output qubits before measurement
qc.sdg(0)
qc.h(0)
qc.sdg(1)
qc.h(1)`
      } else {
        basisGates = `# ZZ basis: measure in computational basis (no extra gates)`
      }
      return header + lines.join('\n') + `

# --- Tomography (${b} basis) ---
${basisGates}
qc.measure_all()
`
    }
  }

  // ============ Loading / Error States ============

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-500 mb-4">{loadError}</p>
          <Link to="/" className="text-qcloud-primary hover:underline">Back to Home</Link>
        </div>
      </div>
    )
  }

  if (!publicInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
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
            {publicInfo.title}
          </span>
          <span className="text-xs text-qcloud-muted">
            {publicInfo.course}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Budget bar (only when token verified) */}
          {isTokenVerified && (
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
          )}
          {homeworkId && (
            <>
              <Link
                to={`/homework/${homeworkId}/leaderboard`}
                className="px-3 py-1 text-xs bg-amber-50 text-amber-700 rounded hover:bg-amber-100 transition-colors"
              >
                Leaderboard
              </Link>
              <Link
                to={`/homework/${homeworkId}/queue${token ? `?token=${encodeURIComponent(token)}` : ''}`}
                className="px-3 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
              >
                Queue
              </Link>
              <Link
                to={`/homework/${homeworkId}/hardware-ranking`}
                className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
              >
                Hardware Ranking
              </Link>
            </>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowAdmin(!showAdmin)}
              className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                showAdmin
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              {showAdmin ? 'Student View' : 'Admin Panel'}
            </button>
          )}
        </div>
      </header>

      {/* Admin Panel (replaces editor when active) */}
      {showAdmin && homeworkId ? (
        <HomeworkAdminPanel homeworkId={homeworkId} />
      ) : (
      <>
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
          <span className="text-[10px] text-slate-400">Backend:</span>
          <select
            value={selectedBackend}
            onChange={(e) => setSelectedBackend(e.target.value)}
            className="px-2 py-1 bg-slate-700 text-slate-200 border border-slate-600 rounded text-xs focus:outline-none"
          >
            {HARDWARE_PROVIDERS.map((p) => (
              <option key={p.backendName} value={p.backendName}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowHardwareInfo(true)}
            className="px-1.5 py-1 bg-slate-700 text-slate-300 border border-slate-600 rounded text-xs hover:bg-slate-600 hover:text-white transition-colors"
            title="View hardware details"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <div className="w-px h-4 bg-slate-600" />
          <span className="text-[10px] text-slate-400">Shots:</span>
          <input
            type="number"
            value={shots}
            onChange={(e) => setShots(Math.max(1, Math.min(8192, parseInt(e.target.value) || 1024)))}
            className="w-16 px-2 py-1 bg-slate-700 text-slate-200 border border-slate-600 rounded text-xs focus:outline-none"
          />
          <div className="w-px h-4 bg-slate-600" />
          <span className="text-[10px] text-slate-400">Test Method:</span>
          <select
            value={evalMethod}
            onChange={(e) => setEvalMethod(e.target.value as 'inverse_bell' | 'tomography')}
            className="px-2 py-1 bg-slate-700 text-slate-200 border border-slate-600 rounded text-xs focus:outline-none"
            title="Fidelity evaluation method"
          >
            <option value="inverse_bell">Inverse Bell</option>
            <option value="tomography">Tomography</option>
          </select>
          <button
            onClick={() => setShowPreviewCircuit(true)}
            className="px-2 py-1 bg-slate-700 text-slate-300 border border-slate-600 rounded text-xs hover:bg-slate-600 hover:text-white transition-colors"
            title="Preview the full compiled circuit including the test method"
          >
            Preview Circuit
          </button>
          {selectedBackend && getCalibrationData(selectedBackend) && (
            <button
              onClick={() => {
                // Extract INITIAL_LAYOUT from code before opening modal
                if (editorMode === 'code') {
                  const match = code.match(/^[^#\n]*INITIAL_LAYOUT\s*=\s*\[([^\]]*)\]/m)
                  if (match) {
                    setInitialLayout(match[1].trim())
                  }
                }
                setShowHardwareInfo(true)
              }}
              className="px-2 py-1 bg-slate-700 text-blue-300 border border-slate-600 rounded text-xs hover:bg-slate-600 hover:text-blue-100 transition-colors"
              title="Preview the hardware topology and your qubit layout"
            >
              Layout
            </button>
          )}
          {selectedBackend && (
            <button
              onClick={async () => {
                setIsCheckingTranspile(true)
                setTranspileResult(null)
                setShowTranspileCheck(true)
                try {
                  const codeToCheck = editorMode === 'composer' ? compileToQiskit(circuit, postSelect, initialLayout || undefined) : code
                  const result = await homeworkApi.checkTranspile({
                    homework_id: homeworkId!,
                    code: codeToCheck,
                    backend_name: selectedBackend,
                    eval_method: evalMethod,
                  })
                  setTranspileResult(result)
                } catch (err: any) {
                  setTranspileResult({ success: false, error: err.message || 'Failed to check transpilation' })
                } finally {
                  setIsCheckingTranspile(false)
                }
              }}
              disabled={isCheckingTranspile}
              className="px-2 py-1 bg-slate-700 text-green-300 border border-slate-600 rounded text-xs hover:bg-slate-600 hover:text-green-100 transition-colors disabled:opacity-50"
              title="Check how your code will be transpiled for the selected backend"
            >
              {isCheckingTranspile ? 'Checking...' : 'Transpile'}
            </button>
          )}
          <Link
            to={`/homework/${homeworkId}/methods`}
            className="px-2 py-1 bg-slate-700 text-slate-300 border border-slate-600 rounded text-xs hover:bg-slate-600 hover:text-white transition-colors"
            title="Learn how fidelity is calculated"
          >
            ?
          </Link>
          <div className="w-px h-4 bg-slate-600" />
          {/* Noise model error rates */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">1Q err:</span>
            <input
              type="number"
              value={singleQubitError}
              onChange={e => setSingleQubitError(Math.max(0, Math.min(0.5, parseFloat(e.target.value) || 0)))}
              step={0.005}
              min={0}
              max={0.5}
              className="w-14 px-1 py-0.5 bg-slate-700 border border-slate-600 rounded text-[10px] text-slate-200 text-center"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">2Q err:</span>
            <input
              type="number"
              value={twoQubitError}
              onChange={e => setTwoQubitError(Math.max(0, Math.min(0.5, parseFloat(e.target.value) || 0)))}
              step={0.005}
              min={0}
              max={0.5}
              className="w-14 px-1 py-0.5 bg-slate-700 border border-slate-600 rounded text-[10px] text-slate-200 text-center"
            />
          </div>
          {/* Simulator button - only for noisy_simulator backend, requires token */}
          <button
            onClick={() => handleSimulate('distillation')}
            disabled={isSimulating || selectedBackend !== 'noisy_simulator' || !isTokenVerified}
            title={!isTokenVerified ? 'Enter your token first' : selectedBackend !== 'noisy_simulator' ? 'Select Noisy Simulator backend' : undefined}
            className="px-4 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {isSimulating && simulateMode === 'distillation' ? 'Simulating...' : 'Run Simulator'}
          </button>
          {/* Hardware submit - only for real IBM backends, requires token + budget */}
          <button
            onClick={openSubmitModal}
            disabled={isSubmitting || !canSubmitHardware || selectedBackend === 'noisy_simulator' || selectedBackend === 'fake_4x4'}
            title={!isTokenVerified ? 'Enter your token first' : selectedBackend === 'noisy_simulator' || selectedBackend === 'fake_4x4' ? 'Select a real hardware backend' : !canSubmitHardware ? 'Insufficient budget' : undefined}
            className="px-4 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-500 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit to Hardware'}
          </button>
          {/* Fake hardware submit - only for fake_4x4 backend, requires token */}
          <button
            onClick={handleSubmitFakeHardware}
            disabled={isSubmittingFakeHw || !isTokenVerified || selectedBackend !== 'fake_4x4'}
            title={!isTokenVerified ? 'Enter your token first' : selectedBackend !== 'fake_4x4' ? 'Select Fake 4x4 Grid backend' : undefined}
            className="px-4 py-1 bg-orange-600 text-white rounded text-xs font-medium hover:bg-orange-500 transition-colors disabled:opacity-50"
          >
            {isSubmittingFakeHw ? 'Submitting...' : 'Submit to FakeHardware'}
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

      {/* Simulator Results Panel */}
      {(simulatorResult || simulateError) && (
        <div className="border-b border-qcloud-border bg-slate-50">
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-qcloud-text uppercase tracking-wider">
              {simulateMode === 'bell_pair' ? 'Bell Pair Test Results' : 'Simulator Results (Noisy)'}
            </span>
            <button
              onClick={() => { setSimulatorResult(null); setSimulateError(null) }}
              className="text-xs text-qcloud-muted hover:text-red-500"
            >
              Clear
            </button>
          </div>
          {simulateError ? (
            <div className="px-4 pb-3 text-xs text-red-600">{simulateError}</div>
          ) : simulatorResult && simulatorResult.success ? (
            <div className="px-4 pb-3">
              {simulateMode === 'bell_pair' ? (
                /* Bell pair mode: just show fidelity */
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-[10px] text-qcloud-muted">Bell Pair Fidelity</div>
                    <div className="text-lg font-bold text-indigo-600">
                      {((simulatorResult.fidelity_after || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-qcloud-muted">Ideal</div>
                    <div className="text-lg font-bold text-gray-400">100%</div>
                  </div>
                </div>
              ) : (
                /* Distillation mode: results */
                <div className={`grid ${simulatorResult.success_probability != null ? 'grid-cols-2' : 'grid-cols-1'} gap-4 text-center`}>
                  <div>
                    <div className="text-[10px] text-qcloud-muted">Your Fidelity</div>
                    <div className="text-lg font-bold text-qcloud-primary">
                      {((simulatorResult.fidelity_after || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                  {simulatorResult.success_probability != null && (
                    <div>
                      <div className="text-[10px] text-qcloud-muted">Success Prob.</div>
                      <div className="text-lg font-bold text-purple-600">
                        {(simulatorResult.success_probability * 100).toFixed(1)}%
                        {simulatorResult.post_selected_shots != null && (
                          <span className="text-[9px] font-normal text-qcloud-muted ml-1">
                            ({simulatorResult.post_selected_shots} shots)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {simulatorResult.tomography_correlators && (
                <div className="mt-2 flex gap-3 text-xs">
                  <span className="text-qcloud-muted font-medium">Correlators:</span>
                  {Object.entries(simulatorResult.tomography_correlators).map(([basis, val]) => (
                    <span key={basis} className="font-mono">
                      <span className="text-purple-600">{basis}</span>={typeof val === 'number' ? val.toFixed(3) : val}
                    </span>
                  ))}
                  <span className="text-qcloud-muted">F = (1+XX-YY+ZZ)/4</span>
                </div>
              )}
              <div className="mt-2 text-[10px] text-qcloud-muted flex gap-4">
                <span>Qubits: {simulatorResult.qubit_count}</span>
                <span>Gates: {simulatorResult.gate_count}</span>
                <span>Depth: {simulatorResult.circuit_depth}</span>
                <span>Time: {simulatorResult.execution_time_ms?.toFixed(0)}ms</span>
                <span className={`ml-auto px-1.5 py-0.5 rounded ${
                  simulateMode === 'bell_pair' ? 'bg-indigo-100 text-indigo-700' :
                  simulatorResult.eval_method === 'tomography' ? 'bg-purple-100 text-purple-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {simulateMode === 'bell_pair' ? 'Bell Pair Test' :
                   simulatorResult.eval_method === 'tomography' ? 'Tomography' :
                   simulatorResult.eval_method === 'inverse_bell' ? 'Inverse Bell' : 'Noisy Simulator'}
                </span>
              </div>
            </div>
          ) : simulatorResult && !simulatorResult.success ? (
            <div className="px-4 pb-3 text-xs text-red-600">{simulatorResult.error}</div>
          ) : null}
        </div>
      )}

      {/* Fake Hardware Results Panel */}
      {(fakeHwResult || fakeHwError) && (
        <div className="border-b border-qcloud-border bg-orange-50">
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-qcloud-text uppercase tracking-wider">
              Fake Hardware Results (4x4 Grid)
            </span>
            <button
              onClick={() => { setFakeHwResult(null); setFakeHwError(null) }}
              className="text-xs text-qcloud-muted hover:text-red-500"
            >
              Clear
            </button>
          </div>
          {fakeHwError ? (
            <div className="px-4 pb-3 text-xs text-red-600">{fakeHwError}</div>
          ) : fakeHwResult && fakeHwResult.success ? (
            <div className="px-4 pb-4 space-y-3">
              {/* Fidelity Banner */}
              <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg p-3 text-center border border-orange-200">
                <div className="text-2xl font-bold text-orange-600">
                  Fidelity: {((fakeHwResult.fidelity_after || 0) * 100).toFixed(1)}%
                </div>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  fakeHwResult.eval_method === 'tomography' ? 'bg-purple-100 text-purple-700' :
                  'bg-teal-100 text-teal-700'
                }`}>
                  {fakeHwResult.eval_method === 'inverse_bell' ? 'Inverse Bell' : 'Tomography'}
                </span>
              </div>

              {/* Post-Selection Stats */}
              {fakeHwResult.success_probability != null && (
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white rounded-lg p-2 border border-orange-200">
                    <div className="text-[10px] text-qcloud-muted">Success Probability</div>
                    <div className="text-sm font-bold text-amber-600">
                      {(fakeHwResult.success_probability * 100).toFixed(1)}%
                    </div>
                  </div>
                  {fakeHwResult.post_selected_shots != null && (
                    <div className="bg-white rounded-lg p-2 border border-orange-200">
                      <div className="text-[10px] text-qcloud-muted">Post-Selected Shots</div>
                      <div className="text-sm font-bold text-qcloud-text">
                        {fakeHwResult.post_selected_shots} / {shots}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tomography Correlators */}
              {fakeHwResult.tomography_correlators && (
                <div className="bg-white rounded-lg p-2 border border-orange-200">
                  <div className="text-[10px] font-medium text-qcloud-text mb-1">Pauli Correlators</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {Object.entries(fakeHwResult.tomography_correlators).map(([basis, val]) => (
                      <div key={basis}>
                        <div className="text-[10px] text-qcloud-muted">{basis}</div>
                        <div className={`text-sm font-bold font-mono ${
                          typeof val === 'number' && val >= 0 ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {typeof val === 'number' ? (val >= 0 ? '+' : '') + val.toFixed(3) : val}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-qcloud-muted mt-1 text-center">
                    {'F(|Φ+⟩) = (1 + ⟨XX⟩ − ⟨YY⟩ + ⟨ZZ⟩) / 4'}
                  </p>
                </div>
              )}

              {/* Submission Details */}
              <div className="bg-white rounded-lg p-2 border border-orange-200">
                <div className="text-[10px] font-medium text-qcloud-text mb-1">Submission Details</div>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div>
                    <span className="text-qcloud-muted block">Backend</span>
                    <span className="font-medium text-orange-700">Fake 4x4</span>
                  </div>
                  <div>
                    <span className="text-qcloud-muted block">Qubits</span>
                    <span className="font-medium">{fakeHwResult.qubit_count ?? '—'}</span>
                  </div>
                  <div>
                    <span className="text-qcloud-muted block">Gates</span>
                    <span className="font-medium">{fakeHwResult.gate_count ?? '—'}</span>
                  </div>
                  <div>
                    <span className="text-qcloud-muted block">Depth</span>
                    <span className="font-medium">{fakeHwResult.circuit_depth ?? '—'}</span>
                  </div>
                </div>
                {fakeHwResult.execution_time_ms != null && (
                  <div className="text-[10px] text-qcloud-muted text-center mt-1">
                    Execution: {fakeHwResult.execution_time_ms.toFixed(0)}ms
                  </div>
                )}
              </div>

              {/* Measurement Distribution */}
              {fakeHwResult.measurements && Object.keys(fakeHwResult.measurements).length > 0 && (
                <div className="bg-white rounded-lg p-2 border border-orange-200">
                  <div className="text-[10px] font-medium text-qcloud-text mb-2">Measurement Distribution</div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {Object.entries(fakeHwResult.measurements)
                      .sort(([, a], [, b]) => b - a)
                      .map(([state, count]) => {
                        const total = Object.values(fakeHwResult.measurements!).reduce((a, b) => a + b, 0)
                        const pct = (count / total) * 100
                        return (
                          <div key={state} className="flex items-center gap-2">
                            <span className="font-mono text-[10px] w-14 text-right shrink-0">|{state}⟩</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden">
                              <div
                                className="bg-orange-500 h-3.5 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-qcloud-muted w-20 text-right shrink-0">
                              {count} ({pct.toFixed(1)}%)
                            </span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          ) : fakeHwResult && !fakeHwResult.success ? (
            <div className="px-4 pb-3 text-xs text-red-600">{fakeHwResult.error}</div>
          ) : null}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="flex-shrink-0 bg-white border-r border-qcloud-border overflow-y-auto" style={{ width: sidebarWidth }}>
          {/* Token Input (hidden for admins) */}
          {!isAdmin && (
          <div className="p-3 border-b border-qcloud-border">
            <h4 className="text-xs font-semibold text-qcloud-text mb-2 uppercase tracking-wider">
              Hardware Token
            </h4>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyToken()}
                placeholder="Paste token..."
                className="flex-1 px-2 py-1.5 border border-qcloud-border rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-qcloud-primary/50"
              />
              <button
                onClick={() => handleVerifyToken()}
                disabled={isVerifying || !token.trim()}
                className="px-2 py-1.5 bg-qcloud-primary text-white rounded text-xs hover:bg-qcloud-secondary disabled:opacity-50"
              >
                {isVerifying ? '...' : 'OK'}
              </button>
            </div>
            {isTokenVerified && (
              <div className="mt-2 text-[10px] text-green-600 flex items-center gap-1">
                <span>{homeworkInfo?.display_name ? `Welcome, ${homeworkInfo.display_name}` : 'Token verified'}</span>
                <button onClick={handleClearToken} className="text-red-400 hover:text-red-600 ml-auto">(clear)</button>
              </div>
            )}
            {homeworkInfo && !homeworkInfo.valid && (
              <p className="mt-1 text-[10px] text-red-500">{homeworkInfo.error}</p>
            )}
            <p className="mt-1.5 text-[10px] text-qcloud-muted">
              Token is only needed for IBM hardware. The simulator is always free.
            </p>
          </div>
          )}

          {/* Optional: Use your own IBM API key (hidden for admins) */}
          {!isAdmin && (
          <div className="p-3 border-b border-qcloud-border">
            <h4 className="text-xs font-semibold text-qcloud-text mb-2 uppercase tracking-wider">
              Your IBM API Key <span className="text-qcloud-muted font-normal normal-case">(optional)</span>
            </h4>
            <input
              type="password"
              value={customApiKey}
              onChange={(e) => {
                setCustomApiKey(e.target.value)
                if (e.target.value) {
                  localStorage.setItem(`hw_custom_apikey_${homeworkId}`, e.target.value)
                } else {
                  localStorage.removeItem(`hw_custom_apikey_${homeworkId}`)
                }
              }}
              placeholder="Paste your IBM API key..."
              className="w-full px-2 py-1.5 border border-qcloud-border rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-qcloud-primary/50"
            />
            {customApiKey ? (
              <p className="mt-1.5 text-[10px] text-green-600">
                Your key will be used for hardware submissions. Stored locally only.
              </p>
            ) : (
              <p className="mt-1.5 text-[10px] text-qcloud-muted">
                Provide your own IBM Quantum key to submit jobs using your account. Key is stored in your browser only.
              </p>
            )}
          </div>
          )}

          {/* Student Profile (only when token verified, hidden for admins) */}
          {isTokenVerified && !isAdmin && (
            <div className="p-3 border-b border-qcloud-border">
              <h4 className="text-xs font-semibold text-qcloud-text mb-2 uppercase tracking-wider">
                Leaderboard Profile
              </h4>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-qcloud-muted block mb-0.5">Display Name (shown on leaderboard)</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name or alias..."
                    maxLength={30}
                    className="w-full px-2 py-1.5 border border-qcloud-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-qcloud-primary/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-qcloud-muted block mb-0.5">Method Name (your approach)</label>
                  <input
                    type="text"
                    value={methodName}
                    onChange={(e) => setMethodName(e.target.value)}
                    placeholder="e.g. BBPSSW + parity check..."
                    maxLength={50}
                    className="w-full px-2 py-1.5 border border-qcloud-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-qcloud-primary/50"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="w-full px-2 py-1.5 bg-qcloud-primary text-white rounded text-xs hover:bg-qcloud-secondary disabled:opacity-50 transition-colors"
                >
                  {profileSaving ? 'Saving...' : profileSaved ? 'Saved!' : 'Save Profile'}
                </button>
              </div>
            </div>
          )}

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
                {/* Individual running/queued jobs - only show YOUR JOBS for students */}
                {isTokenVerified && queueStatus.my_submissions.length > 0 && (
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

          {/* Submission History (only when token verified, hidden for admins) */}
          {isTokenVerified && !isAdmin && (
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
                          <span className="font-medium text-qcloud-primary">
                            Fidelity: {((sub.fidelity_after) * 100).toFixed(1)}%
                          </span>
                          {sub.success_probability != null && (
                            <span className="text-qcloud-muted">
                              P(success): {((sub.success_probability) * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reference Circuit (collapsible) */}
          {publicInfo.reference_circuit && (
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
                  {publicInfo.reference_circuit}
                </pre>
              )}
            </div>
          )}

          {/* Problem Description */}
          {publicInfo.description && (
            <div className="p-3">
              <h4 className="text-xs font-semibold text-qcloud-text mb-2 uppercase tracking-wider">Description</h4>
              <div className="text-xs text-qcloud-muted whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                {publicInfo.description}
              </div>
            </div>
          )}
        </div>

        {/* Resize Handle */}
        <div
          onMouseDown={handleResizeStart}
          className="w-1 flex-shrink-0 bg-transparent hover:bg-qcloud-primary/30 cursor-col-resize transition-colors"
          title="Drag to resize"
        />

        {/* Right: Editor or Composer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {editorMode === 'code' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* POST_SELECT validation warning for code mode */}
              {(() => {
                const ancillaInfo = extractMeasurementsFromCode(code)
                const psMatch = code.match(/POST_SELECT\s*=\s*(\{[^}]*\})/)
                if (!psMatch) return null
                const psErrors = validatePostSelectLength(psMatch[1], ancillaInfo)
                if (psErrors.length === 0) {
                  // Show bit order info when valid
                  if (ancillaInfo.ancillaCount > 0) {
                    const bitLabel = ancillaInfo.ancillaClassicalBits.map(b => `c${b}`).join(' ')
                    return (
                      <div className="flex-shrink-0 px-3 py-1 bg-blue-50 border-b border-blue-200 text-[10px] text-blue-700">
                        POST_SELECT bit order (Qiskit convention, highest bit first): [{bitLabel}] — {ancillaInfo.ancillaCount} ancilla bit(s)
                      </div>
                    )
                  }
                  return null
                }
                return (
                  <div className="flex-shrink-0 px-3 py-1 bg-red-50 border-b border-red-200 text-xs text-red-700">
                    <strong>POST_SELECT error:</strong> {psErrors[0]}
                  </div>
                )
              })()}
              <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
                <CodeEditor value={code} onChange={(v) => setCode(v || '')} />
              </div>
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
                <div className="w-px h-4 bg-qcloud-border mx-1" />
                <span className="text-qcloud-muted">POST_SELECT:</span>
                <input
                  type="text"
                  value={postSelect}
                  onChange={(e) => setPostSelect(e.target.value)}
                  placeholder='None'
                  className={`w-28 px-1.5 py-0.5 border rounded text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-qcloud-primary/50 ${
                    (() => {
                      const info = extractMeasurementsFromCircuit(circuit)
                      const errs = postSelect.trim() ? validatePostSelectLength(postSelect, info) : []
                      return errs.length > 0 ? 'border-red-400' : 'border-qcloud-border'
                    })()
                  }`}
                  title='Post-selection set, e.g. {"00"} or {"00", "11"}. Leave empty for no post-selection (bare Bell pair).'
                />
                {!postSelect.trim() && (
                  <span className="text-[10px] text-green-600" title="No post-selection: all shots kept, success probability = 100%">
                    (no filtering)
                  </span>
                )}
                {/* Show bit order label */}
                {(() => {
                  const info = extractMeasurementsFromCircuit(circuit)
                  if (info.ancillaCount === 0) return null
                  const bitLabel = info.ancillaClassicalBits.map(b => `c${b}`).join(' ')
                  const psErrors = postSelect.trim() ? validatePostSelectLength(postSelect, info) : []
                  return (
                    <span className="text-[10px] text-qcloud-muted" title="Qiskit bit order: highest classical bit index first (leftmost)">
                      Bit order: [{bitLabel}]
                      {psErrors.length > 0 && (
                        <span className="text-red-500 ml-1" title={psErrors.join('\n')}>
                          (length must be {info.ancillaCount})
                        </span>
                      )}
                    </span>
                  )
                })()}
                <div className="w-px h-4 bg-qcloud-border mx-1" />
                <span className="text-qcloud-muted">Layout:</span>
                <input
                  type="text"
                  value={initialLayout}
                  onChange={(e) => setInitialLayout(e.target.value)}
                  placeholder="[0, 1, 2, 3]"
                  className="w-28 px-1.5 py-0.5 border border-qcloud-border rounded text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-qcloud-primary/50"
                  title="INITIAL_LAYOUT: maps logical qubits to physical qubits on hardware. Leave empty for automatic layout."
                />
                <span className="text-[10px] text-qcloud-muted" title="Check hardware info for qubit topology and error rates">
                  (optional)
                </span>
                <button onClick={() => setCircuit(createEmptyCircuit(circuit.numQubits))}
                  className="ml-auto text-red-500 hover:text-red-700 text-xs">Clear</button>
              </div>
              {parseWarning && (
                <div className="flex-shrink-0 px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-700 flex items-center justify-between">
                  <span>{parseWarning}</span>
                  <button onClick={() => setParseWarning(null)} className="text-amber-500 hover:text-amber-700 ml-2">x</button>
                </div>
              )}
              {/* POST_SELECT length mismatch warning */}
              {(() => {
                if (!postSelect.trim()) return null
                const info = extractMeasurementsFromCircuit(circuit)
                const psErrors = validatePostSelectLength(postSelect, info)
                if (psErrors.length === 0) return null
                return (
                  <div className="flex-shrink-0 px-4 py-1.5 bg-red-50 border-b border-red-200 text-xs text-red-700">
                    <strong>POST_SELECT error:</strong> {psErrors[0]}
                  </div>
                )
              })()}
              <div className="flex-1 overflow-auto p-4 bg-qcloud-bg">
                <CircuitCanvas
                  circuit={circuit}
                  onDropGate={handleDropGate}
                  onRemoveGate={handleRemoveGate}
                  onMoveGate={handleMoveGate}
                  draggingGate={draggingGate}
                  selectedGates={selectedGates}
                  onSelectionChange={setSelectedGates}
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
          numClassicalBits={circuit.numClassicalBits}
          availableGates={(['X', 'Y', 'Z', 'H', 'S', 'T', 'RX', 'RY', 'RZ'] as GateType[])}
          onConfirm={handleConditionalConfirm}
          onCancel={() => setConditionalModal({ isOpen: false, qubitIndex: 0, column: 0 })}
        />
      )}

      {/* Hardware Info Modal */}
      {showHardwareInfo && <HardwareInfoModal
        selectedBackend={selectedBackend}
        initialLayout={initialLayout}
        code={code}
        editorMode={editorMode}
        onClose={() => setShowHardwareInfo(false)}
        onLayoutChange={(newLayout) => {
          setInitialLayout(newLayout)
          // Also update code if in code mode
          if (editorMode === 'code') {
            const layoutLine = `INITIAL_LAYOUT = [${newLayout}]`
            const existingMatch = code.match(/^INITIAL_LAYOUT\s*=\s*\[.*\]$/m)
            if (existingMatch) {
              setCode(code.replace(/^INITIAL_LAYOUT\s*=\s*\[.*\]$/m, layoutLine))
            } else if (newLayout.trim()) {
              const insertPoint = code.indexOf('\nqc = QuantumCircuit')
              if (insertPoint >= 0) {
                setCode(code.slice(0, insertPoint) + '\n' + layoutLine + code.slice(insertPoint))
              } else {
                setCode(code + '\n' + layoutLine + '\n')
              }
            }
          }
        }}
      />}

      {/* Preview Compiled Circuit Modal */}
      {showPreviewCircuit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPreviewCircuit(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-qcloud-border flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-bold text-qcloud-text">Full Test Circuit Preview</h3>
                <p className="text-xs text-qcloud-muted mt-0.5">
                  This is the complete circuit that runs on hardware: your circuit + the {evalMethod === 'inverse_bell' ? 'Inverse Bell' : 'Tomography'} test.
                  <span className="text-amber-600 ml-1">(Read-only)</span>
                </p>
              </div>
              <button onClick={() => setShowPreviewCircuit(false)} className="text-qcloud-muted hover:text-red-500 text-lg">&times;</button>
            </div>
            <div className="flex-1 overflow-auto">
              {evalMethod === 'inverse_bell' ? (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-teal-50 text-teal-700 rounded">Inverse Bell</span>
                    <span className="text-xs text-qcloud-muted">Single circuit: your code + CX(0,1) + H(0) + measure_all</span>
                  </div>
                  <pre className="text-xs bg-slate-900 text-slate-300 p-4 rounded-lg font-mono leading-relaxed overflow-auto max-h-[50vh] select-all">
                    {generatePreviewCode()}
                  </pre>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  <p className="text-xs text-qcloud-muted">
                    Tomography runs <strong>3 separate circuits</strong> (one per Pauli basis). Each measures the output qubits in a different basis.
                  </p>
                  {['ZZ', 'XX', 'YY'].map(basis => (
                    <div key={basis}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          basis === 'ZZ' ? 'bg-blue-50 text-blue-700' :
                          basis === 'XX' ? 'bg-green-50 text-green-700' :
                          'bg-orange-50 text-orange-700'
                        }`}>{basis} Basis</span>
                        <span className="text-xs text-qcloud-muted">
                          {basis === 'ZZ' ? 'Computational basis (no extra gates)' :
                           basis === 'XX' ? 'H(0) + H(1) before measurement' :
                           'Sdg(0) + H(0) + Sdg(1) + H(1) before measurement'}
                        </span>
                      </div>
                      <pre className="text-xs bg-slate-900 text-slate-300 p-4 rounded-lg font-mono leading-relaxed overflow-auto max-h-48 select-all">
                        {generatePreviewCode(basis)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Check Transpiled Code Modal */}
      {showTranspileCheck && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTranspileCheck(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-qcloud-border flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-bold text-qcloud-text">Transpilation Check</h3>
                <p className="text-xs text-qcloud-muted mt-0.5">
                  Preview how your code will be transpiled for <span className="font-mono font-medium text-blue-600">{selectedBackend}</span>
                </p>
              </div>
              <button onClick={() => setShowTranspileCheck(false)} className="text-qcloud-muted hover:text-red-500 text-lg">&times;</button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {isCheckingTranspile ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
                  <span className="ml-3 text-sm text-qcloud-muted">Transpiling...</span>
                </div>
              ) : transpileResult ? (
                <>
                  {transpileResult.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                      {transpileResult.error}
                    </div>
                  )}

                  {/* Parsed Code Info */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-qcloud-text mb-2">Parsed Code Info</h4>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-qcloud-muted">INITIAL_LAYOUT:</span>
                        <span className={`font-mono font-medium ${transpileResult.initial_layout ? 'text-green-600' : 'text-slate-400'}`}>
                          {transpileResult.initial_layout ? `[${transpileResult.initial_layout.join(', ')}]` : 'Not set (auto)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-qcloud-muted">POST_SELECT:</span>
                        <span className={`font-mono font-medium ${transpileResult.post_select ? 'text-purple-600' : 'text-slate-400'}`}>
                          {transpileResult.post_select ? `{${transpileResult.post_select.join(', ')}}` : 'None'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-qcloud-muted">Qubits:</span>
                        <span className="font-mono">{transpileResult.qubit_count ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-qcloud-muted">Gates:</span>
                        <span className="font-mono">{transpileResult.gate_count ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-qcloud-muted">Depth:</span>
                        <span className="font-mono">{transpileResult.circuit_depth ?? '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Transpiled Circuit Info */}
                  {transpileResult.transpiled_depth != null && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-qcloud-text mb-2">Transpiled Circuit (optimization_level=3)</h4>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-qcloud-muted">Physical Qubits:</span>
                          <span className="font-mono font-medium text-blue-600">{transpileResult.transpiled_qubit_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-qcloud-muted">Transpiled Gates:</span>
                          <span className="font-mono">{transpileResult.transpiled_gate_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-qcloud-muted">Transpiled Depth:</span>
                          <span className="font-mono">{transpileResult.transpiled_depth}</span>
                        </div>
                        {transpileResult.physical_qubits && (
                          <div className="flex justify-between col-span-2">
                            <span className="text-qcloud-muted">Qubit Mapping:</span>
                            <span className="font-mono text-green-600">
                              {transpileResult.physical_qubits.map((pq, i) => `q${i}→Q${pq}`).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Transpiled QASM */}
                  {transpileResult.transpiled_qasm && (
                    <div>
                      <h4 className="text-sm font-semibold text-qcloud-text mb-2">Transpiled QASM</h4>
                      <pre className="text-xs bg-slate-900 text-slate-300 p-4 rounded-lg font-mono leading-relaxed overflow-auto max-h-[40vh] select-all whitespace-pre">
                        {transpileResult.transpiled_qasm}
                      </pre>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSubmitModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-qcloud-border">
              <h3 className="font-bold text-qcloud-text">Confirm Hardware Submission</h3>
              <p className="text-xs text-qcloud-muted mt-1">
                This will submit your circuit to <span className="font-semibold text-blue-600">{selectedBackend}</span> with {shots} shots.
              </p>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Budget reminder */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-amber-800">Budget Remaining</span>
                  <span className={`text-sm font-bold ${(homeworkInfo?.budget_remaining_seconds || 0) < 120 ? 'text-red-600' : 'text-amber-700'}`}>
                    {Math.round(homeworkInfo?.budget_remaining_seconds || 0)}s
                  </span>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${(homeworkInfo?.budget_remaining_seconds || 0) < 120 ? 'bg-red-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.max(0, 100 - ((homeworkInfo?.budget_used_seconds || 0) / (homeworkInfo?.budget_total_seconds || 1)) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-amber-600 mt-1">
                  {Math.round(homeworkInfo?.budget_used_seconds || 0)}s used of {homeworkInfo?.budget_total_seconds || 0}s total
                </p>
              </div>

              {/* API Key choice */}
              <div>
                <label className="text-xs font-semibold text-qcloud-text block mb-2">IBM API Key</label>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${submitKeyChoice === 'platform' ? 'border-qcloud-primary bg-blue-50/50' : 'border-qcloud-border hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="apiKeyChoice"
                      checked={submitKeyChoice === 'platform'}
                      onChange={() => setSubmitKeyChoice('platform')}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium text-qcloud-text">Use platform key</span>
                      <p className="text-[10px] text-qcloud-muted mt-0.5">Use the course-provided IBM API key. Job time is deducted from your budget.</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${submitKeyChoice === 'own' ? 'border-qcloud-primary bg-blue-50/50' : 'border-qcloud-border hover:bg-gray-50'} ${!customApiKey.trim() ? 'opacity-50' : ''}`}>
                    <input
                      type="radio"
                      name="apiKeyChoice"
                      checked={submitKeyChoice === 'own'}
                      onChange={() => { if (customApiKey.trim()) setSubmitKeyChoice('own') }}
                      disabled={!customApiKey.trim()}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium text-qcloud-text">Use my own key</span>
                      {customApiKey.trim() ? (
                        <p className="text-[10px] text-green-600 mt-0.5">Your personal IBM key will be used. Key: ****{customApiKey.slice(-4)}</p>
                      ) : (
                        <p className="text-[10px] text-qcloud-muted mt-0.5">No personal key configured. Set it in the sidebar under "Your IBM API Key".</p>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-qcloud-border bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-sm text-qcloud-muted hover:text-qcloud-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitConfirm}
                className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 transition-colors"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      </>
      )}
    </div>
  )
}

function HardwareInfoModal({
  selectedBackend,
  initialLayout,
  code,
  editorMode,
  onClose,
  onLayoutChange,
}: {
  selectedBackend: string
  initialLayout: string
  code: string
  editorMode: string
  onClose: () => void
  onLayoutChange: (layout: string) => void
}) {
  const provider = findProviderByBackend(selectedBackend)
  const calibData = getCalibrationData(selectedBackend)

  // Local layout state for the input box, initialized from code/composer state
  const getInitialLayoutStr = () => {
    // Check initialLayout first (set by the Layout button click handler)
    if (initialLayout.trim()) return initialLayout.trim()
    // Fallback: parse code for uncommented INITIAL_LAYOUT lines
    if (editorMode === 'code') {
      const match = code.match(/^[^#\n]*INITIAL_LAYOUT\s*=\s*\[([^\]]*)\]/m)
      if (match) return match[1].trim()
    }
    return ''
  }
  const [localLayout, setLocalLayout] = useState(getInitialLayoutStr)

  // Parse layout string into qubit arrays
  const { layoutQubits, layoutLabels } = useMemo(() => {
    const qubits: number[] = []
    const labels: Record<number, string> = {}
    if (localLayout.trim()) {
      const nums = localLayout.replace(/[\[\]]/g, '').split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
      nums.forEach((physQ, logQ) => {
        qubits.push(physQ)
        labels[physQ] = String(logQ)
      })
    }
    return { layoutQubits: qubits, layoutLabels: labels }
  }, [localLayout])

  const handleApplyLayout = () => {
    onLayoutChange(localLayout)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-qcloud-border flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-qcloud-text">Hardware Details</h3>
            {calibData && (
              <p className="text-xs text-qcloud-muted mt-0.5">
                Calibration: {calibData.calibrationDate.replace('T', ' ').replace('Z', ' UTC')}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-qcloud-muted hover:text-red-500 text-lg">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1">
          {provider ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-qcloud-text">{provider.name}</h4>
                  <span className="text-sm text-qcloud-muted">{provider.company}</span>
                </div>
                <span className="text-2xl font-bold text-qcloud-primary">{provider.qubits} qubits</span>
              </div>
              <p className="text-sm text-qcloud-muted leading-relaxed">{provider.description}</p>
              <div className="flex flex-wrap gap-2">
                {provider.features.map((f, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">{f}</span>
                ))}
              </div>

              {/* INITIAL_LAYOUT input */}
              {calibData && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-semibold text-qcloud-text whitespace-nowrap">INITIAL_LAYOUT:</label>
                    <input
                      type="text"
                      value={localLayout}
                      onChange={(e) => setLocalLayout(e.target.value)}
                      placeholder="e.g. 0, 1, 2, 3"
                      className="flex-1 px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    />
                    <button
                      onClick={handleApplyLayout}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors whitespace-nowrap"
                    >
                      Apply to Code
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Maps logical qubits to physical qubits. Hover qubits on the topology to check error rates, then enter the physical qubit IDs.
                  </p>
                </div>
              )}

              {/* Hardware Topology Visualization */}
              {calibData && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-qcloud-text">Qubit Topology</h5>
                    <span className="text-xs text-qcloud-muted">Hover qubits for error details</span>
                  </div>
                  <HardwareTopology
                    data={calibData}
                    highlightedQubits={layoutQubits}
                    highlightLabels={layoutLabels}
                    width={800}
                    height={460}
                  />
                  {layoutQubits.length > 0 && (
                    <p className="text-xs text-amber-600 mt-2 font-medium">
                      INITIAL_LAYOUT: [{layoutQubits.map((pq, i) => `q${i} → Q${pq}`).join(', ')}]
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-qcloud-border">
                <div>
                  <span className="text-qcloud-muted">Type</span>
                  <p className="font-medium capitalize">{provider.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-qcloud-muted">Backend ID</span>
                  <p className="font-mono font-medium">{provider.backendName}</p>
                </div>
                {provider.pricing && (
                  <div>
                    <span className="text-qcloud-muted">Pricing</span>
                    <p className="font-medium">{provider.pricing}</p>
                  </div>
                )}
              </div>
              {provider.docsUrl && (
                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full mt-4 px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium text-center hover:bg-blue-500 transition-colors"
                >
                  View {provider.backendName} on IBM Quantum — topology, error rates, calibration
                </a>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-qcloud-muted">
              <p className="text-sm">No detailed info available for <span className="font-mono">{selectedBackend}</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HomeworkPage

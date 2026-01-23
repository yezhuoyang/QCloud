import { useState, useCallback, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import GateToolbar from '../components/circuit/GateToolbar'
import CircuitCanvas from '../components/circuit/CircuitCanvas'
import ParameterModal, { QubitSelectionModal, ConditionalGateModal } from '../components/circuit/ParameterModal'
import IdentityRulesPanel from '../components/circuit/IdentityRulesPanel'
import CreateRuleModal from '../components/circuit/CreateRuleModal'
import { Circuit, GateType, PlacedGate, GateCondition, GATE_DEFINITIONS, createEmptyCircuit, generateGateId } from '../types/circuit'
import { IdentityRule, PatternMatch, CircuitHistoryEntry } from '../types/identityRules'
import { BUILTIN_IDENTITY_RULES } from '../data/builtinRules'
import { PatternMatcher } from '../utils/patternMatcher'
import { RuleApplicator, describeRuleApplication } from '../utils/ruleApplicator'
import { compileToQiskit } from '../utils/circuitCompiler'
import { simulateCircuit, SimulationResult } from '../utils/simulationService'
import { SimulationModal } from '../components/SimulationResults'
import { hardwareApi } from '../utils/api'

type SubmitTarget = 'qiskit_aer' | 'browser' | 'hardware'

// IBM Hardware options
const ibmHardwareOptions = [
  { id: 'ibm_fez', name: 'IBM Fez', qubits: 156, status: 'online' as const },
  { id: 'ibm_marrakesh', name: 'IBM Marrakesh', qubits: 156, status: 'online' as const },
  { id: 'ibm_torino', name: 'IBM Torino', qubits: 133, status: 'online' as const },
  { id: 'ibm_brisbane', name: 'IBM Brisbane', qubits: 127, status: 'online' as const },
  { id: 'ibm_brussels', name: 'IBM Brussels', qubits: 127, status: 'online' as const },
  { id: 'ibm_kawasaki', name: 'IBM Kawasaki', qubits: 127, status: 'online' as const },
  { id: 'ibm_kyiv', name: 'IBM Kyiv', qubits: 127, status: 'online' as const },
  { id: 'ibm_quebec', name: 'IBM Quebec', qubits: 127, status: 'online' as const },
  { id: 'ibm_sherbrooke', name: 'IBM Sherbrooke', qubits: 127, status: 'online' as const },
]

function CircuitComposerPage() {
  const navigate = useNavigate()

  // Circuit state
  const [circuit, setCircuit] = useState<Circuit>(createEmptyCircuit(3))

  // Dragging state
  const [draggingGate, setDraggingGate] = useState<GateType | null>(null)

  // Identity rules state
  const [selectedGates, setSelectedGates] = useState<Set<string>>(new Set())
  const [highlightedMatches, setHighlightedMatches] = useState<PatternMatch[]>([])
  const [userRules, setUserRules] = useState<IdentityRule[]>(() => {
    const saved = localStorage.getItem('qcloud-user-rules')
    return saved ? JSON.parse(saved) : []
  })

  // Undo/Redo state
  const [circuitHistory, setCircuitHistory] = useState<CircuitHistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Create pattern matcher and rule applicator
  const allRules = useMemo(() => [...BUILTIN_IDENTITY_RULES, ...userRules], [userRules])
  const patternMatcher = useMemo(() => new PatternMatcher(allRules), [allRules])
  const ruleApplicator = useMemo(() => new RuleApplicator(), [])

  // Save user rules to localStorage
  useEffect(() => {
    localStorage.setItem('qcloud-user-rules', JSON.stringify(userRules))
  }, [userRules])

  // Push to history (for undo support)
  const pushHistory = useCallback((newCircuit: Circuit, description: string) => {
    setCircuitHistory(prev => [
      ...prev.slice(0, historyIndex + 1),
      { circuit: newCircuit, description, timestamp: Date.now() }
    ])
    setHistoryIndex(prev => prev + 1)
  }, [historyIndex])

  // Undo handler
  const handleUndo = useCallback(() => {
    if (historyIndex >= 0) {
      const entry = circuitHistory[historyIndex]
      if (entry) {
        setCircuit(entry.circuit)
        setHistoryIndex(prev => prev - 1)
        setSelectedGates(new Set())
        setHighlightedMatches([])
      }
    }
  }, [historyIndex, circuitHistory])

  // Redo handler
  const handleRedo = useCallback(() => {
    if (historyIndex < circuitHistory.length - 1) {
      const entry = circuitHistory[historyIndex + 1]
      if (entry) {
        setCircuit(entry.circuit)
        setHistoryIndex(prev => prev + 1)
        setSelectedGates(new Set())
        setHighlightedMatches([])
      }
    }
  }, [historyIndex, circuitHistory])

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
        e.preventDefault()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        handleRedo()
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  // Modal states
  const [paramModal, setParamModal] = useState<{
    isOpen: boolean
    gateType: GateType | null
    qubitIndex: number
    column: number
  }>({ isOpen: false, gateType: null, qubitIndex: 0, column: 0 })

  const [qubitModal, setQubitModal] = useState<{
    isOpen: boolean
    gateType: GateType | null
    column: number
    pendingParams?: number[]
  }>({ isOpen: false, gateType: null, column: 0 })

  const [conditionalModal, setConditionalModal] = useState<{
    isOpen: boolean
    qubitIndex: number
    column: number
  }>({ isOpen: false, qubitIndex: 0, column: 0 })

  // Custom rule modal state
  const [createRuleModal, setCreateRuleModal] = useState<{
    isOpen: boolean
    editRule?: IdentityRule
  }>({ isOpen: false })

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [showSimulationResults, setShowSimulationResults] = useState(false)

  // Target selection state
  const [submitTarget, setSubmitTarget] = useState<SubmitTarget>('qiskit_aer')
  const [selectedHardware, setSelectedHardware] = useState(ibmHardwareOptions[0])
  const [showTargetMenu, setShowTargetMenu] = useState(false)
  const [hardwareStatus, setHardwareStatus] = useState<string | null>(null)

  // Handle gate drag start
  const handleGateDragStart = useCallback((gateType: GateType) => {
    setDraggingGate(gateType)
  }, [])

  // Find the next available column at a qubit position
  const findNextColumn = useCallback((qubits: number[]): number => {
    let maxColumn = -1
    circuit.gates.forEach(gate => {
      if (gate.qubits.some(q => qubits.includes(q))) {
        maxColumn = Math.max(maxColumn, gate.column)
      }
    })
    return maxColumn + 1
  }, [circuit.gates])

  // Add a gate to the circuit
  const addGate = useCallback((
    gateType: GateType,
    qubits: number[],
    column: number,
    params?: number[],
    classicalBit?: number,
    condition?: GateCondition
  ) => {
    const newGate: PlacedGate = {
      id: generateGateId(),
      type: gateType,
      qubits,
      column,
      params,
      classicalBit,
      condition
    }

    setCircuit(prev => ({
      ...prev,
      gates: [...prev.gates, newGate]
    }))
  }, [])

  // Handle dropping a gate on the canvas
  const handleDropGate = useCallback((gateType: GateType, qubitIndex: number, column: number) => {
    const gate = GATE_DEFINITIONS[gateType]
    setDraggingGate(null)

    // Handle IF_ELSE specially - open conditional gate modal
    if (gateType === 'IF_ELSE') {
      setConditionalModal({
        isOpen: true,
        qubitIndex,
        column
      })
      return
    }

    // Handle BARRIER - applies to all qubits
    if (gateType === 'BARRIER') {
      const allQubits = Array.from({ length: circuit.numQubits }, (_, i) => i)
      addGate(gateType, allQubits, column)
      return
    }

    // Single-qubit gate
    if (gate.numQubits === 1) {
      // Check if gate needs parameters
      if (gate.numParams > 0) {
        setParamModal({
          isOpen: true,
          gateType,
          qubitIndex,
          column
        })
      } else {
        // For measurement, also set classical bit
        const classicalBit = gateType === 'MEASURE' ? qubitIndex : undefined
        addGate(gateType, [qubitIndex], column, undefined, classicalBit)
      }
    }
    // Multi-qubit gate
    else {
      // Check if gate needs parameters first
      if (gate.numParams > 0) {
        setParamModal({
          isOpen: true,
          gateType,
          qubitIndex,
          column
        })
      } else {
        setQubitModal({
          isOpen: true,
          gateType,
          column
        })
      }
    }
  }, [addGate, circuit.numQubits])

  // Handle parameter modal confirm
  const handleParamConfirm = useCallback((params: number[]) => {
    const { gateType, qubitIndex, column } = paramModal
    if (!gateType) return

    const gate = GATE_DEFINITIONS[gateType]

    if (gate.numQubits === 1) {
      addGate(gateType, [qubitIndex], column, params)
    } else {
      // Multi-qubit parameterized gate - need to select qubits
      setQubitModal({
        isOpen: true,
        gateType,
        column,
        pendingParams: params
      })
    }

    setParamModal({ isOpen: false, gateType: null, qubitIndex: 0, column: 0 })
  }, [paramModal, addGate])

  // Handle qubit selection modal confirm
  const handleQubitConfirm = useCallback((qubits: number[]) => {
    const { gateType, pendingParams } = qubitModal
    if (!gateType) return

    const actualColumn = findNextColumn(qubits)
    addGate(gateType, qubits, actualColumn, pendingParams)

    setQubitModal({ isOpen: false, gateType: null, column: 0 })
  }, [qubitModal, addGate, findNextColumn])

  // Handle gate removal
  const handleRemoveGate = useCallback((gateId: string) => {
    setCircuit(prev => ({
      ...prev,
      gates: prev.gates.filter(g => g.id !== gateId)
    }))
  }, [])

  // Handle moving a gate to a new position
  const handleMoveGate = useCallback((gateId: string, newQubitIndex: number, newColumn: number) => {
    setCircuit(prev => {
      const gateToMove = prev.gates.find(g => g.id === gateId)
      if (!gateToMove) return prev

      // For single-qubit gates, update qubit and column
      if (gateToMove.qubits.length === 1) {
        return {
          ...prev,
          gates: prev.gates.map(g =>
            g.id === gateId
              ? {
                  ...g,
                  qubits: [newQubitIndex],
                  column: newColumn,
                  // Update classical bit for measurement if moved
                  classicalBit: g.type === 'MEASURE' ? newQubitIndex : g.classicalBit
                }
              : g
          )
        }
      }

      // For multi-qubit gates, we'd need more complex logic
      // For now, just update the column
      return {
        ...prev,
        gates: prev.gates.map(g =>
          g.id === gateId
            ? { ...g, column: newColumn }
            : g
        )
      }
    })
  }, [])

  // Handle conditional gate modal confirm
  const handleConditionalConfirm = useCallback((gateType: GateType, condition: GateCondition) => {
    const { qubitIndex, column } = conditionalModal
    const gate = GATE_DEFINITIONS[gateType]

    // For parameterized gates, we need to collect params first
    if (gate.numParams > 0) {
      setParamModal({
        isOpen: true,
        gateType,
        qubitIndex,
        column
      })
      // Store the condition for later use
      // We'll need to modify param modal to pass condition through
      // For now, add gate with default params and condition
      addGate(gateType, [qubitIndex], column, [Math.PI / 2], undefined, condition)
    } else {
      addGate(gateType, [qubitIndex], column, undefined, undefined, condition)
    }

    setConditionalModal({ isOpen: false, qubitIndex: 0, column: 0 })
  }, [conditionalModal, addGate])

  // Circuit controls
  const addQubit = () => {
    setCircuit(prev => ({
      ...prev,
      numQubits: prev.numQubits + 1,
      numClassicalBits: prev.numClassicalBits + 1
    }))
  }

  const removeQubit = () => {
    if (circuit.numQubits <= 1) return

    const newNumQubits = circuit.numQubits - 1
    setCircuit(prev => ({
      ...prev,
      numQubits: newNumQubits,
      numClassicalBits: newNumQubits,
      gates: prev.gates.filter(g => g.qubits.every(q => q < newNumQubits))
    }))
  }

  const clearCircuit = () => {
    setCircuit(prev => ({
      ...prev,
      gates: []
    }))
  }

  // Compile and open in editor
  const compileAndOpen = () => {
    const code = compileToQiskit(circuit)
    navigate('/editor', { state: { code, name: 'Circuit Composer' } })
  }

  // Run simulation
  const runSimulation = async () => {
    if (circuit.gates.length === 0) return

    setIsSimulating(true)

    if (submitTarget === 'hardware') {
      // Submit to quantum hardware
      try {
        const code = compileToQiskit(circuit)
        const response = await hardwareApi.run(code, {
          backend: selectedHardware.id,
          shots: 1024
        })
        setHardwareStatus('queued')
        // Poll for job status
        const pollStatus = async () => {
          if (!response.job_id) return
          const status = await hardwareApi.getStatus(response.job_id)
          setHardwareStatus(status.status || 'pending')
          if (status.status === 'completed' && status.measurements) {
            setSimulationResult({
              measurements: status.measurements || {},
              probabilities: status.probabilities || {},
              numQubits: circuit.numQubits,
              gateCount: circuit.gates.length,
              circuitDepth: circuit.gates.length,
              shots: status.shots || 1024,
              executionTime: status.executionTime || 0,
              success: true
            })
            setShowSimulationResults(true)
            setIsSimulating(false)
          } else if (status.status === 'failed') {
            setIsSimulating(false)
          } else {
            setTimeout(pollStatus, 5000)
          }
        }
        setTimeout(pollStatus, 2000)
      } catch (error) {
        console.error('Hardware submission failed:', error)
        setIsSimulating(false)
      }
    } else {
      // Local simulation (browser or qiskit_aer)
      await new Promise(resolve => setTimeout(resolve, 100)) // Small delay for UX
      const result = simulateCircuit(circuit, { shots: 1024, includeStateVector: true })
      setSimulationResult(result)
      setShowSimulationResults(true)
      setIsSimulating(false)
    }
  }

  // Handle applying a rule to a match
  const handleApplyRule = useCallback((ruleId: string, match: PatternMatch) => {
    const rule = patternMatcher.getRule(ruleId)
    if (!rule) return

    // Save current state for undo
    pushHistory(circuit, describeRuleApplication(rule, match))

    // Apply the rule
    const newCircuit = ruleApplicator.applyRule(circuit, match, rule)
    setCircuit(newCircuit)
    setSelectedGates(new Set())
    setHighlightedMatches([])
  }, [circuit, patternMatcher, ruleApplicator, pushHistory])

  // Handle applying a rule to all matches
  const handleApplyAllMatches = useCallback((ruleId: string, matches: PatternMatch[]) => {
    const rule = patternMatcher.getRule(ruleId)
    if (!rule || matches.length === 0) return

    // Save current state for undo
    pushHistory(circuit, `Apply "${rule.name}" to ${matches.length} matches`)

    // Apply the rule to all matches
    const newCircuit = ruleApplicator.applyAllMatches(circuit, matches, rule)
    setCircuit(newCircuit)
    setSelectedGates(new Set())
    setHighlightedMatches([])
  }, [circuit, patternMatcher, ruleApplicator, pushHistory])

  // Handle highlighting matches
  const handleHighlightMatches = useCallback((matches: PatternMatch[]) => {
    setHighlightedMatches(matches)
    setSelectedGates(new Set())
  }, [])

  // Handle clicking on a highlighted match
  const handleMatchClick = useCallback((match: PatternMatch) => {
    setSelectedGates(new Set(match.gateIds))
  }, [])

  // Handle selection change from canvas
  const handleSelectionChange = useCallback((newSelection: Set<string>) => {
    setSelectedGates(newSelection)
    // Clear highlights when user starts selecting manually
    if (newSelection.size > 0) {
      setHighlightedMatches([])
    }
  }, [])

  // Handle opening the custom rule modal
  const handleAddCustomRule = useCallback(() => {
    setCreateRuleModal({ isOpen: true })
  }, [])

  // Handle creating a new custom rule
  const handleCreateRule = useCallback((ruleData: Omit<IdentityRule, 'id' | 'isBuiltin'>) => {
    const newRule: IdentityRule = {
      ...ruleData,
      id: `custom-${Date.now()}`,
      isBuiltin: false
    }
    setUserRules(prev => [...prev, newRule])
    setCreateRuleModal({ isOpen: false })
  }, [])

  return (
    <div className="min-h-screen bg-qcloud-bg flex flex-col">
      {/* Header */}
      <header className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-qcloud-border bg-white">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80">
            <Logo size="small" />
            <span className="font-semibold text-lg text-qcloud-text">QCloud</span>
          </Link>
          <Link
            to="/editor"
            className="text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors"
          >
            Code Editor
          </Link>
          <Link
            to="/competition"
            className="text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors"
          >
            Challenges
          </Link>
          <Link
            to="/applications"
            className="text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors"
          >
            Examples
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Target Selector */}
          <div className="relative">
            <button
              onClick={() => setShowTargetMenu(!showTargetMenu)}
              className="flex items-center gap-2 px-3 py-2 border border-qcloud-border rounded-md text-sm text-qcloud-text hover:bg-qcloud-bg transition-colors"
            >
              {submitTarget === 'qiskit_aer' ? (
                <>
                  <span>🔬</span>
                  <span>Qiskit Aer</span>
                </>
              ) : submitTarget === 'browser' ? (
                <>
                  <span>🌐</span>
                  <span>Browser</span>
                </>
              ) : (
                <>
                  <span>⚛️</span>
                  <span>{selectedHardware.name}</span>
                </>
              )}
              <svg className="w-4 h-4 text-qcloud-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showTargetMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTargetMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-qcloud-border rounded-lg shadow-lg z-20 min-w-[220px]">
                  <button
                    onClick={() => { setSubmitTarget('qiskit_aer'); setShowTargetMenu(false) }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-qcloud-bg transition-colors ${
                      submitTarget === 'qiskit_aer' ? 'text-qcloud-primary' : 'text-qcloud-text'
                    }`}
                  >
                    <span>🔬</span>
                    <div className="text-left">
                      <div className="font-medium">Qiskit Aer</div>
                      <div className="text-xs text-qcloud-muted">Python backend</div>
                    </div>
                    {submitTarget === 'qiskit_aer' && (
                      <svg className="w-4 h-4 ml-auto text-qcloud-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => { setSubmitTarget('browser'); setShowTargetMenu(false) }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-qcloud-bg transition-colors border-t border-qcloud-border ${
                      submitTarget === 'browser' ? 'text-qcloud-primary' : 'text-qcloud-text'
                    }`}
                  >
                    <span>🌐</span>
                    <div className="text-left">
                      <div className="font-medium">Browser</div>
                      <div className="text-xs text-qcloud-muted">Local JavaScript</div>
                    </div>
                    {submitTarget === 'browser' && (
                      <svg className="w-4 h-4 ml-auto text-qcloud-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <div className="border-t border-qcloud-border">
                    <div className="px-4 py-2 text-xs text-qcloud-muted font-medium bg-qcloud-bg">
                      ⚛️ Hardware
                    </div>
                    {ibmHardwareOptions.map((hw) => (
                      <button
                        key={hw.id}
                        onClick={() => {
                          setSubmitTarget('hardware')
                          setSelectedHardware(hw)
                          setShowTargetMenu(false)
                        }}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-qcloud-bg transition-colors ${
                          submitTarget === 'hardware' && selectedHardware.id === hw.id ? 'text-purple-600' : 'text-qcloud-text'
                        }`}
                      >
                        <div className="text-left flex-1">
                          <div className="font-medium">{hw.name}</div>
                          <div className="text-xs text-qcloud-muted">{hw.qubits} qubits</div>
                        </div>
                        {submitTarget === 'hardware' && selectedHardware.id === hw.id && (
                          <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Run Button */}
          <button
            onClick={runSimulation}
            disabled={isSimulating || circuit.gates.length === 0}
            className={`px-4 py-2 rounded-md text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 ${
              submitTarget === 'hardware'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                : 'bg-gradient-to-r from-green-500 to-emerald-500'
            }`}
          >
            {isSimulating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{hardwareStatus ? `${hardwareStatus}...` : 'Running...'}</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <span>{submitTarget === 'hardware' ? 'Run on Hardware' : 'Run Simulator'}</span>
              </>
            )}
          </button>

          {/* Compile to Qiskit Button */}
          <button
            onClick={compileAndOpen}
            className="px-4 py-2 bg-gradient-to-r from-qcloud-primary to-qcloud-secondary rounded-md text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Open in Editor
          </button>
        </div>
      </header>

      {/* Gate Toolbar */}
      <GateToolbar onGateDragStart={handleGateDragStart} />

      {/* Main Content - Flex row with canvas area and rules panel */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left side - Circuit area */}
        <div className="flex-1 overflow-auto p-4">
          {/* Circuit Controls */}
          <div className="mb-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-qcloud-muted">Qubits:</span>
              <button
                onClick={removeQubit}
                disabled={circuit.numQubits <= 1}
                className="w-8 h-8 rounded border border-qcloud-border hover:bg-qcloud-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-qcloud-text"
              >
                -
              </button>
              <span className="w-8 text-center font-mono text-qcloud-text">{circuit.numQubits}</span>
              <button
                onClick={addQubit}
                disabled={circuit.numQubits >= 10}
                className="w-8 h-8 rounded border border-qcloud-border hover:bg-qcloud-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-qcloud-text"
              >
                +
              </button>
            </div>

            <div className="h-6 w-px bg-qcloud-border" />

            <button
              onClick={clearCircuit}
              className="px-3 py-1 text-sm text-red-500 hover:bg-red-50 rounded transition-colors"
            >
              Clear Circuit
            </button>

            {/* Undo/Redo buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleUndo}
                disabled={historyIndex < 0}
                className="w-8 h-8 rounded border border-qcloud-border hover:bg-qcloud-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-qcloud-text flex items-center justify-center"
                title="Undo (Ctrl+Z)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= circuitHistory.length - 1}
                className="w-8 h-8 rounded border border-qcloud-border hover:bg-qcloud-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-qcloud-text flex items-center justify-center"
                title="Redo (Ctrl+Y)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                </svg>
              </button>
            </div>

            <div className="ml-auto text-sm text-qcloud-muted">
              {circuit.gates.length} gate{circuit.gates.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Circuit Canvas */}
          <CircuitCanvas
            circuit={circuit}
            onDropGate={handleDropGate}
            onRemoveGate={handleRemoveGate}
            onMoveGate={handleMoveGate}
            draggingGate={draggingGate}
            selectedGates={selectedGates}
            onSelectionChange={handleSelectionChange}
            highlightedMatches={highlightedMatches}
            onMatchClick={handleMatchClick}
          />

          {/* Instructions - Condensed */}
          <div className="mt-4 p-4 bg-white rounded-lg border border-qcloud-border">
            <h3 className="font-semibold text-qcloud-text mb-2">Quick Guide:</h3>
            <ul className="text-sm text-qcloud-muted grid grid-cols-2 gap-x-4 gap-y-1">
              <li>• Drag gates from toolbar to circuit</li>
              <li>• Ctrl+click to multi-select gates</li>
              <li>• Use Identity Rules panel to simplify</li>
              <li>• Ctrl+Z to undo, Ctrl+Y to redo</li>
            </ul>
          </div>

          {/* Code Preview */}
          {circuit.gates.length > 0 && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-qcloud-border">
              <h3 className="font-semibold text-qcloud-text mb-2">Generated Code Preview:</h3>
              <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-sm font-mono text-slate-300 max-h-48">
                {compileToQiskit(circuit)}
              </pre>
            </div>
          )}
        </div>

        {/* Right side - Identity Rules Panel */}
        <div className="w-80 flex-shrink-0">
          <IdentityRulesPanel
            circuit={circuit}
            selectedGates={selectedGates}
            userRules={userRules}
            onApplyRule={handleApplyRule}
            onHighlightMatches={handleHighlightMatches}
            onApplyAllMatches={handleApplyAllMatches}
            onAddCustomRule={handleAddCustomRule}
          />
        </div>
      </main>

      {/* Parameter Modal */}
      {paramModal.gateType && (
        <ParameterModal
          isOpen={paramModal.isOpen}
          gateType={paramModal.gateType}
          onConfirm={handleParamConfirm}
          onCancel={() => setParamModal({ isOpen: false, gateType: null, qubitIndex: 0, column: 0 })}
        />
      )}

      {/* Qubit Selection Modal */}
      {qubitModal.gateType && (
        <QubitSelectionModal
          isOpen={qubitModal.isOpen}
          gateType={qubitModal.gateType}
          numQubits={circuit.numQubits}
          onConfirm={handleQubitConfirm}
          onCancel={() => setQubitModal({ isOpen: false, gateType: null, column: 0 })}
        />
      )}

      {/* Conditional Gate Modal */}
      <ConditionalGateModal
        isOpen={conditionalModal.isOpen}
        numClassicalBits={circuit.numClassicalBits}
        availableGates={['X', 'Y', 'Z', 'H', 'S', 'T', 'RX', 'RY', 'RZ']}
        onConfirm={handleConditionalConfirm}
        onCancel={() => setConditionalModal({ isOpen: false, qubitIndex: 0, column: 0 })}
      />

      {/* Create Custom Rule Modal */}
      <CreateRuleModal
        isOpen={createRuleModal.isOpen}
        onConfirm={handleCreateRule}
        onCancel={() => setCreateRuleModal({ isOpen: false })}
        editRule={createRuleModal.editRule}
      />

      {/* Simulation Results Modal */}
      <SimulationModal
        result={simulationResult}
        isOpen={showSimulationResults}
        onClose={() => setShowSimulationResults(false)}
      />
    </div>
  )
}

export default CircuitComposerPage

import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import CodeEditor from '../components/CodeEditor'
import Logo from '../components/Logo'
import { DEFAULT_QISKIT_CODE } from '../utils/sampleCode'
import { simulateCode, SimulationResult as LocalSimulationResult } from '../utils/simulationService'
import { simulatorApi, hardwareApi } from '../utils/api'
import { SimulationModal } from '../components/SimulationResults'
import { useAuth } from '../contexts/AuthContext'

// Combined simulation result type
type SimulationResult = LocalSimulationResult

interface LocationState {
  code?: string
  name?: string
}

type SubmitTarget = 'qiskit_aer' | 'browser' | 'hardware'

// IBM Quantum hardware options
const ibmHardwareOptions = [
  { id: 'ibm_boston', name: 'IBM Boston', qubits: 156, processor: 'Heron r3', isNew: true },
  { id: 'ibm_pittsburgh', name: 'IBM Pittsburgh', qubits: 156, processor: 'Heron r3', isNew: false },
  { id: 'ibm_kingston', name: 'IBM Kingston', qubits: 156, processor: 'Heron r2', isNew: false },
  { id: 'ibm_fez', name: 'IBM Fez', qubits: 156, processor: 'Heron r2', isNew: false },
  { id: 'ibm_marrakesh', name: 'IBM Marrakesh', qubits: 156, processor: 'Heron r2', isNew: false },
  { id: 'ibm_torino', name: 'IBM Torino', qubits: 133, processor: 'Heron r1', isNew: false },
  { id: 'ibm_miami', name: 'IBM Miami', qubits: 120, processor: 'Nighthawk r1', isNew: false },
]

function EditorPage() {
  const location = useLocation()
  const state = location.state as LocationState | null
  const { user } = useAuth()

  const [code, setCode] = useState(state?.code || DEFAULT_QISKIT_CODE)
  const [fileName, setFileName] = useState(state?.name ? `${state.name.toLowerCase().replace(/\s+/g, '_')}.py` : 'quantum_circuit.py')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitTarget, setSubmitTarget] = useState<SubmitTarget>('qiskit_aer')
  const [selectedHardware, setSelectedHardware] = useState(ibmHardwareOptions[0]) // Default to IBM Boston
  const [showTargetMenu, setShowTargetMenu] = useState(false)
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [hardwareJobId, setHardwareJobId] = useState<string | null>(null)
  const [hardwareStatus, setHardwareStatus] = useState<string | null>(null)

  // Load selected hardware from localStorage (set from Hardware page)
  useEffect(() => {
    const stored = localStorage.getItem('qcloud_selected_hardware')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const hardware = ibmHardwareOptions.find(h => h.id === parsed.id)
        if (hardware) {
          setSelectedHardware(hardware)
          setSubmitTarget('hardware')
        }
        // Clear after loading
        localStorage.removeItem('qcloud_selected_hardware')
      } catch {
        // ignore
      }
    }
  }, [])

  // Update code when navigating from applications page
  useEffect(() => {
    if (state?.code) {
      setCode(state.code)
      setFileName(state.name ? `${state.name.toLowerCase().replace(/\s+/g, '_')}.py` : 'quantum_circuit.py')
    }
  }, [state])

  const handleSubmit = async () => {
    setIsSubmitting(true)

    if (submitTarget === 'qiskit_aer') {
      // Use backend Qiskit Aer simulator
      try {
        const apiResult = await simulatorApi.run(code, { shots: 1024, includeStatevector: true })

        if (apiResult.success) {
          // Convert API result to local format
          const result: SimulationResult = {
            success: true,
            measurements: apiResult.measurements || {},
            probabilities: apiResult.probabilities || {},
            numQubits: apiResult.qubitCount || 0,
            gateCount: apiResult.gateCount || 0,
            circuitDepth: apiResult.circuitDepth || 0,
            executionTime: apiResult.executionTime || 0,
            shots: apiResult.shots || 1024,
            stateVector: apiResult.statevector?.map(([re, im]) => ({ re, im })),
            backend: 'aer_simulator'
          }
          setSimulationResult(result)
          setShowResults(true)
        } else {
          // API returned error
          const result: SimulationResult = {
            success: false,
            error: apiResult.error || 'Qiskit Aer simulation failed',
            measurements: {},
            probabilities: {},
            numQubits: 0,
            gateCount: 0,
            circuitDepth: 0,
            executionTime: 0,
            shots: 0,
            backend: 'aer_simulator'
          }
          setSimulationResult(result)
          setShowResults(true)
        }
      } catch (error) {
        // Backend unavailable
        const result: SimulationResult = {
          success: false,
          error: 'Qiskit Aer backend is unavailable. Please try Browser simulator or check backend status.',
          measurements: {},
          probabilities: {},
          numQubits: 0,
          gateCount: 0,
          circuitDepth: 0,
          executionTime: 0,
          shots: 0,
          backend: 'aer_simulator'
        }
        setSimulationResult(result)
        setShowResults(true)
      }
      setIsSubmitting(false)
    } else if (submitTarget === 'browser') {
      // Use local browser-based simulator
      const result = simulateCode(code, { shots: 1024, includeStateVector: true })
      setSimulationResult({ ...result, backend: 'browser' })
      setShowResults(true)
      setIsSubmitting(false)
    } else {
      // Submit to real IBM Quantum hardware
      try {
        // Load user's IBM credentials from localStorage
        let ibmCredentials: { token?: string; channel?: string; instance?: string } = {}
        const storedCreds = localStorage.getItem('qcloud_creds_ibm')
        if (storedCreds) {
          try {
            const parsed = JSON.parse(storedCreds)
            ibmCredentials = {
              token: parsed.token,
              channel: parsed.channel,
              instance: parsed.instance
            }
          } catch {
            // ignore
          }
        }

        // Check if credentials are configured
        if (!ibmCredentials.token) {
          const result: SimulationResult = {
            success: false,
            error: 'IBM Quantum credentials not configured. Please go to Hardware page and configure your API token first.',
            measurements: {},
            probabilities: {},
            numQubits: 0,
            gateCount: 0,
            circuitDepth: 0,
            executionTime: 0,
            shots: 0,
            backend: selectedHardware.id
          }
          setSimulationResult(result)
          setShowResults(true)
          setIsSubmitting(false)
          return
        }

        setHardwareStatus(`Submitting to ${selectedHardware.name}...`)

        const hwResult = await hardwareApi.run(code, {
          backend: selectedHardware.id,
          shots: 1024,
          waitForResult: false,
          ...ibmCredentials,
          user_id: user?.id
        })

        if (hwResult.success && hwResult.job_id) {
          setHardwareJobId(hwResult.job_id)
          setHardwareStatus(`Job submitted! ID: ${hwResult.job_id}`)

          // Poll for results
          let pollCount = 0
          const maxPolls = 120 // 10 minutes max
          const pollInterval = 5000 // 5 seconds

          const pollForResult = async () => {
            try {
              const statusResult = await hardwareApi.getStatus(hwResult.job_id!, ibmCredentials)

              if (statusResult.status === 'completed') {
                // Job completed - show results
                const result: SimulationResult = {
                  success: true,
                  measurements: statusResult.measurements || {},
                  probabilities: statusResult.probabilities || {},
                  numQubits: hwResult.qubitCount || 0,
                  gateCount: hwResult.gateCount || 0,
                  circuitDepth: hwResult.circuitDepth || 0,
                  executionTime: 0,
                  shots: hwResult.shots || 1024,
                  backend: `ibm_hardware (${hwResult.backend})`
                }
                setSimulationResult(result)
                setShowResults(true)
                setIsSubmitting(false)
                setHardwareStatus(null)
                setHardwareJobId(null)
              } else if (statusResult.status === 'failed' || statusResult.status === 'error' || !statusResult.success) {
                // Job failed or status check failed
                const result: SimulationResult = {
                  success: false,
                  error: statusResult.error || 'Hardware job failed. Check your IBM Quantum credentials and try again.',
                  measurements: {},
                  probabilities: {},
                  numQubits: 0,
                  gateCount: 0,
                  circuitDepth: 0,
                  executionTime: 0,
                  shots: 0,
                  backend: 'ibm_hardware'
                }
                setSimulationResult(result)
                setShowResults(true)
                setIsSubmitting(false)
                setHardwareStatus(null)
                setHardwareJobId(null)
              } else {
                // Still running
                pollCount++
                setHardwareStatus(`Job ${statusResult.status}... (${pollCount * 5}s)`)
                if (pollCount < maxPolls) {
                  setTimeout(pollForResult, pollInterval)
                } else {
                  // Timeout - but job might still complete
                  setIsSubmitting(false)
                  setHardwareStatus(`Job still running. Check back later with ID: ${hwResult.job_id}`)
                }
              }
            } catch (pollError) {
              console.error('Poll error:', pollError)
              pollCount++
              if (pollCount < maxPolls) {
                setTimeout(pollForResult, pollInterval)
              }
            }
          }

          // Start polling after a short delay
          setTimeout(pollForResult, pollInterval)
        } else {
          // Submission failed
          const result: SimulationResult = {
            success: false,
            error: hwResult.error || 'Failed to submit to hardware',
            measurements: {},
            probabilities: {},
            numQubits: 0,
            gateCount: 0,
            circuitDepth: 0,
            executionTime: 0,
            shots: 0,
            backend: 'ibm_hardware'
          }
          setSimulationResult(result)
          setShowResults(true)
          setIsSubmitting(false)
          setHardwareStatus(null)
        }
      } catch (error) {
        const result: SimulationResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Hardware backend unavailable',
          measurements: {},
          probabilities: {},
          numQubits: 0,
          gateCount: 0,
          circuitDepth: 0,
          executionTime: 0,
          shots: 0,
          backend: 'ibm_hardware'
        }
        setSimulationResult(result)
        setShowResults(true)
        setIsSubmitting(false)
        setHardwareStatus(null)
      }
    }
  }

  const handleCloseResults = () => {
    setShowResults(false)
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Header - h-12 = 3rem */}
      <header className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-qcloud-border bg-white">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80">
            <Logo size="small" />
            <span className="font-semibold text-lg text-qcloud-text">QCloud</span>
          </Link>
          <Link
            to="/composer"
            className="text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors"
          >
            Circuit Composer
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
          <Link
            to="/hardware"
            className="text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors"
          >
            Hardware
          </Link>
          <Link
            to="/jobs"
            className="text-sm text-qcloud-muted hover:text-qcloud-primary transition-colors"
          >
            Job History
          </Link>
        </div>

        {/* Submit Button with Target Selector */}
        <div className="flex items-center gap-2">
          {/* Target Selector */}
          <div className="relative">
            <button
              onClick={() => setShowTargetMenu(!showTargetMenu)}
              className="flex items-center gap-2 px-3 py-2 border border-qcloud-border rounded-lg text-sm hover:bg-qcloud-bg transition-colors"
            >
              {submitTarget === 'qiskit_aer' ? (
                <>
                  <span className="text-lg">🔬</span>
                  <span>Qiskit Aer</span>
                </>
              ) : submitTarget === 'browser' ? (
                <>
                  <span className="text-lg">🌐</span>
                  <span>Browser</span>
                </>
              ) : (
                <>
                  <span className="text-lg">⚛️</span>
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
                <div className="absolute right-0 top-full mt-1 bg-white border border-qcloud-border rounded-lg shadow-lg z-20 min-w-[280px] max-h-[70vh] overflow-y-auto">
                  {/* Simulators Section */}
                  <div className="px-3 py-2 text-xs font-semibold text-qcloud-muted bg-qcloud-bg border-b border-qcloud-border">
                    Simulators
                  </div>
                  <button
                    onClick={() => { setSubmitTarget('qiskit_aer'); setShowTargetMenu(false) }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-qcloud-bg transition-colors ${
                      submitTarget === 'qiskit_aer' ? 'bg-qcloud-primary/5 text-qcloud-primary' : 'text-qcloud-text'
                    }`}
                  >
                    <span className="text-lg">🔬</span>
                    <div className="text-left flex-1">
                      <div className="font-medium">Qiskit Aer</div>
                      <div className="text-xs text-qcloud-muted">Python backend simulator</div>
                    </div>
                    {submitTarget === 'qiskit_aer' && (
                      <svg className="w-4 h-4 text-qcloud-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => { setSubmitTarget('browser'); setShowTargetMenu(false) }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-qcloud-bg transition-colors border-t border-qcloud-border ${
                      submitTarget === 'browser' ? 'bg-qcloud-primary/5 text-qcloud-primary' : 'text-qcloud-text'
                    }`}
                  >
                    <span className="text-lg">🌐</span>
                    <div className="text-left flex-1">
                      <div className="font-medium">Browser</div>
                      <div className="text-xs text-qcloud-muted">Local JavaScript simulator</div>
                    </div>
                    {submitTarget === 'browser' && (
                      <svg className="w-4 h-4 text-qcloud-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>

                  {/* IBM Quantum Hardware Section */}
                  <div className="px-3 py-2 text-xs font-semibold text-qcloud-muted bg-qcloud-bg border-y border-qcloud-border">
                    IBM Quantum Hardware
                  </div>
                  {ibmHardwareOptions.map((hw, index) => (
                    <button
                      key={hw.id}
                      onClick={() => {
                        setSubmitTarget('hardware')
                        setSelectedHardware(hw)
                        setShowTargetMenu(false)
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-qcloud-bg transition-colors ${
                        index > 0 ? 'border-t border-qcloud-border' : ''
                      } ${
                        submitTarget === 'hardware' && selectedHardware.id === hw.id
                          ? 'bg-qcloud-primary/5 text-qcloud-primary'
                          : 'text-qcloud-text'
                      }`}
                    >
                      <span className="text-lg">⚛️</span>
                      <div className="text-left flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {hw.name}
                          {hw.isNew && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 rounded">NEW</span>
                          )}
                        </div>
                        <div className="text-xs text-qcloud-muted">
                          {hw.qubits}q • {hw.processor}
                        </div>
                      </div>
                      {submitTarget === 'hardware' && selectedHardware.id === hw.id && (
                        <svg className="w-4 h-4 text-qcloud-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}

                  {/* Configure Hardware Link */}
                  <Link
                    to="/hardware"
                    onClick={() => setShowTargetMenu(false)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-qcloud-primary hover:bg-qcloud-bg transition-colors border-t border-qcloud-border"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Configure API credentials
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Run Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-qcloud-primary to-qcloud-secondary text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <span>Run</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Submitting overlay for hardware */}
      {isSubmitting && submitTarget === 'hardware' && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4 border border-qcloud-border shadow-xl max-w-md">
            <div className="w-12 h-12 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-medium text-qcloud-text">Running on IBM Quantum Hardware</p>
            <p className="text-sm text-qcloud-muted text-center">
              {hardwareStatus || 'Submitting job to quantum hardware...'}
            </p>
            {hardwareJobId && (
              <p className="text-xs text-qcloud-muted font-mono bg-qcloud-bg px-3 py-1 rounded">
                Job ID: {hardwareJobId}
              </p>
            )}
            <p className="text-xs text-amber-600 text-center">
              Hardware jobs may take several minutes due to queue times
            </p>
          </div>
        </div>
      )}

      {/* Simulation Results Modal */}
      <SimulationModal
        result={simulationResult}
        isOpen={showResults}
        onClose={handleCloseResults}
      />

      {/* File Tab Bar - h-8 = 2rem */}
      <div className="h-8 flex-shrink-0 bg-slate-800 px-4 flex items-center gap-2 border-b border-slate-700">
        <div className="px-3 py-1 bg-slate-900 rounded-t text-sm flex items-center gap-2 text-slate-200">
          <span className="text-yellow-400">🐍</span>
          <span>{fileName}</span>
        </div>
      </div>

      {/* Monaco Editor - height = 100vh - 3rem - 2rem - 1.5rem = 100vh - 6.5rem */}
      <div style={{ height: 'calc(100vh - 6.5rem)' }}>
        <CodeEditor
          value={code}
          onChange={(value) => setCode(value || '')}
        />
      </div>

      {/* Status Bar - h-6 = 1.5rem */}
      <footer className="h-6 flex-shrink-0 bg-qcloud-primary px-4 text-xs flex items-center justify-between text-white">
        <span>Python - Qiskit</span>
        <div className="flex items-center gap-4">
          <span>
            {submitTarget === 'qiskit_aer' ? '🔬 Qiskit Aer' : submitTarget === 'browser' ? '🌐 Browser' : '⚛️ Hardware'}
          </span>
          <span>UTF-8</span>
        </div>
      </footer>
    </div>
  )
}

export default EditorPage

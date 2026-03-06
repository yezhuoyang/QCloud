import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import CodeEditor from '../components/CodeEditor'
import DifficultyBadge from '../components/competition/DifficultyBadge'
import ConstraintsPanel from '../components/competition/ConstraintsPanel'
import { CompactLeaderboard } from '../components/competition/Leaderboard'
import { getProblemById, getCategoryById } from '../data/competitionProblems'
import { generateMockLeaderboard, evaluateSubmission, createSubmission } from '../utils/competitionEvaluator'
import { Submission, SubmissionResult } from '../types/competition'

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

function CompetitionProblemPage() {
  const { problemId } = useParams<{ problemId: string }>()
  const navigate = useNavigate()
  const problem = getProblemById(problemId || '')
  const category = problem ? getCategoryById(problem.category) : undefined

  const [code, setCode] = useState(problem?.starterCode || '')
  const [submissionType, setSubmissionType] = useState<'code' | 'circuit'>('code')
  const [submitTarget, setSubmitTarget] = useState<SubmitTarget>('qiskit_aer')
  const [selectedHardware, setSelectedHardware] = useState(ibmHardwareOptions[0])
  const [showTargetMenu, setShowTargetMenu] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedHint, setExpandedHint] = useState<number | null>(null)
  const [expandedTestCase, setExpandedTestCase] = useState<string | null>(null)

  // Resizable split pane state
  const [splitPosition, setSplitPosition] = useState(50) // percentage
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle mouse events for resizing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return
      const container = containerRef.current
      const rect = container.getBoundingClientRect()
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100
      // Clamp between 20% and 80%
      setSplitPosition(Math.min(80, Math.max(20, newPosition)))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Mock leaderboard data
  const [leaderboard] = useState(() =>
    problem ? generateMockLeaderboard(problem.id, 10) : []
  )

  // Reset code when problem changes
  useEffect(() => {
    if (problem?.starterCode) {
      setCode(problem.starterCode)
    }
  }, [problem?.id])

  if (!problem) {
    return (
      <div className="min-h-screen bg-qcloud-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-qcloud-text mb-4">Problem not found</h1>
          <Link
            to="/competition"
            className="text-qcloud-primary hover:text-qcloud-secondary"
          >
            Back to Challenges
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      // Create submission
      const submission: Submission = createSubmission(problem.id, code, 'code')

      // Evaluate submission
      const result: SubmissionResult = await evaluateSubmission(problem, submission)

      // Save result to localStorage for the results page
      localStorage.setItem('qcloud-last-submission', JSON.stringify({
        submission,
        result
      }))

      // Update user progress
      const progress = JSON.parse(localStorage.getItem('qcloud-competition-progress') || '{}')
      const existingProgress = progress[problem.id]
      progress[problem.id] = {
        odlemId: problem.id,
        odlemTitle: problem.title,
        status: result.passed ? 'solved' : 'attempted',
        bestScore: Math.max(existingProgress?.bestScore || 0, result.score),
        submissionCount: (existingProgress?.submissionCount || 0) + 1,
        lastSubmittedAt: new Date().toISOString()
      }
      localStorage.setItem('qcloud-competition-progress', JSON.stringify(progress))

      // Navigate to results page
      navigate(`/competition/results/${submission.id}`)
    } catch (error) {
      console.error('Submission failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenInComposer = () => {
    navigate('/composer', {
      state: {
        fromCompetition: true,
        problemId: problem.id,
        problemTitle: problem.title
      }
    })
  }

  const visibleTestCases = problem.testCases.filter(tc => !tc.isHidden)
  const hiddenCount = problem.testCases.filter(tc => tc.isHidden).length

  return (
    <div className="min-h-screen bg-qcloud-bg flex flex-col">
      {/* Header */}
      <header className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-qcloud-border bg-white">
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
            <span className="font-semibold text-lg text-qcloud-text">QuantumArena</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-qcloud-muted">{category?.icon}</span>
          <h1 className="font-semibold text-qcloud-text">{problem.title}</h1>
          <DifficultyBadge difficulty={problem.difficulty} />
        </div>
      </header>

      {/* Submitting overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4 border border-qcloud-border shadow-xl">
            <div className="w-12 h-12 border-4 border-qcloud-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-medium text-qcloud-text">Evaluating your solution...</p>
            <p className="text-sm text-qcloud-muted">Running test cases on simulator</p>
          </div>
        </div>
      )}

      {/* Main Content - Two Column Layout with Resizable Split */}
      <div
        ref={containerRef}
        className={`flex-1 flex overflow-hidden ${isDragging ? 'select-none cursor-col-resize' : ''}`}
      >
        {/* Left Column - Problem Description */}
        <div
          className="overflow-y-auto bg-white"
          style={{ width: `${splitPosition}%` }}
        >
          <div className="p-6">
            {/* Problem Description */}
            <div className="prose prose-slate max-w-none mb-8">
              <div className="whitespace-pre-wrap text-qcloud-text" style={{ fontFamily: 'inherit' }}>
                {problem.description.split('\n').map((line, i) => {
                  // Handle headers
                  if (line.startsWith('## ')) {
                    return <h2 key={i} className="text-xl font-bold text-qcloud-text mt-6 mb-3">{line.slice(3)}</h2>
                  }
                  // Handle code blocks
                  if (line.startsWith('```')) {
                    return null // Skip code block markers for simplicity
                  }
                  // Handle inline code
                  if (line.includes('`')) {
                    const parts = line.split(/`([^`]+)`/)
                    return (
                      <p key={i} className="my-2">
                        {parts.map((part, j) =>
                          j % 2 === 1
                            ? <code key={j} className="px-1.5 py-0.5 bg-slate-100 rounded text-sm font-mono text-qcloud-primary">{part}</code>
                            : part
                        )}
                      </p>
                    )
                  }
                  // Handle list items
                  if (line.startsWith('- ') || line.startsWith('* ')) {
                    return <li key={i} className="ml-4 my-1">{line.slice(2)}</li>
                  }
                  // Handle numbered list
                  if (/^\d+\.\s/.test(line)) {
                    return <li key={i} className="ml-4 my-1">{line.replace(/^\d+\.\s/, '')}</li>
                  }
                  // Empty lines
                  if (!line.trim()) {
                    return <div key={i} className="h-4" />
                  }
                  // Regular paragraphs
                  return <p key={i} className="my-2">{line}</p>
                })}
              </div>
            </div>

            {/* Constraints Panel */}
            <div className="mb-8">
              <ConstraintsPanel
                constraints={problem.constraints}
                fidelityRequirement={problem.fidelityRequirement}
              />
            </div>

            {/* Test Cases */}
            <div className="mb-8">
              <h3 className="font-semibold text-qcloud-text mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-qcloud-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Test Cases
              </h3>

              <div className="space-y-2">
                {visibleTestCases.map((testCase, index) => (
                  <div
                    key={testCase.id}
                    className="border border-qcloud-border rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedTestCase(
                        expandedTestCase === testCase.id ? null : testCase.id
                      )}
                      className="w-full px-4 py-3 flex items-center justify-between bg-qcloud-bg/50 hover:bg-qcloud-bg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-qcloud-primary/10 text-qcloud-primary text-sm flex items-center justify-center font-medium">
                          {index + 1}
                        </span>
                        <span className="font-medium text-qcloud-text">{testCase.name}</span>
                        <span className="text-xs text-qcloud-muted">({testCase.weight}%)</span>
                      </div>
                      <svg
                        className={`w-5 h-5 text-qcloud-muted transition-transform ${
                          expandedTestCase === testCase.id ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {expandedTestCase === testCase.id && (
                      <div className="px-4 py-3 border-t border-qcloud-border bg-white">
                        {testCase.input.oracleSpec && (
                          <div className="mb-2">
                            <span className="text-sm text-qcloud-muted">Oracle: </span>
                            <span className="text-sm text-qcloud-text">{testCase.input.oracleSpec.description}</span>
                          </div>
                        )}
                        {testCase.expectedOutput.targetStates && (
                          <div className="mb-2">
                            <span className="text-sm text-qcloud-muted">Target: </span>
                            <span className="font-mono text-sm text-qcloud-primary">
                              |{testCase.expectedOutput.targetStates.join('⟩, |')}⟩
                            </span>
                          </div>
                        )}
                        {testCase.expectedOutput.expectedValue !== undefined && (
                          <div className="mb-2">
                            <span className="text-sm text-qcloud-muted">Expected value: </span>
                            <span className="font-mono text-sm text-qcloud-primary">
                              {testCase.expectedOutput.expectedValue}
                              {testCase.expectedOutput.tolerance && ` (±${testCase.expectedOutput.tolerance})`}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {hiddenCount > 0 && (
                  <div className="px-4 py-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-500">
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    {hiddenCount} hidden test case{hiddenCount > 1 ? 's' : ''} will be used for final scoring
                  </div>
                )}
              </div>
            </div>

            {/* Hints */}
            <div className="mb-8">
              <h3 className="font-semibold text-qcloud-text mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Hints
              </h3>

              <div className="space-y-2">
                {problem.hints.map((hint, index) => (
                  <div
                    key={index}
                    className="border border-amber-200 rounded-lg overflow-hidden bg-amber-50"
                  >
                    <button
                      onClick={() => setExpandedHint(expandedHint === index ? null : index)}
                      className="w-full px-4 py-2 flex items-center justify-between text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      <span className="font-medium text-sm">Hint {index + 1}</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${expandedHint === index ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expandedHint === index && (
                      <div className="px-4 py-3 border-t border-amber-200 text-sm text-amber-800 bg-white">
                        {hint}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard Preview */}
            <CompactLeaderboard
              entries={leaderboard}
              title="Top Solvers"
              showViewAll={true}
              onViewAll={() => navigate(`/competition/leaderboard?problem=${problem.id}`)}
            />
          </div>
        </div>

        {/* Resizable Divider */}
        <div
          onMouseDown={handleMouseDown}
          className={`w-1 bg-qcloud-border hover:bg-qcloud-primary cursor-col-resize flex-shrink-0 relative group transition-colors ${
            isDragging ? 'bg-qcloud-primary' : ''
          }`}
        >
          {/* Drag handle indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 rounded bg-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-4 bg-slate-500 rounded-full" />
              <div className="w-0.5 h-4 bg-slate-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* Right Column - Code Editor */}
        <div
          className="flex flex-col bg-slate-900"
          style={{ width: `${100 - splitPosition}%` }}
        >
          {/* Submission Type Tabs */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
            <div className="flex gap-2">
              <button
                onClick={() => setSubmissionType('code')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  submissionType === 'code'
                    ? 'bg-qcloud-primary text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                Code Editor
              </button>
              <button
                onClick={() => {
                  setSubmissionType('circuit')
                  handleOpenInComposer()
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  submissionType === 'circuit'
                    ? 'bg-qcloud-primary text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                Circuit Composer
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowTargetMenu(!showTargetMenu)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-600 transition-colors"
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
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showTargetMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowTargetMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-20 min-w-[220px] max-h-[400px] overflow-y-auto">
                    <button
                      onClick={() => { setSubmitTarget('qiskit_aer'); setShowTargetMenu(false) }}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-700 transition-colors ${
                        submitTarget === 'qiskit_aer' ? 'text-qcloud-primary' : 'text-slate-300'
                      }`}
                    >
                      <span>🔬</span>
                      <div className="text-left">
                        <div className="font-medium">Qiskit Aer</div>
                        <div className="text-xs text-slate-500">Python backend</div>
                      </div>
                      {submitTarget === 'qiskit_aer' && (
                        <svg className="w-4 h-4 ml-auto text-qcloud-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => { setSubmitTarget('browser'); setShowTargetMenu(false) }}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-700 transition-colors border-t border-slate-700 ${
                        submitTarget === 'browser' ? 'text-qcloud-primary' : 'text-slate-300'
                      }`}
                    >
                      <span>🌐</span>
                      <div className="text-left">
                        <div className="font-medium">Browser</div>
                        <div className="text-xs text-slate-500">Local JavaScript</div>
                      </div>
                      {submitTarget === 'browser' && (
                        <svg className="w-4 h-4 ml-auto text-qcloud-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <div className="border-t border-slate-700">
                      <div className="px-4 py-2 text-xs text-slate-500 font-medium bg-slate-900/50 sticky top-0">
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
                          className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-700 transition-colors ${
                            submitTarget === 'hardware' && selectedHardware.id === hw.id ? 'text-purple-400' : 'text-slate-300'
                          }`}
                        >
                          <div className="text-left flex-1">
                            <div className="font-medium">{hw.name}</div>
                            <div className="text-xs text-slate-500">{hw.qubits} qubits</div>
                          </div>
                          {submitTarget === 'hardware' && selectedHardware.id === hw.id && (
                            <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
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
          </div>

          {/* Code Editor */}
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              value={code}
              onChange={(value) => setCode(value || '')}
            />
          </div>

          {/* Submit Bar */}
          <div className="px-4 py-3 bg-slate-800 border-t border-slate-700 flex items-center justify-between">
            <div className="text-sm text-slate-400">
              <span>Press </span>
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 text-xs">Ctrl+Enter</kbd>
              <span> to submit</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-gradient-to-r from-qcloud-primary to-qcloud-secondary text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? 'Evaluating...' : 'Submit Solution'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompetitionProblemPage

import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import DifficultyBadge from '../components/competition/DifficultyBadge'
import TestCaseResults, { FidelityMeter } from '../components/competition/TestCaseResults'
import { ResourceUsageBar } from '../components/competition/ConstraintsPanel'
import { getProblemById, getCategoryById } from '../data/competitionProblems'
import { SubmissionResult } from '../types/competition'

function CompetitionResultPage() {
  const { submissionId } = useParams<{ submissionId: string }>()
  const navigate = useNavigate()

  const [result, setResult] = useState<SubmissionResult | null>(null)

  useEffect(() => {
    // Load submission result from localStorage
    const saved = localStorage.getItem('qcloud-last-submission')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setResult(data.result)
      } catch {
        // Invalid data
      }
    }
  }, [submissionId])

  const problem = result ? getProblemById(result.problemId) : null
  const category = problem ? getCategoryById(problem.category) : undefined

  if (!result || !problem) {
    return (
      <div className="min-h-screen bg-qcloud-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-qcloud-text mb-4">Result not found</h1>
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

  const passedTests = result.testResults.filter(r => r.passed).length
  const totalTests = result.testResults.length

  return (
    <div className="min-h-screen bg-qcloud-bg">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-qcloud-border bg-white">
        <div className="flex items-center gap-4">
          <Link
            to={`/competition/problem/${problem.id}`}
            className="flex items-center gap-2 text-qcloud-muted hover:text-qcloud-text"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Back to Problem</span>
          </Link>
          <div className="w-px h-6 bg-qcloud-border" />
          <Link to="/" className="flex items-center gap-2 hover:opacity-80">
            <Logo size="small" />
            <span className="font-semibold text-lg text-qcloud-text">QCloud</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-qcloud-muted">{category?.icon}</span>
          <h1 className="font-semibold text-qcloud-text">{problem.title}</h1>
          <DifficultyBadge difficulty={problem.difficulty} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Result Banner */}
        <div className={`rounded-xl p-6 mb-8 ${
          result.passed
            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
            : 'bg-gradient-to-r from-red-500 to-rose-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                result.passed ? 'bg-white/20' : 'bg-white/20'
              }`}>
                {result.passed ? (
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {result.passed ? 'Challenge Passed!' : 'Not Quite...'}
                </h2>
                <p className="text-white/80">
                  {result.passed
                    ? 'Congratulations! Your solution meets all requirements.'
                    : 'Your solution needs some improvements. Check the feedback below.'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold text-white">{result.score}</div>
              <div className="text-white/80">out of 100</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-qcloud-border">
            <div className="text-sm text-qcloud-muted mb-1">Tests Passed</div>
            <div className="text-2xl font-bold text-qcloud-text">
              {passedTests}/{totalTests}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-qcloud-border">
            <div className="text-sm text-qcloud-muted mb-1">Average Fidelity</div>
            <div className={`text-2xl font-bold ${
              result.totalFidelity >= 0.9 ? 'text-green-600' :
              result.totalFidelity >= 0.7 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {(result.totalFidelity * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-qcloud-border">
            <div className="text-sm text-qcloud-muted mb-1">Execution Time</div>
            <div className="text-2xl font-bold text-qcloud-text">
              {result.totalExecutionTime}ms
            </div>
          </div>
        </div>

        {/* Fidelity Meter */}
        <div className="bg-white rounded-xl p-6 border border-qcloud-border mb-8">
          <h3 className="font-semibold text-qcloud-text mb-4">Fidelity Score</h3>
          <FidelityMeter
            fidelity={result.totalFidelity}
            minRequired={problem.fidelityRequirement.minFidelity}
            target={problem.fidelityRequirement.targetFidelity}
          />
        </div>

        {/* Resource Usage */}
        <div className="bg-white rounded-xl p-6 border border-qcloud-border mb-8">
          <h3 className="font-semibold text-qcloud-text mb-4">Resource Usage</h3>
          <div className="space-y-4">
            <ResourceUsageBar
              label="Gate Count"
              used={result.totalGateCount}
              max={problem.constraints.maxGateCount}
            />
            <ResourceUsageBar
              label="Circuit Depth"
              used={result.maxCircuitDepth}
              max={problem.constraints.maxCircuitDepth}
            />
            <ResourceUsageBar
              label="Qubits"
              used={result.qubitCount}
              max={problem.constraints.maxQubits}
            />
          </div>

          {/* Constraint Violations */}
          {!result.constraintsPassed && result.constraintViolations.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Constraint Violations
              </h4>
              <ul className="space-y-1">
                {result.constraintViolations.map((violation, i) => (
                  <li key={i} className="text-sm text-red-600">{violation}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Test Case Results */}
        <div className="bg-white rounded-xl p-6 border border-qcloud-border mb-8">
          <TestCaseResults results={result.testResults} showDetails={true} />
        </div>

        {/* Feedback */}
        {result.feedback.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-qcloud-border mb-8">
            <h3 className="font-semibold text-qcloud-text mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-qcloud-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Feedback
            </h3>
            <ul className="space-y-2">
              {result.feedback.map((fb, i) => (
                <li key={i} className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 text-qcloud-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-qcloud-text">{fb}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate(`/competition/problem/${problem.id}`)}
            className="px-6 py-3 bg-gradient-to-r from-qcloud-primary to-qcloud-secondary text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
          <Link
            to={`/competition/leaderboard?problem=${problem.id}`}
            className="px-6 py-3 border border-qcloud-border text-qcloud-text rounded-lg font-medium hover:bg-qcloud-bg transition-colors"
          >
            View Leaderboard
          </Link>
          <Link
            to="/competition"
            className="px-6 py-3 border border-qcloud-border text-qcloud-text rounded-lg font-medium hover:bg-qcloud-bg transition-colors"
          >
            More Challenges
          </Link>
        </div>
      </main>
    </div>
  )
}

export default CompetitionResultPage

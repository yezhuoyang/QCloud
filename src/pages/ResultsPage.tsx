import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

// Fake quantum measurement results
const SMALL_RESULTS: Record<string, number> = {
  '00': 502,
  '01': 12,
  '10': 8,
  '11': 478,
}

const LARGE_RESULTS: Record<string, number> = {
  '000': 125,
  '001': 118,
  '010': 132,
  '011': 119,
  '100': 128,
  '101': 121,
  '110': 134,
  '111': 123,
  '0000': 62,
  '0001': 58,
  '0010': 67,
  '0011': 61,
  '0100': 64,
  '0101': 59,
  '0110': 68,
  '0111': 63,
  '1000': 61,
  '1001': 57,
  '1010': 66,
  '1011': 60,
  '1100': 63,
  '1101': 58,
  '1110': 67,
  '1111': 62,
}

interface BarChartProps {
  data: Record<string, number>
}

function BarChart({ data }: BarChartProps) {
  const entries = Object.entries(data)
  const maxValue = Math.max(...Object.values(data))
  const totalShots = Object.values(data).reduce((a, b) => a + b, 0)

  const barWidth = Math.max(40, Math.min(80, 600 / entries.length))
  const chartWidth = entries.length * (barWidth + 10) + 60
  const chartHeight = 300

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight + 60}`}
        className="mx-auto"
        style={{ minWidth: chartWidth, maxWidth: '100%' }}
      >
        {/* Y-axis */}
        <line x1="50" y1="20" x2="50" y2={chartHeight} stroke="#cbd5e1" strokeWidth="2" />

        {/* X-axis */}
        <line x1="50" y1={chartHeight} x2={chartWidth - 10} y2={chartHeight} stroke="#cbd5e1" strokeWidth="2" />

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = chartHeight - ratio * (chartHeight - 40)
          const value = Math.round(maxValue * ratio)
          return (
            <g key={i}>
              <line x1="45" y1={y} x2="50" y2={y} stroke="#cbd5e1" strokeWidth="1" />
              <text x="40" y={y + 4} textAnchor="end" fill="#64748b" fontSize="10">
                {value}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {entries.map(([state, count], index) => {
          const barHeight = (count / maxValue) * (chartHeight - 40)
          const x = 60 + index * (barWidth + 10)
          const y = chartHeight - barHeight
          const probability = ((count / totalShots) * 100).toFixed(1)

          return (
            <g key={state}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="url(#barGradient)"
                rx="4"
                className="hover:opacity-80 transition-opacity"
              />

              {/* Count label on top of bar */}
              <text
                x={x + barWidth / 2}
                y={y - 8}
                textAnchor="middle"
                fill="#64748b"
                fontSize="11"
                fontWeight="500"
              >
                {count}
              </text>

              {/* State label below */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 20}
                textAnchor="middle"
                fill="#1e293b"
                fontSize="12"
                fontFamily="'Fira Code', monospace"
              >
                |{state}⟩
              </text>

              {/* Probability */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 35}
                textAnchor="middle"
                fill="#64748b"
                fontSize="10"
              >
                {probability}%
              </text>
            </g>
          )
        })}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

interface DictionaryViewProps {
  data: Record<string, number>
}

function DictionaryView({ data }: DictionaryViewProps) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  const totalShots = Object.values(data).reduce((a, b) => a + b, 0)

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border border-qcloud-border overflow-hidden shadow-sm">
        {/* Header */}
        <div className="grid grid-cols-3 gap-4 px-4 py-3 bg-qcloud-bg border-b border-qcloud-border font-semibold text-sm text-qcloud-text">
          <span>State</span>
          <span className="text-right">Count</span>
          <span className="text-right">Probability</span>
        </div>

        {/* Data rows */}
        <div className="max-h-96 overflow-y-auto">
          {entries.map(([state, count]) => {
            const probability = ((count / totalShots) * 100).toFixed(2)
            return (
              <div
                key={state}
                className="grid grid-cols-3 gap-4 px-4 py-2 border-b border-qcloud-border/50 hover:bg-qcloud-bg/50 transition-colors"
              >
                <span className="font-mono text-qcloud-primary">|{state}⟩</span>
                <span className="text-right text-qcloud-text">{count}</span>
                <span className="text-right text-qcloud-muted">{probability}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 text-center text-qcloud-muted text-sm">
        Total states: {entries.length} | Total shots: {totalShots.toLocaleString()}
      </div>
    </div>
  )
}

function ResultsPage() {
  const [viewMode, setViewMode] = useState<'auto' | 'chart' | 'dict'>('auto')
  const [dataSize, setDataSize] = useState<'small' | 'large'>('small')

  const results = dataSize === 'small' ? SMALL_RESULTS : LARGE_RESULTS
  const entryCount = Object.keys(results).length
  const totalShots = Object.values(results).reduce((a, b) => a + b, 0)

  // Auto mode: use chart for <=8 states, dictionary for more
  const shouldShowChart = viewMode === 'chart' || (viewMode === 'auto' && entryCount <= 8)

  return (
    <div className="min-h-screen bg-qcloud-bg">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-qcloud-border bg-white">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80">
            <Logo size="small" />
            <span className="font-semibold text-lg text-qcloud-text">QuantumArena</span>
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
        </div>

        <Link
          to="/editor"
          className="px-4 py-2 bg-qcloud-bg hover:bg-qcloud-border rounded-md text-sm font-medium transition-colors text-qcloud-text"
        >
          ← Back to Editor
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Job Info */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-qcloud-primary to-qcloud-secondary bg-clip-text text-transparent">
            Job Results
          </h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-qcloud-muted">
            <span>Job ID: <span className="text-qcloud-text font-mono">qc-2024-{Math.random().toString(36).substr(2, 8)}</span></span>
            <span>Status: <span className="text-green-600">Completed</span></span>
            <span>Backend: <span className="text-qcloud-text">ibm_brisbane</span></span>
            <span>Shots: <span className="text-qcloud-text">{totalShots.toLocaleString()}</span></span>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          {/* Data size toggle (for demo) */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-qcloud-muted">Demo data:</span>
            <div className="flex rounded-lg overflow-hidden border border-qcloud-border">
              <button
                onClick={() => setDataSize('small')}
                className={`px-3 py-1 text-sm ${dataSize === 'small' ? 'bg-qcloud-primary text-white' : 'bg-white text-qcloud-muted hover:bg-qcloud-bg'}`}
              >
                Small (4 states)
              </button>
              <button
                onClick={() => setDataSize('large')}
                className={`px-3 py-1 text-sm ${dataSize === 'large' ? 'bg-qcloud-primary text-white' : 'bg-white text-qcloud-muted hover:bg-qcloud-bg'}`}
              >
                Large (24 states)
              </button>
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-qcloud-muted">View:</span>
            <div className="flex rounded-lg overflow-hidden border border-qcloud-border">
              <button
                onClick={() => setViewMode('auto')}
                className={`px-3 py-1 text-sm ${viewMode === 'auto' ? 'bg-qcloud-primary text-white' : 'bg-white text-qcloud-muted hover:bg-qcloud-bg'}`}
              >
                Auto
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1 text-sm ${viewMode === 'chart' ? 'bg-qcloud-primary text-white' : 'bg-white text-qcloud-muted hover:bg-qcloud-bg'}`}
              >
                Chart
              </button>
              <button
                onClick={() => setViewMode('dict')}
                className={`px-3 py-1 text-sm ${viewMode === 'dict' ? 'bg-qcloud-primary text-white' : 'bg-white text-qcloud-muted hover:bg-qcloud-bg'}`}
              >
                Dictionary
              </button>
            </div>
          </div>
        </div>

        {/* Results Display */}
        <div className="bg-white rounded-xl border border-qcloud-border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-qcloud-text">
            <span>Measurement Results</span>
            <span className="text-sm font-normal text-qcloud-muted">
              ({entryCount} unique states)
            </span>
          </h2>

          {shouldShowChart ? (
            <BarChart data={results} />
          ) : (
            <DictionaryView data={results} />
          )}
        </div>

        {/* Raw Data Section */}
        <div className="mt-8 bg-white rounded-xl border border-qcloud-border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-qcloud-text">Raw Counts</h2>
          <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-sm font-mono text-slate-300">
{JSON.stringify(results, null, 2)}
          </pre>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap gap-4">
          <button className="px-6 py-3 bg-gradient-to-r from-qcloud-primary to-qcloud-secondary rounded-lg text-white font-semibold hover:opacity-90 transition-opacity">
            Download Results
          </button>
          <Link
            to="/editor"
            className="px-6 py-3 bg-white border border-qcloud-border hover:bg-qcloud-bg rounded-lg text-qcloud-text font-semibold transition-colors"
          >
            Run New Job
          </Link>
        </div>
      </main>
    </div>
  )
}

export default ResultsPage

import { useState, useMemo, useCallback, useRef } from 'react'
import { HardwareCalibrationData, QubitCalibration } from '../data/hardwareCalibrationData'

export type HeatmapMetric = 'none' | 'readout_error' | 't1' | 't2' | 'id_error' | 'cz_error'

interface HardwareTopologyProps {
  data: HardwareCalibrationData
  /** Physical qubit indices to highlight (from INITIAL_LAYOUT) */
  highlightedQubits?: number[]
  /** Labels for highlighted qubits: index → logical qubit label */
  highlightLabels?: Record<number, string>
  width?: number
  height?: number
  /** Whether to show the metric selector UI */
  showMetricSelector?: boolean
}

const METRIC_OPTIONS: { value: HeatmapMetric; label: string }[] = [
  { value: 'none', label: 'Default (Blue)' },
  { value: 'readout_error', label: 'Readout Error' },
  { value: 't1', label: 'T1 (μs)' },
  { value: 't2', label: 'T2 (μs)' },
  { value: 'id_error', label: 'ID Error' },
  { value: 'cz_error', label: 'CZ Error (edges)' },
]

/** Map a normalized [0,1] value to a color gradient */
function heatmapColor(t: number, metric: HeatmapMetric): string {
  // For T1/T2, higher is better → invert so green=high, red=low
  if (metric === 't1' || metric === 't2') {
    t = 1 - t
  }
  // Green → Yellow → Red
  const r = Math.round(t < 0.5 ? t * 2 * 255 : 255)
  const g = Math.round(t < 0.5 ? 255 : (1 - (t - 0.5) * 2) * 255)
  return `rgb(${r},${g},0)`
}

function normalizeLog(value: number, min: number, max: number): number {
  const logMin = Math.log10(Math.max(min, 1e-8))
  const logMax = Math.log10(Math.max(max, 1e-6))
  const logVal = Math.log10(Math.max(value, 1e-8))
  return Math.max(0, Math.min(1, (logVal - logMin) / (logMax - logMin || 1)))
}

function normalizeLinear(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (value - min) / (max - min || 1)))
}

function formatMetricValue(value: number, metric: HeatmapMetric): string {
  switch (metric) {
    case 'readout_error':
    case 'id_error':
    case 'cz_error':
      return value < 0.001 ? (value * 100).toFixed(3) + '%' : (value * 100).toFixed(2) + '%'
    case 't1':
    case 't2':
      return value.toFixed(1) + ' μs'
    default:
      return String(value)
  }
}

function formatError(e: number): string {
  if (e < 0.001) return (e * 100).toFixed(3) + '%'
  return (e * 100).toFixed(2) + '%'
}

export default function HardwareTopology({
  data,
  highlightedQubits = [],
  highlightLabels = {},
  width = 600,
  height = 500,
  showMetricSelector = true,
}: HardwareTopologyProps) {
  const [hoveredQubit, setHoveredQubit] = useState<QubitCalibration | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [metric, setMetric] = useState<HeatmapMetric>('none')
  const svgRef = useRef<SVGSVGElement>(null)

  const highlightSet = useMemo(() => new Set(highlightedQubits), [highlightedQubits])

  // Compute aspect-ratio-aware dimensions from data positions
  const { svgWidth, svgHeight, padding, nodeRadius, fontSize } = useMemo(() => {
    const xs = data.qubits.map(q => q.x)
    const ys = data.qubits.map(q => q.y)
    const xRange = Math.max(...xs) - Math.min(...xs) || 1
    const yRange = Math.max(...ys) - Math.min(...ys) || 1
    const aspect = xRange / yRange

    // Fit within the given width/height bounds while preserving aspect ratio
    let w = width
    let h = height
    if (aspect > w / h) {
      // Data is wider than container → constrain by width
      h = Math.round(w / aspect)
    } else {
      // Data is taller → constrain by height
      w = Math.round(h * aspect)
    }

    // Add padding for labels
    const pad = 35
    const r = Math.max(6, Math.min(12, 400 / Math.sqrt(data.numQubits)))
    const fs = r > 8 ? 9 : 7

    return { svgWidth: w + pad * 2, svgHeight: h + pad * 2, padding: pad, nodeRadius: r, fontSize: fs }
  }, [data, width, height])

  // Metric ranges for heatmap coloring
  const metricRanges = useMemo(() => {
    const readoutErrors = data.qubits.filter(q => q.readoutError > 0).map(q => q.readoutError)
    const idErrors = data.qubits.filter(q => q.idError > 0).map(q => q.idError)
    const t1s = data.qubits.filter(q => q.t1 > 0).map(q => q.t1)
    const t2s = data.qubits.filter(q => q.t2 > 0).map(q => q.t2)
    const czErrors = data.edges.filter(e => e.czError > 0).map(e => e.czError)
    return {
      readout_error: { min: Math.min(...readoutErrors, 0.001), max: Math.max(...readoutErrors, 0.01) },
      id_error: { min: Math.min(...idErrors, 0.0001), max: Math.max(...idErrors, 0.005) },
      t1: { min: Math.min(...t1s, 10), max: Math.max(...t1s, 300) },
      t2: { min: Math.min(...t2s, 10), max: Math.max(...t2s, 300) },
      cz_error: { min: Math.min(...czErrors, 0.0005), max: Math.max(...czErrors, 0.01) },
    }
  }, [data])

  // Scale positions to SVG coordinates
  const scaledPositions = useMemo(() => {
    const innerW = svgWidth - padding * 2
    const innerH = svgHeight - padding * 2
    return data.qubits.map(q => ({
      x: padding + q.x * innerW,
      y: padding + q.y * innerH,
    }))
  }, [data, svgWidth, svgHeight, padding])

  // Get node color based on metric
  const getNodeColor = useCallback((qubit: QubitCalibration): string => {
    if (!qubit.operational) return '#4b5563'
    if (metric === 'none') return '#3b82f6' // Blue default (IBM style)

    let value: number
    let range: { min: number; max: number }
    switch (metric) {
      case 'readout_error':
        value = qubit.readoutError; range = metricRanges.readout_error; break
      case 'id_error':
        value = qubit.idError; range = metricRanges.id_error; break
      case 't1':
        value = qubit.t1; range = metricRanges.t1; break
      case 't2':
        value = qubit.t2; range = metricRanges.t2; break
      default:
        return '#3b82f6'
    }

    const t = (metric === 't1' || metric === 't2')
      ? normalizeLinear(value, range.min, range.max)
      : normalizeLog(value, range.min, range.max)
    return heatmapColor(t, metric)
  }, [metric, metricRanges])

  // Get edge color based on metric
  const getEdgeColor = useCallback((czError: number): string => {
    if (metric === 'cz_error' && czError > 0) {
      const t = normalizeLog(czError, metricRanges.cz_error.min, metricRanges.cz_error.max)
      return heatmapColor(t, 'cz_error')
    }
    return metric === 'none' ? '#60a5fa' : '#64748b' // Blue default edges or gray when showing node metric
  }, [metric, metricRanges])

  const handleMouseEnter = useCallback((qubit: QubitCalibration, e: React.MouseEvent) => {
    setHoveredQubit(qubit)
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect()
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoveredQubit(null)
  }, [])

  return (
    <div className="flex flex-col items-center">
      {/* Metric Selector */}
      {showMetricSelector && (
        <div className="flex items-center gap-2 mb-2 px-2">
          <span className="text-xs text-slate-500 font-medium">Color by:</span>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as HeatmapMetric)}
            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {METRIC_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {metric !== 'none' && (
            <div className="flex items-center gap-1 ml-2">
              <div className="w-12 h-2 rounded" style={{
                background: (metric === 't1' || metric === 't2')
                  ? 'linear-gradient(to right, rgb(255,0,0), rgb(255,255,0), rgb(0,255,0))'
                  : 'linear-gradient(to right, rgb(0,255,0), rgb(255,255,0), rgb(255,0,0))'
              }} />
              <span className="text-[10px] text-slate-400">
                {(metric === 't1' || metric === 't2') ? 'Low → High' : 'Good → Bad'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* SVG Topology */}
      <div className="relative" style={{ width: svgWidth, height: svgHeight }}>
        <svg
          ref={svgRef}
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="bg-slate-900 rounded-lg"
        >
          {/* Edges */}
          {data.edges.map((edge, i) => {
            const p1 = scaledPositions[edge.q1]
            const p2 = scaledPositions[edge.q2]
            if (!p1 || !p2) return null
            const isHighlighted = highlightSet.has(edge.q1) && highlightSet.has(edge.q2)
            const color = isHighlighted ? '#93c5fd' : getEdgeColor(edge.czError)
            return (
              <line
                key={`e-${i}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={color}
                strokeWidth={isHighlighted ? 2.5 : 1.2}
                strokeOpacity={isHighlighted ? 1 : (metric === 'none' ? 0.5 : 0.7)}
              />
            )
          })}

          {/* Qubit nodes */}
          {data.qubits.map((qubit) => {
            const pos = scaledPositions[qubit.id]
            if (!pos) return null
            const isHighlighted = highlightSet.has(qubit.id)
            const isHovered = hoveredQubit?.id === qubit.id
            const fillColor = getNodeColor(qubit)

            return (
              <g key={`q-${qubit.id}`}>
                {/* Highlight glow */}
                {isHighlighted && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={nodeRadius + 6}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    opacity={0.9}
                  />
                )}
                {/* Node circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isHovered ? nodeRadius + 2 : nodeRadius}
                  fill={fillColor}
                  stroke={isHighlighted ? '#fbbf24' : isHovered ? '#fff' : '#1e293b'}
                  strokeWidth={isHighlighted ? 2 : 1}
                  className="cursor-pointer"
                  onMouseEnter={(e) => handleMouseEnter(qubit, e)}
                  onMouseLeave={handleMouseLeave}
                />
                {/* Qubit ID label */}
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fff"
                  fontSize={fontSize}
                  fontFamily="monospace"
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {qubit.id}
                </text>
                {/* Logical qubit label for highlighted qubits */}
                {isHighlighted && highlightLabels[qubit.id] !== undefined && (
                  <text
                    x={pos.x}
                    y={pos.y - nodeRadius - 8}
                    textAnchor="middle"
                    fill="#fbbf24"
                    fontSize={10}
                    fontWeight="bold"
                    fontFamily="monospace"
                    pointerEvents="none"
                  >
                    q{highlightLabels[qubit.id]}
                  </text>
                )}
              </g>
            )
          })}

          {/* Legend — only show when layout is highlighted */}
          {highlightedQubits.length > 0 && (
            <g transform={`translate(${svgWidth - 130}, 10)`}>
              <rect x={0} y={0} width={120} height={30} rx={4} fill="#0f172a" fillOpacity={0.85} />
              <circle cx={14} cy={15} r={6} fill="none" stroke="#f59e0b" strokeWidth={2.5} />
              <text x={26} y={18} fill="#fbbf24" fontSize={9} fontFamily="sans-serif" fontWeight="500">Your layout</text>
            </g>
          )}
        </svg>

        {/* Tooltip */}
        {hoveredQubit && (
          <div
            className="absolute pointer-events-none bg-slate-800 text-white text-xs rounded-lg shadow-xl border border-slate-600 px-3 py-2 z-10"
            style={{
              left: Math.min(tooltipPos.x + 12, svgWidth - 200),
              top: Math.max(tooltipPos.y - 80, 4),
              minWidth: 170,
            }}
          >
            <div className="font-bold text-sm mb-1">Qubit {hoveredQubit.id}</div>
            <div className="space-y-0.5">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Readout Error:</span>
                <span className="font-mono">{formatError(hoveredQubit.readoutError)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">T1:</span>
                <span className="font-mono">{hoveredQubit.t1.toFixed(1)} μs</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">T2:</span>
                <span className="font-mono">{hoveredQubit.t2.toFixed(1)} μs</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">ID Error:</span>
                <span className="font-mono">{formatError(hoveredQubit.idError)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Operational:</span>
                <span className={hoveredQubit.operational ? 'text-green-400' : 'text-red-400'}>
                  {hoveredQubit.operational ? 'Yes' : 'No'}
                </span>
              </div>
              {/* Current metric highlight */}
              {metric !== 'none' && metric !== 'cz_error' && (
                <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-slate-600">
                  <span className="text-yellow-400 font-medium">
                    {METRIC_OPTIONS.find(m => m.value === metric)?.label}:
                  </span>
                  <span className="font-mono text-yellow-300">
                    {formatMetricValue(
                      metric === 'readout_error' ? hoveredQubit.readoutError :
                      metric === 'id_error' ? hoveredQubit.idError :
                      metric === 't1' ? hoveredQubit.t1 :
                      hoveredQubit.t2,
                      metric
                    )}
                  </span>
                </div>
              )}
            </div>
            {/* CZ connections */}
            {data.edges.filter(e => e.q1 === hoveredQubit.id || e.q2 === hoveredQubit.id).length > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-600">
                <div className="text-slate-400 mb-0.5">CZ Connections:</div>
                {data.edges
                  .filter(e => e.q1 === hoveredQubit.id || e.q2 === hoveredQubit.id)
                  .map((e, i) => {
                    const other = e.q1 === hoveredQubit.id ? e.q2 : e.q1
                    return (
                      <div key={i} className="flex justify-between gap-4">
                        <span className="text-slate-400">→ Q{other}:</span>
                        <span className="font-mono">{formatError(e.czError)}</span>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

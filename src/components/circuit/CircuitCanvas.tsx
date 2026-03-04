import { useState, useMemo, useCallback } from 'react'
import { Circuit, PlacedGate, GateType } from '../../types/circuit'
import { PatternMatch } from '../../types/identityRules'
import { PlacedGateIcon, ControlDot } from './GateIcon'

interface CircuitCanvasProps {
  circuit: Circuit
  onDropGate: (gateType: GateType, qubitIndex: number, column: number) => void
  onRemoveGate: (gateId: string) => void
  onMoveGate: (gateId: string, newQubitIndex: number, newColumn: number) => void
  draggingGate: GateType | null
  // Multi-select support
  selectedGates: Set<string>
  onSelectionChange: (selectedGates: Set<string>) => void
  // Match highlighting
  highlightedMatches?: PatternMatch[]
  onMatchClick?: (match: PatternMatch) => void
}

const CELL_WIDTH = 56
const CELL_HEIGHT = 56
const WIRE_Y_OFFSET = CELL_HEIGHT / 2
const QUBIT_LABEL_WIDTH = 48
const CLASSICAL_SECTION_HEIGHT = 40
const CLASSICAL_WIRE_GAP = 3 // Gap between double lines

export default function CircuitCanvas({
  circuit,
  onDropGate,
  onRemoveGate,
  onMoveGate,
  draggingGate,
  selectedGates,
  onSelectionChange,
  highlightedMatches = [],
  onMatchClick
}: CircuitCanvasProps) {
  const [hoveredCell, setHoveredCell] = useState<{ qubit: number; column: number } | null>(null)
  const [draggingExistingGate, setDraggingExistingGate] = useState<PlacedGate | null>(null)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)

  // Calculate the number of columns needed
  const numColumns = useMemo(() => {
    const maxColumn = circuit.gates.reduce((max, gate) => Math.max(max, gate.column), -1)
    return Math.max(maxColumn + 2, 8) // At least 8 columns, plus one empty after last gate
  }, [circuit.gates])

  // Group gates by position for rendering
  const gatesByPosition = useMemo(() => {
    const map = new Map<string, PlacedGate>()
    circuit.gates.forEach(gate => {
      gate.qubits.forEach(qubit => {
        map.set(`${qubit}-${gate.column}`, gate)
      })
    })
    return map
  }, [circuit.gates])

  // Get measurement gates for drawing connections to classical bits
  const measurementGates = useMemo(() => {
    return circuit.gates.filter(g => g.type === 'MEASURE')
  }, [circuit.gates])

  // Get gates with conditions for showing condition indicators
  const conditionalGates = useMemo(() => {
    return circuit.gates.filter(g => g.condition)
  }, [circuit.gates])

  // Get set of gate IDs that are part of highlighted matches
  const highlightedGateIds = useMemo(() => {
    const ids = new Set<string>()
    highlightedMatches.forEach(match => {
      match.gateIds.forEach(id => ids.add(id))
    })
    return ids
  }, [highlightedMatches])

  // Get the match that a gate belongs to (for click handling)
  const getMatchForGate = useCallback((gateId: string): PatternMatch | undefined => {
    return highlightedMatches.find(match => match.gateIds.includes(gateId))
  }, [highlightedMatches])

  // Check if a cell is occupied (excluding a specific gate if provided)
  const isCellOccupied = (qubitIndex: number, column: number, excludeGateId?: string): boolean => {
    const key = `${qubitIndex}-${column}`
    const existingGate = gatesByPosition.get(key)
    if (!existingGate) return false
    if (excludeGateId && existingGate.id === excludeGateId) return false
    return true
  }

  // Show warning temporarily
  const showWarning = (message: string) => {
    setWarningMessage(message)
    setTimeout(() => setWarningMessage(null), 2000)
  }

  const handleDragOver = (e: React.DragEvent, qubitIndex: number, column: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = draggingExistingGate ? 'move' : 'copy'
    setHoveredCell({ qubit: qubitIndex, column })
  }

  const handleDragLeave = () => {
    setHoveredCell(null)
  }

  const handleDrop = (e: React.DragEvent, qubitIndex: number, column: number) => {
    e.preventDefault()

    // Check if we're moving an existing gate
    const existingGateId = e.dataTransfer.getData('existingGateId')
    if (existingGateId) {
      const movingGate = circuit.gates.find(g => g.id === existingGateId)
      if (movingGate && movingGate.qubits.length > 1) {
        // Multi-qubit gate: check all its qubit positions in the target column
        const blocked = movingGate.qubits.some(q => isCellOccupied(q, column, existingGateId))
        if (blocked) {
          showWarning('Cannot move gate: position already occupied')
          setDraggingExistingGate(null)
          setHoveredCell(null)
          return
        }
      } else {
        // Single-qubit gate: check just the target cell
        if (isCellOccupied(qubitIndex, column, existingGateId)) {
          showWarning('Cannot move gate: position already occupied')
          setDraggingExistingGate(null)
          setHoveredCell(null)
          return
        }
      }
      onMoveGate(existingGateId, qubitIndex, column)
      setDraggingExistingGate(null)
      setHoveredCell(null)
      return
    }

    // Otherwise, it's a new gate from toolbar
    const gateType = e.dataTransfer.getData('gateType') as GateType
    if (gateType) {
      // Check if target cell is occupied
      if (isCellOccupied(qubitIndex, column)) {
        showWarning('Cannot place gate: position already occupied')
        setHoveredCell(null)
        return
      }
      onDropGate(gateType, qubitIndex, column)
    }
    setHoveredCell(null)
  }

  // Handle starting to drag an existing gate
  const handleGateDragStart = (e: React.DragEvent, gate: PlacedGate) => {
    e.dataTransfer.setData('existingGateId', gate.id)
    e.dataTransfer.setData('gateType', gate.type)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingExistingGate(gate)
    // Select the gate being dragged
    onSelectionChange(new Set([gate.id]))
  }

  const handleGateDragEnd = () => {
    setDraggingExistingGate(null)
  }

  // Handle clicking on a gate to select it (supports multi-select with Ctrl/Cmd)
  const handleGateClick = (e: React.MouseEvent, gate: PlacedGate) => {
    e.stopPropagation()

    // Check if this gate is part of a highlighted match
    const match = getMatchForGate(gate.id)
    if (match && onMatchClick) {
      // If clicking a highlighted match, select all gates in the match
      onSelectionChange(new Set(match.gateIds))
      onMatchClick(match)
      return
    }

    // Multi-select with Ctrl (Windows/Linux) or Cmd (Mac)
    if (e.ctrlKey || e.metaKey) {
      const newSelection = new Set(selectedGates)
      if (newSelection.has(gate.id)) {
        newSelection.delete(gate.id)
      } else {
        newSelection.add(gate.id)
      }
      onSelectionChange(newSelection)
    } else {
      // Single select - toggle or replace
      if (selectedGates.size === 1 && selectedGates.has(gate.id)) {
        onSelectionChange(new Set())
      } else {
        onSelectionChange(new Set([gate.id]))
      }
    }
  }

  // Deselect when clicking on empty area
  const handleCanvasClick = () => {
    onSelectionChange(new Set())
  }

  // Render a single cell (drop zone for gates)
  const renderCell = (qubitIndex: number, column: number) => {
    const key = `${qubitIndex}-${column}`
    const gate = gatesByPosition.get(key)
    const isDragging = draggingGate || draggingExistingGate
    const isHovered = hoveredCell?.qubit === qubitIndex && hoveredCell?.column === column && isDragging
    const isGateBeingDragged = draggingExistingGate?.id === gate?.id
    const isSelected = gate ? selectedGates.has(gate.id) : false
    const isHighlighted = gate ? highlightedGateIds.has(gate.id) : false

    // Check if this cell is occupied and being hovered while dragging
    const isOccupiedAndHovered = isHovered && gate && !(draggingExistingGate?.id === gate.id)

    // Check if this is a control qubit for a multi-qubit gate
    const isControlQubit = gate && gate.qubits[0] === qubitIndex && gate.qubits.length > 1 &&
      ['CX', 'CY', 'CZ', 'CH', 'CRX', 'CRY', 'CRZ', 'CP', 'CCX', 'CSWAP'].includes(gate.type)

    // Check if this is a second control for 3-qubit gates
    const isSecondControl = gate && gate.qubits[1] === qubitIndex && gate.qubits.length === 3 &&
      ['CCX', 'CSWAP'].includes(gate.type)

    // Check if this is a swap qubit (either one)
    const isSwapQubit = gate && ['SWAP', 'iSWAP', 'CSWAP'].includes(gate.type) &&
      gate.qubits.includes(qubitIndex)

    // Check if this is part of a BARRIER
    const isBarrier = gate && gate.type === 'BARRIER'

    // Any gate (except barriers) is draggable from any of its qubit positions
    const isGateDraggable = gate && !isBarrier

    return (
      <div
        key={key}
        className={`relative flex items-center justify-center transition-colors ${
          isOccupiedAndHovered ? 'bg-red-100' : isHovered ? 'bg-qcloud-primary/20' : ''
        } ${isGateBeingDragged ? 'opacity-30' : ''}`}
        style={{ width: CELL_WIDTH, height: CELL_HEIGHT }}
        onDragOver={(e) => handleDragOver(e, qubitIndex, column)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, qubitIndex, column)}
      >
        {/* Drop zone indicator */}
        {!gate && (
          <div
            className={`absolute inset-2 rounded border-2 border-dashed transition-colors ${
              isHovered ? 'border-qcloud-primary bg-qcloud-primary/10' : 'border-transparent hover:border-qcloud-border'
            }`}
          />
        )}

        {/* Gate visualization */}
        {gate && (
          <div
            className={`relative group ${
              isSelected
                ? 'ring-2 ring-qcloud-primary ring-offset-1 rounded'
                : isHighlighted
                ? 'ring-2 ring-amber-400 ring-offset-1 rounded animate-pulse'
                : ''
            }`}
            draggable={isGateDraggable && !isBarrier}
            onDragStart={(e) => isGateDraggable && !isBarrier && handleGateDragStart(e, gate)}
            onDragEnd={handleGateDragEnd}
            onClick={(e) => handleGateClick(e, gate)}
            style={{ cursor: isGateDraggable && !isBarrier ? 'grab' : 'pointer' }}
          >
            {isBarrier ? (
              // BARRIER - show dashed line segment
              <div className="w-10 h-10 flex items-center justify-center">
                <svg width="8" height="40" viewBox="0 0 8 40">
                  <line x1="4" y1="0" x2="4" y2="40" stroke="#666666" strokeWidth="2" strokeDasharray="4,3" />
                </svg>
              </div>
            ) : isControlQubit || isSecondControl ? (
              <ControlDot />
            ) : isSwapQubit && gate.type !== 'CSWAP' ? (
              // For regular SWAP, show X mark - Qiskit style
              <div className="w-10 h-10 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <line x1="4" y1="4" x2="16" y2="16" stroke="#1a1a2e" strokeWidth="2.5" />
                  <line x1="16" y1="4" x2="4" y2="16" stroke="#1a1a2e" strokeWidth="2.5" />
                </svg>
              </div>
            ) : gate.qubits[gate.qubits.length - 1] === qubitIndex ? (
              // Target qubit - show the gate
              <div className="relative">
                <PlacedGateIcon gateType={gate.type} params={gate.params} />
                {/* Condition indicator */}
                {gate.condition && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold border border-white">
                    c
                  </div>
                )}
              </div>
            ) : null}

            {/* Delete button on hover - only show on target/main qubit */}
            {gate.qubits[gate.qubits.length - 1] === qubitIndex && !isBarrier && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveGate(gate.id) }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                title="Remove gate"
              >
                ×
              </button>
            )}
            {/* Delete button for barrier - show on first qubit only */}
            {isBarrier && qubitIndex === 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveGate(gate.id) }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                title="Remove barrier"
              >
                ×
              </button>
            )}

            {/* Drag handle indicator for draggable gates */}
            {isGateDraggable && !isBarrier && (
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-4 opacity-0 group-hover:opacity-50 transition-opacity flex flex-col justify-center gap-0.5">
                <div className="w-full h-0.5 bg-gray-400 rounded" />
                <div className="w-full h-0.5 bg-gray-400 rounded" />
                <div className="w-full h-0.5 bg-gray-400 rounded" />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Render vertical connection lines for multi-qubit gates
  const renderConnections = () => {
    const connections: JSX.Element[] = []

    circuit.gates.forEach(gate => {
      if (gate.qubits.length > 1 && gate.type !== 'BARRIER') {
        const minQubit = Math.min(...gate.qubits)
        const maxQubit = Math.max(...gate.qubits)

        const x = QUBIT_LABEL_WIDTH + gate.column * CELL_WIDTH + CELL_WIDTH / 2
        const y1 = minQubit * CELL_HEIGHT + WIRE_Y_OFFSET
        const y2 = maxQubit * CELL_HEIGHT + WIRE_Y_OFFSET

        const isBeingDragged = draggingExistingGate?.id === gate.id

        connections.push(
          <line
            key={`conn-${gate.id}`}
            x1={x}
            y1={y1}
            x2={x}
            y2={y2}
            stroke="#1a1a2e"
            strokeWidth="1.5"
            opacity={isBeingDragged ? 0.3 : 1}
          />
        )
      }
    })

    return connections
  }

  // Render measurement connections to classical bits
  const renderMeasurementConnections = () => {
    const connections: JSX.Element[] = []
    const quantumHeight = circuit.numQubits * CELL_HEIGHT

    measurementGates.forEach(gate => {
      const qubit = gate.qubits[0]
      const classicalBit = gate.classicalBit ?? qubit
      const x = QUBIT_LABEL_WIDTH + gate.column * CELL_WIDTH + CELL_WIDTH / 2
      const y1 = qubit * CELL_HEIGHT + WIRE_Y_OFFSET + 20 // Start below measurement gate
      const y2 = quantumHeight + CLASSICAL_SECTION_HEIGHT / 2 // End at classical wire

      const isBeingDragged = draggingExistingGate?.id === gate.id

      // Vertical line from qubit to classical register
      connections.push(
        <line
          key={`meas-line-${gate.id}`}
          x1={x}
          y1={y1}
          x2={x}
          y2={y2}
          stroke="#1a1a2e"
          strokeWidth="1"
          opacity={isBeingDragged ? 0.3 : 1}
        />
      )

      // Arrow at the bottom
      connections.push(
        <polygon
          key={`meas-arrow-${gate.id}`}
          points={`${x-4},${y2-6} ${x+4},${y2-6} ${x},${y2}`}
          fill="#1a1a2e"
          opacity={isBeingDragged ? 0.3 : 1}
        />
      )

      // Classical bit label
      connections.push(
        <text
          key={`meas-label-${gate.id}`}
          x={x + 8}
          y={y2 + 4}
          fontSize="10"
          fill="#666"
          fontFamily="monospace"
          opacity={isBeingDragged ? 0.3 : 1}
        >
          c[{classicalBit}]
        </text>
      )
    })

    return connections
  }

  // Render conditional gate connections from classical bits
  const renderConditionalConnections = () => {
    const connections: JSX.Element[] = []
    const quantumHeight = circuit.numQubits * CELL_HEIGHT

    conditionalGates.forEach(gate => {
      if (!gate.condition) return

      const qubit = gate.qubits[0]
      const x = QUBIT_LABEL_WIDTH + gate.column * CELL_WIDTH + CELL_WIDTH / 2
      const y1 = quantumHeight + CLASSICAL_SECTION_HEIGHT / 2
      const y2 = qubit * CELL_HEIGHT + WIRE_Y_OFFSET + 20

      const isBeingDragged = draggingExistingGate?.id === gate.id

      // Dashed line from classical register to gate
      connections.push(
        <line
          key={`cond-line-${gate.id}`}
          x1={x}
          y1={y1}
          x2={x}
          y2={y2}
          stroke="#9c27b0"
          strokeWidth="1"
          strokeDasharray="4,2"
          opacity={isBeingDragged ? 0.3 : 1}
        />
      )

      // Condition indicator at classical bit
      connections.push(
        <g key={`cond-indicator-${gate.id}`} opacity={isBeingDragged ? 0.3 : 1}>
          <circle cx={x} cy={y1} r="8" fill="#9c27b0" />
          <text x={x} y={y1 + 3} fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">
            {gate.condition.value}
          </text>
        </g>
      )
    })

    return connections
  }

  const canvasWidth = QUBIT_LABEL_WIDTH + numColumns * CELL_WIDTH
  const quantumHeight = circuit.numQubits * CELL_HEIGHT
  const canvasHeight = quantumHeight + CLASSICAL_SECTION_HEIGHT

  return (
    <div
      className="relative overflow-auto bg-white rounded-lg border border-qcloud-border"
      onClick={handleCanvasClick}
    >
      <div className="relative" style={{ minWidth: canvasWidth, minHeight: canvasHeight }}>
        {/* SVG layer for wires and connections */}
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          width={canvasWidth}
          height={canvasHeight}
        >
          {/* Qubit wires - Qiskit style black */}
          {Array.from({ length: circuit.numQubits }, (_, i) => (
            <line
              key={`wire-${i}`}
              x1={QUBIT_LABEL_WIDTH}
              y1={i * CELL_HEIGHT + WIRE_Y_OFFSET}
              x2={canvasWidth}
              y2={i * CELL_HEIGHT + WIRE_Y_OFFSET}
              stroke="#1a1a2e"
              strokeWidth="1.5"
            />
          ))}

          {/* Classical register - double line */}
          <line
            x1={QUBIT_LABEL_WIDTH}
            y1={quantumHeight + CLASSICAL_SECTION_HEIGHT / 2 - CLASSICAL_WIRE_GAP}
            x2={canvasWidth}
            y2={quantumHeight + CLASSICAL_SECTION_HEIGHT / 2 - CLASSICAL_WIRE_GAP}
            stroke="#1a1a2e"
            strokeWidth="1"
          />
          <line
            x1={QUBIT_LABEL_WIDTH}
            y1={quantumHeight + CLASSICAL_SECTION_HEIGHT / 2 + CLASSICAL_WIRE_GAP}
            x2={canvasWidth}
            y2={quantumHeight + CLASSICAL_SECTION_HEIGHT / 2 + CLASSICAL_WIRE_GAP}
            stroke="#1a1a2e"
            strokeWidth="1"
          />

          {/* Slash mark on classical wire to indicate multiple bits */}
          <line
            x1={QUBIT_LABEL_WIDTH + 15}
            y1={quantumHeight + CLASSICAL_SECTION_HEIGHT / 2 - 8}
            x2={QUBIT_LABEL_WIDTH + 25}
            y2={quantumHeight + CLASSICAL_SECTION_HEIGHT / 2 + 8}
            stroke="#1a1a2e"
            strokeWidth="1"
          />
          <text
            x={QUBIT_LABEL_WIDTH + 30}
            y={quantumHeight + CLASSICAL_SECTION_HEIGHT / 2 - 8}
            fontSize="10"
            fill="#666"
            fontFamily="monospace"
          >
            {circuit.numClassicalBits}
          </text>

          {/* Multi-qubit gate connections */}
          {renderConnections()}

          {/* Measurement connections to classical bits */}
          {renderMeasurementConnections()}

          {/* Conditional gate connections */}
          {renderConditionalConnections()}
        </svg>

        {/* Grid of cells */}
        <div className="relative flex">
          {/* Labels column */}
          <div
            className="flex flex-col flex-shrink-0 bg-qcloud-bg border-r border-qcloud-border"
            style={{ width: QUBIT_LABEL_WIDTH }}
          >
            {/* Qubit labels */}
            {Array.from({ length: circuit.numQubits }, (_, i) => (
              <div
                key={`label-${i}`}
                className="flex items-center justify-center font-mono text-sm text-qcloud-text font-medium"
                style={{ height: CELL_HEIGHT }}
              >
                q<sub>{i}</sub>
              </div>
            ))}
            {/* Classical register label */}
            <div
              className="flex items-center justify-center font-mono text-sm text-qcloud-muted font-medium border-t border-qcloud-border"
              style={{ height: CLASSICAL_SECTION_HEIGHT }}
            >
              c
            </div>
          </div>

          {/* Gate cells */}
          <div className="flex-1">
            {Array.from({ length: circuit.numQubits }, (_, qubitIndex) => (
              <div key={`row-${qubitIndex}`} className="flex">
                {Array.from({ length: numColumns }, (_, column) => renderCell(qubitIndex, column))}
              </div>
            ))}
            {/* Classical register row (no drop zones, just visual) */}
            <div
              className="flex border-t border-qcloud-border"
              style={{ height: CLASSICAL_SECTION_HEIGHT }}
            >
              {/* Empty cells for classical register visualization */}
            </div>
          </div>
        </div>
      </div>

      {/* Drag hint */}
      {draggingExistingGate && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded-full">
          Drop to reposition gate
        </div>
      )}

      {/* Selection count indicator */}
      {selectedGates.size > 0 && !draggingExistingGate && (
        <div className="absolute bottom-2 left-2 bg-qcloud-primary text-white text-xs px-3 py-1 rounded-full">
          {selectedGates.size} gate{selectedGates.size !== 1 ? 's' : ''} selected
        </div>
      )}

      {/* Multi-select hint */}
      {selectedGates.size === 1 && !draggingExistingGate && (
        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
          Ctrl+click to multi-select
        </div>
      )}

      {/* Highlighted matches hint */}
      {highlightedMatches.length > 0 && selectedGates.size === 0 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs px-3 py-1 rounded-full">
          {highlightedMatches.length} match{highlightedMatches.length !== 1 ? 'es' : ''} found - click to select
        </div>
      )}

      {/* Warning message */}
      {warningMessage && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {warningMessage}
        </div>
      )}
    </div>
  )
}

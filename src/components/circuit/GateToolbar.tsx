import { GateType, GATE_DEFINITIONS, GATE_GROUPS } from '../../types/circuit'
import GateIcon from './GateIcon'

interface GateToolbarProps {
  onGateDragStart: (gateType: GateType) => void
}

interface DraggableGateProps {
  gateType: GateType
  onDragStart: (gateType: GateType) => void
}

function DraggableGate({ gateType, onDragStart }: DraggableGateProps) {
  const gate = GATE_DEFINITIONS[gateType]

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('gateType', gateType)
    e.dataTransfer.effectAllowed = 'copy'
    onDragStart(gateType)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="cursor-grab active:cursor-grabbing hover:scale-110 transition-transform group relative"
      title={gate.description}
    >
      <GateIcon gateType={gateType} size="medium" />

      {/* Tooltip */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {gate.name}
        {gate.numParams > 0 && (
          <span className="text-slate-400 ml-1">
            ({gate.paramNames?.join(', ')})
          </span>
        )}
      </div>
    </div>
  )
}

// Color themes for different group categories
const groupStyles: Record<string, { bg: string; border: string; labelBg: string }> = {
  'Pauli': { bg: 'bg-red-50/50', border: 'border-red-200', labelBg: 'bg-red-100' },
  'Basic': { bg: 'bg-blue-50/50', border: 'border-blue-200', labelBg: 'bg-blue-100' },
  'Sqrt-X': { bg: 'bg-purple-50/50', border: 'border-purple-200', labelBg: 'bg-purple-100' },
  'Rotation': { bg: 'bg-amber-50/50', border: 'border-amber-200', labelBg: 'bg-amber-100' },
  'Controlled': { bg: 'bg-cyan-50/50', border: 'border-cyan-200', labelBg: 'bg-cyan-100' },
  'Controlled Rotation': { bg: 'bg-teal-50/50', border: 'border-teal-200', labelBg: 'bg-teal-100' },
  'Swap': { bg: 'bg-indigo-50/50', border: 'border-indigo-200', labelBg: 'bg-indigo-100' },
  'Multi-Qubit': { bg: 'bg-violet-50/50', border: 'border-violet-200', labelBg: 'bg-violet-100' },
  'Measurement': { bg: 'bg-slate-50/50', border: 'border-slate-300', labelBg: 'bg-slate-200' },
  'Dynamic': { bg: 'bg-emerald-50/50', border: 'border-emerald-200', labelBg: 'bg-emerald-100' }
}

// Maximum gates per row for each group
const maxGatesPerRow = 4

export default function GateToolbar({ onGateDragStart }: GateToolbarProps) {
  // Split gates into rows for groups with many gates
  const splitIntoRows = (gates: GateType[]): GateType[][] => {
    const rows: GateType[][] = []
    for (let i = 0; i < gates.length; i += maxGatesPerRow) {
      rows.push(gates.slice(i, i + maxGatesPerRow))
    }
    return rows
  }

  return (
    <div className="bg-white border-b border-qcloud-border px-4 py-3">
      <div className="flex flex-wrap gap-3">
        {GATE_GROUPS.map((group) => {
          const style = groupStyles[group.name] || { bg: 'bg-gray-50/50', border: 'border-gray-200', labelBg: 'bg-gray-100' }
          const gateRows = splitIntoRows(group.gates)

          return (
            <div
              key={group.name}
              className={`rounded-lg border ${style.border} ${style.bg} p-2 flex flex-col gap-2`}
            >
              {/* Group label */}
              <span className={`text-[10px] font-semibold text-qcloud-text uppercase tracking-wide px-2 py-0.5 rounded ${style.labelBg} self-start`}>
                {group.name}
              </span>

              {/* Gates in rows */}
              <div className="flex flex-col gap-1">
                {gateRows.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex gap-1">
                    {row.map((gateType) => (
                      <DraggableGate
                        key={gateType}
                        gateType={gateType}
                        onDragStart={onGateDragStart}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-qcloud-border/50">
        <p className="text-xs text-qcloud-muted">
          Drag gates to the circuit below. Multi-qubit gates will prompt for target qubits.
        </p>
      </div>
    </div>
  )
}

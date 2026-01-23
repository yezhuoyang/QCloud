import { useState, useEffect } from 'react'
import { GateType, GATE_DEFINITIONS, GateCondition } from '../../types/circuit'
import { parseParameter } from '../../utils/circuitCompiler'
import GateIcon from './GateIcon'

interface ParameterModalProps {
  isOpen: boolean
  gateType: GateType
  onConfirm: (params: number[]) => void
  onCancel: () => void
}

export default function ParameterModal({ isOpen, gateType, onConfirm, onCancel }: ParameterModalProps) {
  const gate = GATE_DEFINITIONS[gateType]
  const [paramValues, setParamValues] = useState<string[]>([])

  // Reset values when modal opens with new gate
  useEffect(() => {
    if (isOpen && gate.numParams > 0) {
      setParamValues(new Array(gate.numParams).fill('pi/2'))
    }
  }, [isOpen, gateType, gate.numParams])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsedParams = paramValues.map(parseParameter)
    onConfirm(parsedParams)
  }

  const handleParamChange = (index: number, value: string) => {
    const newValues = [...paramValues]
    newValues[index] = value
    setParamValues(newValues)
  }

  const presets = [
    { label: 'π', value: 'pi' },
    { label: 'π/2', value: 'pi/2' },
    { label: 'π/4', value: 'pi/4' },
    { label: '-π/2', value: '-pi/2' },
    { label: '0', value: '0' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <GateIcon gateType={gateType} size="large" />
          <div>
            <h2 className="text-xl font-bold text-qcloud-text">{gate.name}</h2>
            <p className="text-sm text-qcloud-muted">{gate.description}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {gate.paramNames?.map((paramName, index) => (
              <div key={paramName}>
                <label className="block text-sm font-medium text-qcloud-text mb-1">
                  {paramName} (rotation angle)
                </label>
                <input
                  type="text"
                  value={paramValues[index] || ''}
                  onChange={(e) => handleParamChange(index, e.target.value)}
                  placeholder="e.g., pi/2, 3.14, pi/4"
                  className="w-full px-3 py-2 border border-qcloud-border rounded-lg focus:outline-none focus:ring-2 focus:ring-qcloud-primary/50 font-mono"
                  autoFocus={index === 0}
                />
                <div className="flex gap-2 mt-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => handleParamChange(index, preset.value)}
                      className="px-2 py-1 text-xs bg-qcloud-bg hover:bg-qcloud-border rounded border border-qcloud-border transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-qcloud-muted hover:text-qcloud-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-qcloud-primary to-qcloud-secondary text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Add Gate
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal for selecting qubits for multi-qubit gates
interface QubitSelectionModalProps {
  isOpen: boolean
  gateType: GateType
  numQubits: number
  onConfirm: (qubits: number[]) => void
  onCancel: () => void
}

export function QubitSelectionModal({ isOpen, gateType, numQubits, onConfirm, onCancel }: QubitSelectionModalProps) {
  const gate = GATE_DEFINITIONS[gateType]
  const [selectedQubits, setSelectedQubits] = useState<number[]>([])

  useEffect(() => {
    if (isOpen) {
      setSelectedQubits([])
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleQubitClick = (qubitIndex: number) => {
    if (selectedQubits.includes(qubitIndex)) {
      // Remove if already selected
      setSelectedQubits(selectedQubits.filter(q => q !== qubitIndex))
    } else if (selectedQubits.length < gate.numQubits) {
      // Add if we need more qubits
      setSelectedQubits([...selectedQubits, qubitIndex])
    }
  }

  const handleConfirm = () => {
    if (selectedQubits.length === gate.numQubits) {
      onConfirm(selectedQubits)
    }
  }

  const getQubitLabel = (index: number): string => {
    const position = selectedQubits.indexOf(index)
    if (position === -1) return ''

    if (gate.numQubits === 2) {
      return position === 0 ? 'Control' : 'Target'
    } else if (gate.numQubits === 3) {
      if (gateType === 'CCX') {
        return ['Control 1', 'Control 2', 'Target'][position]
      } else {
        return ['Control', 'Target 1', 'Target 2'][position]
      }
    }
    return `Qubit ${position + 1}`
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <GateIcon gateType={gateType} size="large" />
          <div>
            <h2 className="text-xl font-bold text-qcloud-text">{gate.name}</h2>
            <p className="text-sm text-qcloud-muted">
              Select {gate.numQubits} qubits ({selectedQubits.length} selected)
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <p className="text-sm text-qcloud-muted mb-3">
            Click qubits in order: {gateType === 'CCX' ? 'Control 1 → Control 2 → Target' :
              gate.numQubits === 2 ? 'Control → Target' : 'Control → Target 1 → Target 2'}
          </p>
          {Array.from({ length: numQubits }, (_, i) => (
            <button
              key={i}
              onClick={() => handleQubitClick(i)}
              className={`w-full px-4 py-3 rounded-lg border-2 flex items-center justify-between transition-all ${
                selectedQubits.includes(i)
                  ? 'border-qcloud-primary bg-qcloud-primary/10'
                  : 'border-qcloud-border hover:border-qcloud-primary/50'
              }`}
            >
              <span className="font-mono text-qcloud-text">q{i}</span>
              {selectedQubits.includes(i) && (
                <span className="text-sm text-qcloud-primary font-medium">
                  {getQubitLabel(i)}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-qcloud-muted hover:text-qcloud-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedQubits.length !== gate.numQubits}
            className="px-4 py-2 bg-gradient-to-r from-qcloud-primary to-qcloud-secondary text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Gate
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal for configuring conditional (IF_ELSE) gates
interface ConditionModalProps {
  isOpen: boolean
  numClassicalBits: number
  onConfirm: (condition: GateCondition) => void
  onCancel: () => void
}

export function ConditionModal({ isOpen, numClassicalBits, onConfirm, onCancel }: ConditionModalProps) {
  const [classicalBit, setClassicalBit] = useState(0)
  const [value, setValue] = useState(1)

  useEffect(() => {
    if (isOpen) {
      setClassicalBit(0)
      setValue(1)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm({ classicalBit, value })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <GateIcon gateType="IF_ELSE" size="large" />
          <div>
            <h2 className="text-xl font-bold text-qcloud-text">Conditional Gate</h2>
            <p className="text-sm text-qcloud-muted">
              Configure classical feedforward condition
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-qcloud-text mb-2">
              Classical Bit to Check
            </label>
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: numClassicalBits }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setClassicalBit(i)}
                  className={`px-4 py-2 rounded-lg border-2 font-mono transition-all ${
                    classicalBit === i
                      ? 'border-qcloud-primary bg-qcloud-primary/10 text-qcloud-primary'
                      : 'border-qcloud-border hover:border-qcloud-primary/50 text-qcloud-text'
                  }`}
                >
                  c[{i}]
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-qcloud-text mb-2">
              Condition Value
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setValue(0)}
                className={`flex-1 px-4 py-3 rounded-lg border-2 font-mono transition-all ${
                  value === 0
                    ? 'border-qcloud-primary bg-qcloud-primary/10 text-qcloud-primary'
                    : 'border-qcloud-border hover:border-qcloud-primary/50 text-qcloud-text'
                }`}
              >
                0 (|0⟩ measured)
              </button>
              <button
                onClick={() => setValue(1)}
                className={`flex-1 px-4 py-3 rounded-lg border-2 font-mono transition-all ${
                  value === 1
                    ? 'border-qcloud-primary bg-qcloud-primary/10 text-qcloud-primary'
                    : 'border-qcloud-border hover:border-qcloud-primary/50 text-qcloud-text'
                }`}
              >
                1 (|1⟩ measured)
              </button>
            </div>
          </div>

          <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200">
            <p className="text-sm text-cyan-800">
              <strong>Condition:</strong> Execute if c[{classicalBit}] == {value}
            </p>
            <p className="text-xs text-cyan-600 mt-1">
              The next gate you add will only execute when this condition is met.
              This enables quantum error correction and adaptive algorithms.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-qcloud-muted hover:text-qcloud-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-gradient-to-r from-qcloud-primary to-qcloud-secondary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Set Condition
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal for adding a conditional gate (select gate + set condition)
interface ConditionalGateModalProps {
  isOpen: boolean
  numClassicalBits: number
  availableGates: GateType[]
  onConfirm: (gateType: GateType, condition: GateCondition) => void
  onCancel: () => void
}

export function ConditionalGateModal({ isOpen, numClassicalBits, availableGates, onConfirm, onCancel }: ConditionalGateModalProps) {
  const [selectedGate, setSelectedGate] = useState<GateType | null>(null)
  const [classicalBit, setClassicalBit] = useState(0)
  const [value, setValue] = useState(1)

  useEffect(() => {
    if (isOpen) {
      setSelectedGate(null)
      setClassicalBit(0)
      setValue(1)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleConfirm = () => {
    if (selectedGate) {
      onConfirm(selectedGate, { classicalBit, value })
    }
  }

  // Filter to simple single-qubit gates for conditional execution
  const simpleGates: GateType[] = ['X', 'Y', 'Z', 'H', 'S', 'T', 'RX', 'RY', 'RZ']
  const filteredGates = availableGates.filter(g => simpleGates.includes(g))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <GateIcon gateType="IF_ELSE" size="large" />
          <div>
            <h2 className="text-xl font-bold text-qcloud-text">Add Conditional Gate</h2>
            <p className="text-sm text-qcloud-muted">
              Classical feedforward: apply gate based on measurement
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {/* Gate selection */}
          <div>
            <label className="block text-sm font-medium text-qcloud-text mb-2">
              Select Gate to Apply
            </label>
            <div className="flex gap-2 flex-wrap">
              {filteredGates.map(gateType => {
                const gate = GATE_DEFINITIONS[gateType]
                return (
                  <button
                    key={gateType}
                    onClick={() => setSelectedGate(gateType)}
                    className={`p-2 rounded-lg border-2 transition-all ${
                      selectedGate === gateType
                        ? 'border-qcloud-primary bg-qcloud-primary/10'
                        : 'border-qcloud-border hover:border-qcloud-primary/50'
                    }`}
                    title={gate.description}
                  >
                    <GateIcon gateType={gateType} size="small" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Classical bit selection */}
          <div>
            <label className="block text-sm font-medium text-qcloud-text mb-2">
              Classical Bit to Check
            </label>
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: numClassicalBits }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setClassicalBit(i)}
                  className={`px-3 py-1 rounded border-2 font-mono text-sm transition-all ${
                    classicalBit === i
                      ? 'border-qcloud-primary bg-qcloud-primary/10 text-qcloud-primary'
                      : 'border-qcloud-border hover:border-qcloud-primary/50 text-qcloud-text'
                  }`}
                >
                  c[{i}]
                </button>
              ))}
            </div>
          </div>

          {/* Value selection */}
          <div>
            <label className="block text-sm font-medium text-qcloud-text mb-2">
              Execute When Value Is
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setValue(0)}
                className={`flex-1 px-3 py-2 rounded border-2 font-mono text-sm transition-all ${
                  value === 0
                    ? 'border-qcloud-primary bg-qcloud-primary/10 text-qcloud-primary'
                    : 'border-qcloud-border hover:border-qcloud-primary/50 text-qcloud-text'
                }`}
              >
                0
              </button>
              <button
                onClick={() => setValue(1)}
                className={`flex-1 px-3 py-2 rounded border-2 font-mono text-sm transition-all ${
                  value === 1
                    ? 'border-qcloud-primary bg-qcloud-primary/10 text-qcloud-primary'
                    : 'border-qcloud-border hover:border-qcloud-primary/50 text-qcloud-text'
                }`}
              >
                1
              </button>
            </div>
          </div>

          {selectedGate && (
            <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200">
              <p className="text-sm text-cyan-800">
                <strong>Result:</strong> Apply {GATE_DEFINITIONS[selectedGate].name} if c[{classicalBit}] == {value}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-qcloud-muted hover:text-qcloud-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedGate}
            className="px-4 py-2 bg-gradient-to-r from-qcloud-primary to-qcloud-secondary text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Conditional Gate
          </button>
        </div>
      </div>
    </div>
  )
}

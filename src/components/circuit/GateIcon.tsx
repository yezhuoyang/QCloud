import { GateType, GATE_DEFINITIONS, GateDefinition } from '../../types/circuit'

interface GateIconProps {
  gateType: GateType
  size?: 'small' | 'medium' | 'large'
  showLabel?: boolean
  params?: number[]
  className?: string
}

const sizeMap = {
  small: { width: 32, height: 32, fontSize: 10 },
  medium: { width: 40, height: 40, fontSize: 12 },
  large: { width: 48, height: 48, fontSize: 14 },
}

// Qiskit-style: dark text on light backgrounds, white text on dark backgrounds
const getTextColor = (gateType: GateType): string => {
  const darkTextGates = ['X', 'Y', 'Z', 'I', 'H', 'S', 'Sdg', 'T', 'Tdg', 'P', 'SX', 'SXdg',
                         'RX', 'RY', 'RZ', 'U', 'CX', 'CY', 'CZ', 'CH', 'CRX', 'CRY', 'CRZ',
                         'CP', 'SWAP', 'iSWAP', 'CCX', 'CSWAP', 'RESET']
  return darkTextGates.includes(gateType) ? '#1a1a2e' : '#ffffff'
}

export default function GateIcon({ gateType, size = 'medium', showLabel = true, params, className = '' }: GateIconProps) {
  const gate: GateDefinition = GATE_DEFINITIONS[gateType]
  const { width, height, fontSize } = sizeMap[size]
  const textColor = getTextColor(gateType)

  // Special rendering for measurement - Qiskit style black box with meter
  if (gateType === 'MEASURE') {
    return (
      <svg width={width} height={height} viewBox="0 0 40 40" className={className}>
        <rect x="2" y="2" width="36" height="36" rx="2" fill={gate.color} stroke="#000" strokeWidth="1" />
        {/* Meter arc */}
        <path
          d="M10 26 Q20 8 30 26"
          stroke="white"
          strokeWidth="2"
          fill="none"
        />
        {/* Meter needle */}
        <line x1="20" y1="26" x2="28" y2="12" stroke="white" strokeWidth="2" />
        {/* Base line */}
        <line x1="8" y1="28" x2="32" y2="28" stroke="white" strokeWidth="1.5" />
      </svg>
    )
  }

  // Special rendering for RESET gate - Qiskit style
  if (gateType === 'RESET') {
    return (
      <svg width={width} height={height} viewBox="0 0 40 40" className={className}>
        <rect x="2" y="2" width="36" height="36" rx="2" fill={gate.color} stroke="#666" strokeWidth="1" />
        {/* |0⟩ symbol */}
        <text x="20" y="26" textAnchor="middle" fill={textColor} fontSize="12" fontWeight="600" fontFamily="serif">
          |0⟩
        </text>
      </svg>
    )
  }

  // Special rendering for BARRIER - Qiskit style dashed line
  if (gateType === 'BARRIER') {
    return (
      <svg width={width} height={height} viewBox="0 0 40 40" className={className}>
        <rect x="2" y="2" width="36" height="36" rx="2" fill="transparent" />
        {/* Vertical dashed line */}
        <line x1="20" y1="4" x2="20" y2="36" stroke="#666666" strokeWidth="2" strokeDasharray="4,3" />
      </svg>
    )
  }

  // Special rendering for IF_ELSE (conditional block)
  if (gateType === 'IF_ELSE') {
    return (
      <svg width={width} height={height} viewBox="0 0 40 40" className={className}>
        <rect x="2" y="2" width="36" height="36" rx="2" fill={gate.color} stroke="#7b1fa2" strokeWidth="1" />
        {/* Diamond shape for condition */}
        <polygon points="20,10 30,20 20,30 10,20" fill="none" stroke="white" strokeWidth="1.5" />
        {/* "if" text */}
        <text x="20" y="23" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
          if
        </text>
      </svg>
    )
  }

  // Special rendering for controlled gates (show control dot indicator)
  const isControlled = ['CX', 'CY', 'CZ', 'CH', 'CRX', 'CRY', 'CRZ', 'CP', 'CCX', 'CSWAP'].includes(gateType)

  // Special rendering for SWAP gates - Qiskit style X marks
  if (gateType === 'SWAP' || gateType === 'iSWAP') {
    return (
      <svg width={width} height={height} viewBox="0 0 40 40" className={className}>
        <rect x="2" y="2" width="36" height="36" rx="2" fill={gate.color} stroke="#5a8dc8" strokeWidth="1" />
        {/* X marks for swap */}
        <line x1="12" y1="12" x2="28" y2="28" stroke={textColor} strokeWidth="2.5" />
        <line x1="28" y1="12" x2="12" y2="28" stroke={textColor} strokeWidth="2.5" />
        {showLabel && gateType === 'iSWAP' && (
          <text x="20" y="36" textAnchor="middle" fill={textColor} fontSize="8" fontWeight="bold">i</text>
        )}
      </svg>
    )
  }

  // Special rendering for CX (CNOT) - show + symbol
  if (gateType === 'CX' || gateType === 'CCX') {
    return (
      <svg width={width} height={height} viewBox="0 0 40 40" className={className}>
        <rect x="2" y="2" width="36" height="36" rx="2" fill={gate.color} stroke="#5a8dc8" strokeWidth="1" />
        {/* Circle with + (XOR symbol) */}
        <circle cx="20" cy="20" r="12" fill="none" stroke={textColor} strokeWidth="2" />
        <line x1="20" y1="10" x2="20" y2="30" stroke={textColor} strokeWidth="2" />
        <line x1="10" y1="20" x2="30" y2="20" stroke={textColor} strokeWidth="2" />
      </svg>
    )
  }

  // Standard gate box - Qiskit style
  return (
    <svg width={width} height={height} viewBox="0 0 40 40" className={className}>
      {/* Gate box with border */}
      <rect x="2" y="2" width="36" height="36" rx="2" fill={gate.color} stroke={gate.color === '#1a1a2e' ? '#333' : '#00000033'} strokeWidth="1" />

      {/* Control indicator for controlled gates */}
      {isControlled && (
        <circle cx="8" cy="8" r="3" fill={textColor} />
      )}

      {/* Gate symbol */}
      {showLabel && (
        <text
          x="20"
          y={gate.numParams > 0 && params && params.length > 0 ? "20" : "24"}
          textAnchor="middle"
          fill={textColor}
          fontSize={fontSize}
          fontWeight="600"
          fontFamily="'Fira Code', monospace"
        >
          {gate.symbol}
        </text>
      )}

      {/* Parameter indicator */}
      {gate.numParams > 0 && params && params.length > 0 && (
        <text
          x="20"
          y="32"
          textAnchor="middle"
          fill={textColor}
          fontSize="8"
          opacity="0.7"
        >
          {params[0].toFixed(2)}
        </text>
      )}
    </svg>
  )
}

// Compact gate display for placed gates on circuit - Qiskit style
interface PlacedGateIconProps {
  gateType: GateType
  params?: number[]
}

export function PlacedGateIcon({ gateType, params }: PlacedGateIconProps) {
  const gate: GateDefinition = GATE_DEFINITIONS[gateType]
  const textColor = getTextColor(gateType)

  // Measurement icon - Qiskit style black box
  if (gateType === 'MEASURE') {
    return (
      <div
        className="w-10 h-10 rounded-sm flex items-center justify-center border border-black"
        style={{ backgroundColor: gate.color }}
        title={gate.description}
      >
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path d="M4 17 Q12 3 20 17" stroke="white" strokeWidth="1.5" fill="none" />
          <line x1="12" y1="17" x2="18" y2="7" stroke="white" strokeWidth="1.5" />
          <line x1="2" y1="19" x2="22" y2="19" stroke="white" strokeWidth="1.5" />
        </svg>
      </div>
    )
  }

  // RESET icon - Qiskit style
  if (gateType === 'RESET') {
    return (
      <div
        className="w-10 h-10 rounded-sm flex items-center justify-center font-serif font-semibold text-xs border"
        style={{ backgroundColor: gate.color, color: textColor, borderColor: '#666' }}
        title={gate.description}
      >
        |0⟩
      </div>
    )
  }

  // BARRIER icon - Qiskit style dashed line (no box)
  if (gateType === 'BARRIER') {
    return (
      <div
        className="w-10 h-10 flex items-center justify-center"
        title={gate.description}
      >
        <svg width="8" height="40" viewBox="0 0 8 40">
          <line x1="4" y1="0" x2="4" y2="40" stroke="#666666" strokeWidth="2" strokeDasharray="4,3" />
        </svg>
      </div>
    )
  }

  // IF_ELSE icon
  if (gateType === 'IF_ELSE') {
    return (
      <div
        className="w-10 h-10 rounded-sm flex items-center justify-center border"
        style={{ backgroundColor: gate.color, borderColor: '#7b1fa2' }}
        title={gate.description}
      >
        <svg width="24" height="24" viewBox="0 0 24 24">
          <polygon points="12,4 20,12 12,20 4,12" fill="none" stroke="white" strokeWidth="1.5" />
          <text x="12" y="14" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">if</text>
        </svg>
      </div>
    )
  }

  // CX/CCX (CNOT/Toffoli) target - Qiskit style XOR circle
  if (gateType === 'CX' || gateType === 'CCX') {
    return (
      <div
        className="w-10 h-10 rounded-sm flex items-center justify-center border"
        style={{ backgroundColor: gate.color, borderColor: '#5a8dc8' }}
        title={gate.description}
      >
        <svg width="24" height="24" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" fill="none" stroke={textColor} strokeWidth="1.5" />
          <line x1="12" y1="4" x2="12" y2="20" stroke={textColor} strokeWidth="1.5" />
          <line x1="4" y1="12" x2="20" y2="12" stroke={textColor} strokeWidth="1.5" />
        </svg>
      </div>
    )
  }

  // Control dot for other multi-qubit gates (CY, CZ, CH, etc.)
  if (gateType === 'CY' || gateType === 'CZ' || gateType === 'CH' ||
      gateType === 'CRX' || gateType === 'CRY' || gateType === 'CRZ' || gateType === 'CP') {
    return (
      <div className="flex flex-col items-center">
        <div
          className="w-10 h-10 rounded-sm flex items-center justify-center font-mono font-semibold text-sm border"
          style={{ backgroundColor: gate.color, color: textColor, borderColor: '#5a8dc8' }}
          title={gate.description}
        >
          {gate.symbol}
        </div>
      </div>
    )
  }

  // SWAP visualization - Qiskit style X marks
  if (gateType === 'SWAP' || gateType === 'iSWAP' || gateType === 'CSWAP') {
    return (
      <div
        className="w-10 h-10 rounded-sm flex items-center justify-center border"
        style={{ backgroundColor: gate.color, borderColor: '#5a8dc8' }}
        title={gate.description}
      >
        <svg width="20" height="20" viewBox="0 0 20 20">
          <line x1="4" y1="4" x2="16" y2="16" stroke={textColor} strokeWidth="2.5" />
          <line x1="16" y1="4" x2="4" y2="16" stroke={textColor} strokeWidth="2.5" />
        </svg>
      </div>
    )
  }

  // Standard gate - Qiskit style with dark text
  return (
    <div
      className="w-10 h-10 rounded-sm flex flex-col items-center justify-center font-mono font-semibold text-sm border"
      style={{
        backgroundColor: gate.color,
        color: textColor,
        borderColor: gate.color === '#1a1a2e' ? '#333' : '#00000022'
      }}
      title={`${gate.name}${params?.length ? ` (${params.map(p => p.toFixed(2)).join(', ')})` : ''}`}
    >
      <span>{gate.symbol}</span>
      {params && params.length > 0 && (
        <span className="text-[7px] opacity-70">{params[0].toFixed(2)}</span>
      )}
    </div>
  )
}

// Control dot component for multi-qubit gates - Qiskit style filled black circle
export function ControlDot() {
  return (
    <div className="w-10 h-10 flex items-center justify-center">
      <div className="w-3 h-3 rounded-full bg-[#1a1a2e]" />
    </div>
  )
}

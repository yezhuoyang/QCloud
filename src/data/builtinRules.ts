import { IdentityRule } from '../types/identityRules'

export const BUILTIN_IDENTITY_RULES: IdentityRule[] = [
  // ===== CANCELLATION RULES (gates that cancel to identity) =====

  {
    id: 'pauli-x-cancel',
    name: 'Pauli-X Cancellation',
    description: 'Two consecutive X gates cancel out (X·X = I)',
    category: 'cancellation',
    isBuiltin: true,
    pattern: [
      { type: 'X', qubitRef: 'q0' },
      { type: 'X', qubitRef: 'q0' }
    ],
    constraints: [
      { type: 'same_qubit', elements: [0, 1] },
      { type: 'adjacent_columns', elements: [0, 1] }
    ],
    replacement: { type: 'identity' },
    visualPattern: 'X X = I',
    reversible: false
  },

  {
    id: 'pauli-y-cancel',
    name: 'Pauli-Y Cancellation',
    description: 'Two consecutive Y gates cancel out (Y·Y = I)',
    category: 'cancellation',
    isBuiltin: true,
    pattern: [
      { type: 'Y', qubitRef: 'q0' },
      { type: 'Y', qubitRef: 'q0' }
    ],
    constraints: [
      { type: 'same_qubit', elements: [0, 1] },
      { type: 'adjacent_columns', elements: [0, 1] }
    ],
    replacement: { type: 'identity' },
    visualPattern: 'Y Y = I',
    reversible: false
  },

  {
    id: 'pauli-z-cancel',
    name: 'Pauli-Z Cancellation',
    description: 'Two consecutive Z gates cancel out (Z·Z = I)',
    category: 'cancellation',
    isBuiltin: true,
    pattern: [
      { type: 'Z', qubitRef: 'q0' },
      { type: 'Z', qubitRef: 'q0' }
    ],
    constraints: [
      { type: 'same_qubit', elements: [0, 1] },
      { type: 'adjacent_columns', elements: [0, 1] }
    ],
    replacement: { type: 'identity' },
    visualPattern: 'Z Z = I',
    reversible: false
  },

  {
    id: 'hadamard-cancel',
    name: 'Hadamard Cancellation',
    description: 'Two consecutive H gates cancel out (H·H = I)',
    category: 'cancellation',
    isBuiltin: true,
    pattern: [
      { type: 'H', qubitRef: 'q0' },
      { type: 'H', qubitRef: 'q0' }
    ],
    constraints: [
      { type: 'same_qubit', elements: [0, 1] },
      { type: 'adjacent_columns', elements: [0, 1] }
    ],
    replacement: { type: 'identity' },
    visualPattern: 'H H = I',
    reversible: false
  },

  {
    id: 'cnot-cancel',
    name: 'CNOT Cancellation',
    description: 'Two consecutive CNOTs with same control/target cancel',
    category: 'cancellation',
    isBuiltin: true,
    pattern: [
      { type: 'CX', qubitRef: 'q0,q1' },
      { type: 'CX', qubitRef: 'q0,q1' }
    ],
    constraints: [
      { type: 'same_qubit', elements: [0, 1] },
      { type: 'adjacent_columns', elements: [0, 1] }
    ],
    replacement: { type: 'identity' },
    visualPattern: 'CX CX = I',
    reversible: false
  },

  {
    id: 'cz-cancel',
    name: 'CZ Cancellation',
    description: 'Two consecutive CZ gates with same qubits cancel',
    category: 'cancellation',
    isBuiltin: true,
    pattern: [
      { type: 'CZ', qubitRef: 'q0,q1' },
      { type: 'CZ', qubitRef: 'q0,q1' }
    ],
    constraints: [
      { type: 'same_qubit', elements: [0, 1] },
      { type: 'adjacent_columns', elements: [0, 1] }
    ],
    replacement: { type: 'identity' },
    visualPattern: 'CZ CZ = I',
    reversible: false
  },

  {
    id: 'swap-cancel',
    name: 'SWAP Cancellation',
    description: 'Two consecutive SWAP gates cancel',
    category: 'cancellation',
    isBuiltin: true,
    pattern: [
      { type: 'SWAP', qubitRef: 'q0,q1' },
      { type: 'SWAP', qubitRef: 'q0,q1' }
    ],
    constraints: [
      { type: 'same_qubit', elements: [0, 1] },
      { type: 'adjacent_columns', elements: [0, 1] }
    ],
    replacement: { type: 'identity' },
    visualPattern: 'SWAP SWAP = I',
    reversible: false
  },

  {
    id: 's-sdg-cancel',
    name: 'S and S† Cancellation',
    description: 'S followed by S-dagger cancels (S·S† = I)',
    category: 'cancellation',
    isBuiltin: true,
    pattern: [
      { type: 'S', qubitRef: 'q0' },
      { type: 'Sdg', qubitRef: 'q0' }
    ],
    constraints: [
      { type: 'same_qubit', elements: [0, 1] },
      { type: 'adjacent_columns', elements: [0, 1] }
    ],
    replacement: { type: 'identity' },
    visualPattern: 'S S† = I',
    reversible: true
  },

  {
    id: 'sdg-s-cancel',
    name: 'S† and S Cancellation',
    description: 'S-dagger followed by S cancels (S†·S = I)',
    category: 'cancellation',
    isBuiltin: true,
    pattern: [
      { type: 'Sdg', qubitRef: 'q0' },
      { type: 'S', qubitRef: 'q0' }
    ],
    constraints: [
      { type: 'same_qubit', elements: [0, 1] },
      { type: 'adjacent_columns', elements: [0, 1] }
    ],
    replacement: { type: 'identity' },
    visualPattern: 'S† S = I',
    reversible: true
  },

  {
    id: 't-tdg-cancel',
    name: 'T and T† Cancellation',
    description: 'T followed by T-dagger cancels (T·T† = I)',
    category: 'cancellation',
    isBuiltin: true,
    pattern: [
      { type: 'T', qubitRef: 'q0' },
      { type: 'Tdg', qubitRef: 'q0' }
    ],
    constraints: [
      { type: 'same_qubit', elements: [0, 1] },
      { type: 'adjacent_columns', elements: [0, 1] }
    ],
    replacement: { type: 'identity' },
    visualPattern: 'T T† = I',
    reversible: true
  },

  {
    id: 'tdg-t-cancel',
    name: 'T† and T Cancellation',
    description: 'T-dagger followed by T cancels (T†·T = I)',
    category: 'cancellation',
    isBuiltin: true,
    pattern: [
      { type: 'Tdg', qubitRef: 'q0' },
      { type: 'T', qubitRef: 'q0' }
    ],
    constraints: [
      { type: 'same_qubit', elements: [0, 1] },
      { type: 'adjacent_columns', elements: [0, 1] }
    ],
    replacement: { type: 'identity' },
    visualPattern: 'T† T = I',
    reversible: true
  },

  {
    id: 'sx-sxdg-cancel',
    name: '√X and √X† Cancellation',
    description: 'SX followed by SX-dagger cancels',
    category: 'cancellation',
    isBuiltin: true,
    pattern: [
      { type: 'SX', qubitRef: 'q0' },
      { type: 'SXdg', qubitRef: 'q0' }
    ],
    constraints: [
      { type: 'same_qubit', elements: [0, 1] },
      { type: 'adjacent_columns', elements: [0, 1] }
    ],
    replacement: { type: 'identity' },
    visualPattern: '√X √X† = I',
    reversible: true
  },

  // ===== SIMPLIFICATION RULES (combine to simpler form) =====

  {
    id: 'ss-to-z',
    name: 'S² = Z',
    description: 'Two S gates equal one Z gate',
    category: 'simplification',
    isBuiltin: true,
    pattern: [
      { type: 'S', qubitRef: 'q0' },
      { type: 'S', qubitRef: 'q0' }
    ],
    constraints: [
      { type: 'same_qubit', elements: [0, 1] },
      { type: 'adjacent_columns', elements: [0, 1] }
    ],
    replacement: {
      type: 'single_gate',
      gates: [{ type: 'Z', qubitRef: 'q0' }]
    },
    visualPattern: 'S S = Z',
    reversible: true
  },

  {
    id: 'tt-to-s',
    name: 'T² = S',
    description: 'Two T gates equal one S gate',
    category: 'simplification',
    isBuiltin: true,
    pattern: [
      { type: 'T', qubitRef: 'q0' },
      { type: 'T', qubitRef: 'q0' }
    ],
    constraints: [
      { type: 'same_qubit', elements: [0, 1] },
      { type: 'adjacent_columns', elements: [0, 1] }
    ],
    replacement: {
      type: 'single_gate',
      gates: [{ type: 'S', qubitRef: 'q0' }]
    },
    visualPattern: 'T T = S',
    reversible: true
  },

  {
    id: 'sxsx-to-x',
    name: '√X² = X',
    description: 'Two √X gates equal one X gate',
    category: 'simplification',
    isBuiltin: true,
    pattern: [
      { type: 'SX', qubitRef: 'q0' },
      { type: 'SX', qubitRef: 'q0' }
    ],
    constraints: [
      { type: 'same_qubit', elements: [0, 1] },
      { type: 'adjacent_columns', elements: [0, 1] }
    ],
    replacement: {
      type: 'single_gate',
      gates: [{ type: 'X', qubitRef: 'q0' }]
    },
    visualPattern: '√X √X = X',
    reversible: true
  },

  {
    id: 'rz-combine',
    name: 'RZ Rotation Merge',
    description: 'Combine consecutive RZ rotations: Rz(θ)·Rz(φ) = Rz(θ+φ)',
    category: 'simplification',
    isBuiltin: true,
    pattern: [
      { type: 'RZ', qubitRef: 'q0', paramsRef: 'theta1' },
      { type: 'RZ', qubitRef: 'q0', paramsRef: 'theta2' }
    ],
    constraints: [
      { type: 'same_qubit', elements: [0, 1] },
      { type: 'adjacent_columns', elements: [0, 1] }
    ],
    replacement: {
      type: 'param_combine',
      gates: [{ type: 'RZ', qubitRef: 'q0', paramsExpr: 'theta1 + theta2' }]
    },
    visualPattern: 'Rz(θ) Rz(φ) = Rz(θ+φ)',
    reversible: false
  },

  {
    id: 'rx-combine',
    name: 'RX Rotation Merge',
    description: 'Combine consecutive RX rotations: Rx(θ)·Rx(φ) = Rx(θ+φ)',
    category: 'simplification',
    isBuiltin: true,
    pattern: [
      { type: 'RX', qubitRef: 'q0', paramsRef: 'theta1' },
      { type: 'RX', qubitRef: 'q0', paramsRef: 'theta2' }
    ],
    constraints: [
      { type: 'same_qubit', elements: [0, 1] },
      { type: 'adjacent_columns', elements: [0, 1] }
    ],
    replacement: {
      type: 'param_combine',
      gates: [{ type: 'RX', qubitRef: 'q0', paramsExpr: 'theta1 + theta2' }]
    },
    visualPattern: 'Rx(θ) Rx(φ) = Rx(θ+φ)',
    reversible: false
  },

  {
    id: 'ry-combine',
    name: 'RY Rotation Merge',
    description: 'Combine consecutive RY rotations: Ry(θ)·Ry(φ) = Ry(θ+φ)',
    category: 'simplification',
    isBuiltin: true,
    pattern: [
      { type: 'RY', qubitRef: 'q0', paramsRef: 'theta1' },
      { type: 'RY', qubitRef: 'q0', paramsRef: 'theta2' }
    ],
    constraints: [
      { type: 'same_qubit', elements: [0, 1] },
      { type: 'adjacent_columns', elements: [0, 1] }
    ],
    replacement: {
      type: 'param_combine',
      gates: [{ type: 'RY', qubitRef: 'q0', paramsExpr: 'theta1 + theta2' }]
    },
    visualPattern: 'Ry(θ) Ry(φ) = Ry(θ+φ)',
    reversible: false
  },

  {
    id: 'p-combine',
    name: 'Phase Merge',
    description: 'Combine consecutive Phase gates: P(θ)·P(φ) = P(θ+φ)',
    category: 'simplification',
    isBuiltin: true,
    pattern: [
      { type: 'P', qubitRef: 'q0', paramsRef: 'theta1' },
      { type: 'P', qubitRef: 'q0', paramsRef: 'theta2' }
    ],
    constraints: [
      { type: 'same_qubit', elements: [0, 1] },
      { type: 'adjacent_columns', elements: [0, 1] }
    ],
    replacement: {
      type: 'param_combine',
      gates: [{ type: 'P', qubitRef: 'q0', paramsExpr: 'theta1 + theta2' }]
    },
    visualPattern: 'P(θ) P(φ) = P(θ+φ)',
    reversible: false
  },

  // ===== DECOMPOSITION RULES (expand to more basic gates) =====

  {
    id: 'swap-decompose',
    name: 'SWAP Decomposition',
    description: 'SWAP = 3 CNOTs: CX(0,1)·CX(1,0)·CX(0,1)',
    category: 'decomposition',
    isBuiltin: true,
    pattern: [
      { type: 'SWAP', qubitRef: 'q0,q1' }
    ],
    constraints: [],
    replacement: {
      type: 'sequence',
      gates: [
        { type: 'CX', qubitRef: 'q0,q1' },
        { type: 'CX', qubitRef: 'q1,q0' },
        { type: 'CX', qubitRef: 'q0,q1' }
      ]
    },
    visualPattern: 'SWAP = CX CX CX',
    reversible: true
  },

  {
    id: 'z-from-hxh',
    name: 'Z from HXH',
    description: 'Z = H·X·H (change of basis)',
    category: 'decomposition',
    isBuiltin: true,
    pattern: [
      { type: 'Z', qubitRef: 'q0' }
    ],
    constraints: [],
    replacement: {
      type: 'sequence',
      gates: [
        { type: 'H', qubitRef: 'q0' },
        { type: 'X', qubitRef: 'q0' },
        { type: 'H', qubitRef: 'q0' }
      ]
    },
    visualPattern: 'Z = H X H',
    reversible: true
  },

  {
    id: 'x-from-hzh',
    name: 'X from HZH',
    description: 'X = H·Z·H (change of basis)',
    category: 'decomposition',
    isBuiltin: true,
    pattern: [
      { type: 'X', qubitRef: 'q0' }
    ],
    constraints: [],
    replacement: {
      type: 'sequence',
      gates: [
        { type: 'H', qubitRef: 'q0' },
        { type: 'Z', qubitRef: 'q0' },
        { type: 'H', qubitRef: 'q0' }
      ]
    },
    visualPattern: 'X = H Z H',
    reversible: true
  },

  {
    id: 'cx-to-hczh',
    name: 'CNOT from H·CZ·H',
    description: 'CX = (I⊗H)·CZ·(I⊗H)',
    category: 'decomposition',
    isBuiltin: true,
    pattern: [
      { type: 'CX', qubitRef: 'q0,q1' }
    ],
    constraints: [],
    replacement: {
      type: 'sequence',
      gates: [
        { type: 'H', qubitRef: 'q1' },
        { type: 'CZ', qubitRef: 'q0,q1' },
        { type: 'H', qubitRef: 'q1' }
      ]
    },
    visualPattern: 'CX = H CZ H',
    reversible: true
  }
]

// Get rules grouped by category
export function getRulesByCategory(): Map<string, IdentityRule[]> {
  const groups = new Map<string, IdentityRule[]>()

  for (const rule of BUILTIN_IDENTITY_RULES) {
    const existing = groups.get(rule.category) || []
    existing.push(rule)
    groups.set(rule.category, existing)
  }

  return groups
}

// Get a rule by ID
export function getRuleById(id: string): IdentityRule | undefined {
  return BUILTIN_IDENTITY_RULES.find(r => r.id === id)
}

// Category labels for UI
export const CATEGORY_LABELS: Record<string, string> = {
  cancellation: 'Cancellation Rules',
  simplification: 'Simplification Rules',
  decomposition: 'Decomposition Rules',
  custom: 'Custom Rules'
}

// Category descriptions
export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  cancellation: 'Gates that cancel to identity (remove gates)',
  simplification: 'Combine multiple gates into fewer gates',
  decomposition: 'Expand gates into more basic operations',
  custom: 'User-defined circuit identities'
}

// Shared hardware provider data used by HardwarePage and HomeworkPage

export interface HardwareProvider {
  id: string
  name: string
  company: string
  companyLogo?: string
  type: 'superconducting' | 'trapped_ion' | 'photonic' | 'neutral_atom' | 'simulator'
  qubits: number
  status: 'online' | 'offline' | 'maintenance' | 'coming_soon'
  description: string
  features: string[]
  backendName: string
  apiRequired: boolean
  apiConfigured?: boolean
  docsUrl?: string
  pricing?: string
}

// Static hardware data - IBM Quantum's 7 real QPUs + others
export const HARDWARE_PROVIDERS: HardwareProvider[] = [
  // IBM Quantum Hardware - Heron r3 (Latest)
  {
    id: 'ibm_boston',
    name: 'IBM Boston',
    company: 'IBM',
    type: 'superconducting',
    qubits: 156,
    status: 'online',
    description: 'IBM\'s newest Heron r3 processor with 156 qubits, featuring the latest improvements in coherence and gate fidelities.',
    features: ['Heron r3', '156 qubits', 'Dynamic circuits', 'Error mitigation'],
    backendName: 'ibm_boston',
    apiRequired: true,
    docsUrl: 'https://quantum.ibm.com/services/resources?system=ibm_boston',
    pricing: 'Free tier available'
  },
  {
    id: 'ibm_pittsburgh',
    name: 'IBM Pittsburgh',
    company: 'IBM',
    type: 'superconducting',
    qubits: 156,
    status: 'online',
    description: 'Heron r3 processor with 156 qubits, part of IBM\'s latest generation quantum hardware.',
    features: ['Heron r3', '156 qubits', 'Dynamic circuits', 'Qiskit Runtime'],
    backendName: 'ibm_pittsburgh',
    apiRequired: true,
    docsUrl: 'https://quantum.ibm.com/services/resources?system=ibm_pittsburgh',
    pricing: 'Free tier available'
  },
  // IBM Quantum Hardware - Heron r2
  {
    id: 'ibm_kingston',
    name: 'IBM Kingston',
    company: 'IBM',
    type: 'superconducting',
    qubits: 156,
    status: 'online',
    description: 'Heron r2 processor with 156 qubits, featuring improved gate fidelities and coherence times.',
    features: ['Heron r2', '156 qubits', 'Dynamic circuits', 'Error mitigation'],
    backendName: 'ibm_kingston',
    apiRequired: true,
    docsUrl: 'https://quantum.ibm.com/services/resources?system=ibm_kingston',
    pricing: 'Free tier available'
  },
  {
    id: 'ibm_fez',
    name: 'IBM Fez',
    company: 'IBM',
    type: 'superconducting',
    qubits: 156,
    status: 'online',
    description: 'Heron r2 processor with 156 qubits, optimized for high-fidelity quantum operations.',
    features: ['Heron r2', '156 qubits', 'Dynamic circuits', 'Real-time classical compute'],
    backendName: 'ibm_fez',
    apiRequired: true,
    docsUrl: 'https://quantum.ibm.com/services/resources?system=ibm_fez',
    pricing: 'Free tier available'
  },
  {
    id: 'ibm_marrakesh',
    name: 'IBM Marrakesh',
    company: 'IBM',
    type: 'superconducting',
    qubits: 156,
    status: 'online',
    description: 'Heron r2 processor with 156 qubits, part of IBM\'s global quantum network.',
    features: ['Heron r2', '156 qubits', 'Dynamic circuits', 'Qiskit Runtime'],
    backendName: 'ibm_marrakesh',
    apiRequired: true,
    docsUrl: 'https://quantum.ibm.com/services/resources?system=ibm_marrakesh',
    pricing: 'Free tier available'
  },
  // IBM Quantum Hardware - Heron r1
  {
    id: 'ibm_torino',
    name: 'IBM Torino',
    company: 'IBM',
    type: 'superconducting',
    qubits: 133,
    status: 'online',
    description: 'Heron r1 processor with 133 qubits, IBM\'s first generation Heron chip with excellent performance.',
    features: ['Heron r1', '133 qubits', 'Dynamic circuits', 'Error mitigation'],
    backendName: 'ibm_torino',
    apiRequired: true,
    docsUrl: 'https://quantum.ibm.com/services/resources?system=ibm_torino',
    pricing: 'Free tier available'
  },
  // IBM Quantum Hardware - Nighthawk r1
  {
    id: 'ibm_miami',
    name: 'IBM Miami',
    company: 'IBM',
    type: 'superconducting',
    qubits: 120,
    status: 'online',
    description: 'Nighthawk r1 processor with 120 qubits, optimized for specific quantum workloads.',
    features: ['Nighthawk r1', '120 qubits', 'Dynamic circuits', 'Low error rates'],
    backendName: 'ibm_miami',
    apiRequired: true,
    docsUrl: 'https://quantum.ibm.com/services/resources?system=ibm_miami',
    pricing: 'Free tier available'
  },
]

export function findProviderByBackend(backendName: string): HardwareProvider | undefined {
  return HARDWARE_PROVIDERS.find(p => p.backendName === backendName)
}

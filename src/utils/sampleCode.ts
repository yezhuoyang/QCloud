export const DEFAULT_QISKIT_CODE = `# QuantumArena - Quantum Circuit Definition
# Only define your quantum circuit here
# Imports, simulation, and result processing are handled automatically

# Create a quantum circuit with 2 qubits and 2 classical bits
qc = QuantumCircuit(2, 2)

# Apply Hadamard gate to qubit 0 (creates superposition)
qc.h(0)

# Apply CNOT gate (entangles qubits 0 and 1)
qc.cx(0, 1)

# Measure both qubits
qc.measure([0, 1], [0, 1])
`

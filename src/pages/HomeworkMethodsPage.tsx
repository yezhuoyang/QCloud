import { useParams, Link } from 'react-router-dom'
import Logo from '../components/Logo'

function HomeworkMethodsPage() {
  const { homeworkId } = useParams<{ homeworkId: string }>()

  return (
    <div className="min-h-screen bg-gradient-to-br from-qcloud-light via-white to-qcloud-bg">
      {/* Header */}
      <header className="bg-white border-b border-qcloud-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Logo size="small" />
          </Link>
          <h1 className="text-lg font-bold text-qcloud-text">Fidelity Testing Methods</h1>
        </div>
        <Link
          to={`/homework/${homeworkId}`}
          className="px-4 py-2 text-sm bg-qcloud-primary/10 text-qcloud-primary rounded-lg hover:bg-qcloud-primary/20 transition-colors"
        >
          Back to Homework
        </Link>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-8">
        {/* Overview */}
        <section className="bg-white rounded-xl border border-qcloud-border p-6">
          <h2 className="text-xl font-bold text-qcloud-text mb-3">Overview</h2>
          <p className="text-sm text-qcloud-muted leading-relaxed">
            After your circuit runs on hardware, we need to measure how close the output Bell pair
            (qubits 0 and 1) is to the ideal Bell state. We use <strong>fidelity</strong> as the metric.
            Two methods are available, each with different tradeoffs.
          </p>
          <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <p className="text-sm font-medium text-indigo-800">
              {'Target state: |Φ+⟩ = (|00⟩ + |11⟩) / √2'}
            </p>
            <p className="text-xs text-indigo-600 mt-1">
              {'Fidelity F = ⟨Φ+|ρ|Φ+⟩ where ρ is the density matrix of the output state.'}
            </p>
          </div>
        </section>

        {/* Method 1: Inverse Bell */}
        <section className="bg-white rounded-xl border border-qcloud-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-semibold">Method 1</span>
            <h2 className="text-xl font-bold text-qcloud-text">Inverse Bell Test</h2>
          </div>

          <h3 className="font-semibold text-qcloud-text mb-2">How it works</h3>
          <p className="text-sm text-qcloud-muted leading-relaxed mb-4">
            {'The Inverse Bell test appends a CNOT gate and a Hadamard gate to the output qubits before measurement. This reverses the Bell state preparation: if the state is a perfect |Φ+⟩, it maps back to |00⟩.'}
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="text-xs font-semibold text-qcloud-text mb-2 uppercase tracking-wider">Circuit Transformation</h4>
            <pre className="text-sm font-mono text-gray-700 leading-relaxed">{`Your circuit (without measurements)
    |
    v
qc.cx(0, 1)    # CNOT: q0 controls q1
qc.h(0)         # Hadamard on q0
qc.measure_all() # Measure all qubits`}</pre>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="text-xs font-semibold text-qcloud-text mb-2 uppercase tracking-wider">Bell State Mapping</h4>
            <div className="grid grid-cols-2 gap-2 text-sm font-mono">
              <span className="text-qcloud-muted">{'|Φ+⟩ = (|00⟩+|11⟩)/√2'}</span>
              <span className="text-green-600">{'→ |00⟩'}</span>
              <span className="text-qcloud-muted">{'|Φ-⟩ = (|00⟩-|11⟩)/√2'}</span>
              <span>{'→ |10⟩'}</span>
              <span className="text-qcloud-muted">{'|Ψ+⟩ = (|01⟩+|10⟩)/√2'}</span>
              <span>{'→ |01⟩'}</span>
              <span className="text-qcloud-muted">{'|Ψ-⟩ = (|01⟩-|10⟩)/√2'}</span>
              <span>{'→ |11⟩'}</span>
            </div>
          </div>

          <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
            <h4 className="text-xs font-semibold text-teal-800 mb-2 uppercase tracking-wider">Fidelity Formula</h4>
            <p className="text-lg font-mono font-bold text-teal-700 text-center my-2">
              {'F(Φ+) = P(output qubits = "00")'}
            </p>
            <p className="text-xs text-teal-600 mt-2">
              After post-selection on ancilla qubits, the fidelity is simply the fraction of shots where the output qubits (q0, q1) are both measured as 0.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <h5 className="text-xs font-semibold text-green-700 mb-1">Advantages</h5>
              <ul className="text-xs text-green-600 space-y-1">
                <li>- Uses only 1 circuit (fast)</li>
                <li>- Simple to understand</li>
                <li>- Lower hardware budget cost</li>
              </ul>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <h5 className="text-xs font-semibold text-red-700 mb-1">Limitations</h5>
              <ul className="text-xs text-red-600 space-y-1">
                <li>- Extra gates add noise</li>
                <li>- Only measures one observable</li>
                <li>- Can overestimate fidelity for non-Bell states</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Method 2: Tomography */}
        <section className="bg-white rounded-xl border border-qcloud-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">Method 2</span>
            <h2 className="text-xl font-bold text-qcloud-text">Pauli Correlator Tomography</h2>
          </div>

          <h3 className="font-semibold text-qcloud-text mb-2">How it works</h3>
          <p className="text-sm text-qcloud-muted leading-relaxed mb-4">
            Instead of a single circuit, tomography runs <strong>3 separate circuits</strong>,
            each measuring the output qubits in a different Pauli basis (ZZ, XX, YY).
            The Pauli correlators are combined to compute the fidelity.
          </p>

          <div className="space-y-3 mb-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-xs font-semibold text-blue-800 mb-1">ZZ Basis (Computational)</h4>
              <pre className="text-xs font-mono text-blue-700">{`# No extra gates needed
qc.measure_all()`}</pre>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="text-xs font-semibold text-green-800 mb-1">XX Basis</h4>
              <pre className="text-xs font-mono text-green-700">{`qc.h(0)    # Rotate q0 to X basis
qc.h(1)    # Rotate q1 to X basis
qc.measure_all()`}</pre>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <h4 className="text-xs font-semibold text-orange-800 mb-1">YY Basis</h4>
              <pre className="text-xs font-mono text-orange-700">{`qc.sdg(0)  # Rotate q0 to Y basis
qc.h(0)
qc.sdg(1)  # Rotate q1 to Y basis
qc.h(1)
qc.measure_all()`}</pre>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="text-xs font-semibold text-qcloud-text mb-2 uppercase tracking-wider">Pauli Correlator Calculation</h4>
            <p className="text-sm text-qcloud-muted leading-relaxed">
              For each basis, we compute the correlator from measurement results:
            </p>
            <p className="text-center font-mono text-sm font-bold text-qcloud-text my-3">
              {'⟨PQ⟩ = (N'}<sub>same parity</sub>{' − N'}<sub>diff parity</sub>{') / N'}<sub>post-selected</sub>
            </p>
            <p className="text-xs text-qcloud-muted">
              <strong>Same parity:</strong> {'output qubits q0q1 ∈ { 00, 11 }'}
              {'  |  '}
              <strong>Different parity:</strong> {'output qubits q0q1 ∈ { 01, 10 }'}
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h4 className="text-xs font-semibold text-purple-800 mb-2 uppercase tracking-wider">Fidelity Formula</h4>
            <p className="text-lg font-mono font-bold text-purple-700 text-center my-2">
              {'F(|Φ+⟩) = (1 + ⟨XX⟩ − ⟨YY⟩ + ⟨ZZ⟩) / 4'}
            </p>
            <p className="text-xs text-purple-600 mt-2">
              {'This formula exploits the fact that |Φ+⟩ is a +1 eigenstate of XX and ZZ, and a −1 eigenstate of YY. For a perfect |Φ+⟩ state: ⟨XX⟩ = +1, ⟨YY⟩ = −1, ⟨ZZ⟩ = +1, giving F = (1+1+1+1)/4 = 1.'}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <h5 className="text-xs font-semibold text-green-700 mb-1">Advantages</h5>
              <ul className="text-xs text-green-600 space-y-1">
                <li>- No extra entangling gates needed</li>
                <li>- More robust measurement</li>
                <li>- Provides diagnostic correlator values</li>
              </ul>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <h5 className="text-xs font-semibold text-red-700 mb-1">Limitations</h5>
              <ul className="text-xs text-red-600 space-y-1">
                <li>- Uses 3x the hardware budget</li>
                <li>- Requires 3 separate circuits</li>
                <li>- Longer total execution time</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Post-Selection */}
        <section className="bg-white rounded-xl border border-qcloud-border p-6">
          <h2 className="text-xl font-bold text-qcloud-text mb-3">Post-Selection</h2>
          <p className="text-sm text-qcloud-muted leading-relaxed mb-4">
            Both methods support <strong>post-selection</strong> on ancilla qubits (all qubits except q0 and q1).
            When you define <code className="bg-gray-100 px-1 rounded text-xs">POST_SELECT</code>, only shots where the ancilla
            bits match a string in your set are kept for fidelity calculation.
          </p>

          {/* String Length */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-200 mb-4">
            <h4 className="text-xs font-semibold text-red-800 mb-2 uppercase tracking-wider">String Length Rule</h4>
            <p className="text-sm text-red-700 font-medium mb-2">
              Each POST_SELECT string must have <strong>exactly N characters</strong>, where N = number of ancilla measurements.
            </p>
            <p className="text-xs text-red-600">
              Ancilla measurements = all measurements on qubits <strong>other than q0 and q1</strong>.
              The fidelity test automatically measures q0 and q1 — those are excluded from post-selection.
            </p>
            <div className="mt-2 bg-white rounded p-3 border border-red-100">
              <pre className="text-xs font-mono text-gray-700">{`# 4-qubit circuit: measure q0, q1, q2, q3
# Ancilla measurements: q2, q3 → 2 ancilla bits
# POST_SELECT strings must have length 2
POST_SELECT = {"00"}      # ✓ correct (length 2)
POST_SELECT = {"0"}       # ✗ wrong! (length 1 ≠ 2)
POST_SELECT = {"000"}     # ✗ wrong! (length 3 ≠ 2)

# 8-qubit circuit: measure q0-q7
# Ancilla measurements: q2, q3, q4, q5, q6, q7 → 6 ancilla bits
# POST_SELECT strings must have length 6
POST_SELECT = {"000000"}  # ✓ correct (length 6)`}</pre>
            </div>
          </div>

          {/* Bit Ordering */}
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200 mb-4">
            <h4 className="text-xs font-semibold text-indigo-800 mb-2 uppercase tracking-wider">Bit Ordering (Qiskit Convention)</h4>
            <p className="text-sm text-indigo-700 mb-3">
              POST_SELECT strings follow <strong>Qiskit's bit ordering</strong>: the <strong>highest classical bit index is leftmost</strong>.
            </p>
            <p className="text-xs text-indigo-600 mb-3">
              {'Characters are ordered: c[n-1] c[n-2] ... c[2] (left → right = highest → lowest index)'}
            </p>
            <div className="bg-white rounded p-3 border border-indigo-100">
              <h5 className="text-xs font-semibold text-indigo-800 mb-2">Example: BBPSSW (4-qubit circuit)</h5>
              <pre className="text-xs font-mono text-gray-700 mb-2">{`qc.measure([0, 1, 2, 3], [0, 1, 2, 3])
# q0 → c0, q1 → c1  (output Bell pair — handled by test method)
# q2 → c2, q3 → c3  (ancilla — used for post-selection)`}</pre>
              <p className="text-xs text-indigo-700 mb-2">
                POST_SELECT string has 2 characters. Bit order: <strong>[c3, c2]</strong>
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <span className="text-gray-600">{'POST_SELECT = {"00"}'}</span>
                <span className="text-indigo-700">{'→ c3=0, c2=0'}</span>
                <span className="text-gray-600">{'POST_SELECT = {"01"}'}</span>
                <span className="text-indigo-700">{'→ c3=0, c2=1'}</span>
                <span className="text-gray-600">{'POST_SELECT = {"10"}'}</span>
                <span className="text-indigo-700">{'→ c3=1, c2=0'}</span>
                <span className="text-gray-600">{'POST_SELECT = {"11"}'}</span>
                <span className="text-indigo-700">{'→ c3=1, c2=1'}</span>
              </div>
            </div>
            <div className="mt-3 bg-white rounded p-3 border border-indigo-100">
              <h5 className="text-xs font-semibold text-indigo-800 mb-2">Example: 6-qubit circuit</h5>
              <pre className="text-xs font-mono text-gray-700 mb-2">{`qc = QuantumCircuit(6, 6)
# ... gates ...
qc.measure([0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5])
# Ancilla measurements: q2→c2, q3→c3, q4→c4, q5→c5`}</pre>
              <p className="text-xs text-indigo-700">
                POST_SELECT string has 4 characters. Bit order: <strong>[c5, c4, c3, c2]</strong>
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                {'POST_SELECT = {"0000"} → c5=0, c4=0, c3=0, c2=0'}
              </p>
            </div>
          </div>

          {/* Code examples */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="text-xs font-semibold text-qcloud-text mb-2 uppercase tracking-wider">Code Examples</h4>
            <pre className="text-sm font-mono text-gray-700">{`# Keep only shots where all ancilla qubits measure 0
POST_SELECT = {"00"}

# Keep shots where ancilla = "00" OR "11"
POST_SELECT = {"00", "11"}

# No post-selection (keep all shots)
# Simply omit POST_SELECT or comment it out`}</pre>
          </div>

          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h4 className="text-xs font-semibold text-amber-800 mb-1">Success Probability</h4>
            <p className="text-center font-mono text-sm font-bold text-amber-700 my-2">
              {'P(success) = N'}<sub>post-selected</sub>{' / N'}<sub>total shots</sub>
            </p>
            <p className="text-xs text-amber-600">
              The success probability tells you what fraction of shots survive post-selection.
              A higher success probability means more efficient use of hardware resources.
              The leaderboard shows both fidelity and success probability so you can evaluate the tradeoff.
            </p>
          </div>
        </section>

        {/* Back Button */}
        <div className="text-center">
          <Link
            to={`/homework/${homeworkId}`}
            className="inline-block px-6 py-3 bg-qcloud-primary text-white rounded-lg font-semibold hover:bg-qcloud-secondary transition-colors"
          >
            Back to Homework
          </Link>
        </div>
      </div>
    </div>
  )
}

export default HomeworkMethodsPage

"""
Quantum Simulator Service - Qiskit Aer simulation
"""
import json
import time
from typing import Dict, Any, Optional
from datetime import datetime


class SimulatorService:
    """Service for running quantum simulations using Qiskit Aer"""

    def __init__(self):
        self._aer_available = None

    def _check_aer_available(self) -> bool:
        """Check if Qiskit Aer is available"""
        if self._aer_available is not None:
            return self._aer_available

        try:
            from qiskit_aer import AerSimulator
            self._aer_available = True
        except ImportError:
            try:
                from qiskit.providers.aer import AerSimulator
                self._aer_available = True
            except ImportError:
                self._aer_available = False
                print("Warning: Qiskit Aer not available. Install with: pip install qiskit-aer")

        return self._aer_available

    def is_available(self) -> bool:
        """Check if simulator is available"""
        return self._check_aer_available()

    def simulate(
        self,
        code: str,
        shots: int = 1024,
        include_statevector: bool = False
    ) -> Dict[str, Any]:
        """
        Run a quantum circuit simulation using Qiskit Aer

        Args:
            code: Python code that creates a QuantumCircuit
            shots: Number of shots for measurement sampling
            include_statevector: Whether to include statevector in result

        Returns:
            Simulation result dictionary
        """
        if not self._check_aer_available():
            return {
                "success": False,
                "error": "Qiskit Aer simulator is not available"
            }

        start_time = time.time()

        try:
            # Import Qiskit components
            from qiskit import QuantumCircuit, transpile
            try:
                from qiskit_aer import AerSimulator
            except ImportError:
                from qiskit.providers.aer import AerSimulator

            # Use secure code validator to parse circuit
            from .code_validator import execute_circuit_code
            circuit, _post_select, _layout, parse_error = execute_circuit_code(code)

            if circuit is None:
                return {
                    "success": False,
                    "error": parse_error or "No QuantumCircuit found. Define 'circuit' or 'qc' variable."
                }

            # Get circuit info
            num_qubits = circuit.num_qubits
            num_clbits = circuit.num_clbits
            gate_count = len(circuit.data)
            depth = circuit.depth()

            # Ensure circuit has measurements if classical bits exist
            has_measurements = any(
                instr.operation.name == "measure"
                for instr in circuit.data
            )

            # Add measurements if needed
            if num_clbits > 0 and not has_measurements:
                circuit.measure_all(add_bits=False)
            elif num_clbits == 0:
                circuit.measure_all()

            # Create simulator
            simulator = AerSimulator()

            # Run simulation
            transpiled = transpile(circuit, simulator)
            job = simulator.run(transpiled, shots=shots)
            result = job.result()
            counts = result.get_counts()

            # Process counts to standard format
            measurements = {}
            for bitstring, count in counts.items():
                # Normalize bitstring format
                clean_bits = bitstring.replace(" ", "")
                measurements[clean_bits] = count

            # Calculate probabilities
            probabilities = {
                bits: count / shots
                for bits, count in measurements.items()
            }

            # Get statevector if requested and circuit is small enough
            statevector = None
            if include_statevector and num_qubits <= 10:
                try:
                    from qiskit_aer import AerSimulator as AerSim
                    sv_simulator = AerSim(method='statevector')

                    # Create circuit without measurements for statevector
                    sv_circuit = circuit.remove_final_measurements(inplace=False)
                    sv_circuit.save_statevector()

                    sv_job = sv_simulator.run(sv_circuit)
                    sv_result = sv_job.result()
                    sv = sv_result.get_statevector()

                    # Convert to list of [real, imag] pairs
                    statevector = [[float(c.real), float(c.imag)] for c in sv.data]
                except Exception as e:
                    print(f"Could not get statevector: {e}")

            execution_time = (time.time() - start_time) * 1000  # ms

            return {
                "success": True,
                "measurements": measurements,
                "probabilities": probabilities,
                "shots": shots,
                "qubitCount": num_qubits,
                "gateCount": gate_count,
                "circuitDepth": depth,
                "executionTime": round(execution_time, 2),
                "statevector": statevector,
                "backend": "aer_simulator"
            }

        except SyntaxError as e:
            return {
                "success": False,
                "error": f"Syntax error in code: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Simulation error: {str(e)}"
            }

    def get_available_simulators(self) -> list:
        """Get list of available simulator backends"""
        simulators = []

        if self._check_aer_available():
            simulators.extend([
                {
                    "name": "aer_simulator",
                    "description": "Qiskit Aer Simulator",
                    "max_qubits": 30,
                    "supports_statevector": True
                },
                {
                    "name": "aer_simulator_statevector",
                    "description": "Qiskit Aer Statevector Simulator",
                    "max_qubits": 25,
                    "supports_statevector": True
                }
            ])

        return simulators


# Singleton instance
simulator_service = SimulatorService()

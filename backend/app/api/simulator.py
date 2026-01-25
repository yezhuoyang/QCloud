"""
Simulator API endpoints - Qiskit Aer simulation
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from ..services.simulator_service import simulator_service

router = APIRouter(prefix="/simulator", tags=["Simulator"])


class SimulateRequest(BaseModel):
    """Request model for simulation"""
    code: str = Field(..., description="Python code that creates a QuantumCircuit")
    shots: int = Field(default=1024, ge=1, le=100000, description="Number of shots")
    include_statevector: bool = Field(default=False, description="Include statevector in result")


class SimulateResponse(BaseModel):
    """Response model for simulation"""
    success: bool
    error: Optional[str] = None
    measurements: Optional[Dict[str, int]] = None
    probabilities: Optional[Dict[str, float]] = None
    shots: Optional[int] = None
    qubitCount: Optional[int] = None
    gateCount: Optional[int] = None
    circuitDepth: Optional[int] = None
    executionTime: Optional[float] = None
    statevector: Optional[List[List[float]]] = None
    backend: Optional[str] = None


class SimulatorInfo(BaseModel):
    """Simulator backend info"""
    name: str
    description: str
    max_qubits: int
    supports_statevector: bool


@router.post("/run", response_model=SimulateResponse)
def run_simulation(data: SimulateRequest):
    """
    Run a quantum circuit simulation using Qiskit Aer

    This endpoint executes the provided Qiskit code and returns
    measurement results from the Aer simulator.

    Example code:
    ```python
    from qiskit import QuantumCircuit

    circuit = QuantumCircuit(2, 2)
    circuit.h(0)
    circuit.cx(0, 1)
    circuit.measure([0, 1], [0, 1])
    ```
    """
    if not simulator_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Qiskit Aer simulator is not available. Please install qiskit-aer."
        )

    result = simulator_service.simulate(
        code=data.code,
        shots=data.shots,
        include_statevector=data.include_statevector
    )

    return SimulateResponse(**result)


@router.get("/available")
def check_simulator_available():
    """Check if the simulator is available"""
    available = simulator_service.is_available()
    simulators = simulator_service.get_available_simulators() if available else []

    return {
        "available": available,
        "simulators": simulators
    }


@router.get("/backends", response_model=List[SimulatorInfo])
def get_simulator_backends():
    """Get list of available simulator backends"""
    if not simulator_service.is_available():
        return []

    return simulator_service.get_available_simulators()

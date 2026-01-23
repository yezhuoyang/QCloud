"""
IBMQ Service - quantum hardware job submission
Uses QiskitRuntimeService with SamplerV2 for IBM Quantum hardware
"""
import json
import time
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from ..config import settings
from ..models import IBMQJob, Submission


class IBMQService:
    """Service for IBMQ job submission and management"""

    def __init__(self):
        self._service = None
        self._initialized = False

    def _ensure_initialized(self):
        """Lazy initialization of IBMQ service"""
        if self._initialized:
            return

        if not settings.ibmq_token:
            print("Warning: IBMQ_TOKEN not configured. Hardware submission disabled.")
            self._initialized = True
            return

        try:
            from qiskit_ibm_runtime import QiskitRuntimeService

            # Initialize with the configured channel
            try:
                self._service = QiskitRuntimeService(
                    channel=settings.ibmq_channel,
                    token=settings.ibmq_token
                )
                print(f"IBMQ Service initialized with channel: {settings.ibmq_channel}")
            except Exception as e:
                print(f"Warning: Could not initialize IBMQ with channel {settings.ibmq_channel}: {e}")
                # Try saving credentials first
                try:
                    QiskitRuntimeService.save_account(
                        channel=settings.ibmq_channel,
                        token=settings.ibmq_token,
                        overwrite=True
                    )
                    self._service = QiskitRuntimeService(channel=settings.ibmq_channel)
                    print("IBMQ Service initialized after saving account")
                except Exception as e2:
                    print(f"Could not initialize IBMQ service: {e2}")

        except ImportError as e:
            print(f"Warning: qiskit-ibm-runtime not installed: {e}")

        self._initialized = True

    def is_available(self) -> bool:
        """Check if IBMQ service is available"""
        self._ensure_initialized()
        return self._service is not None

    def get_available_backends(self) -> List[Dict[str, Any]]:
        """Get list of available backends with details"""
        self._ensure_initialized()
        if not self._service:
            return []

        try:
            backends = self._service.backends()
            return [
                {
                    "name": b.name,
                    "num_qubits": getattr(b, 'num_qubits', None),
                    "operational": getattr(b, 'operational', True),
                    "simulator": getattr(b, 'simulator', False)
                }
                for b in backends
            ]
        except Exception as e:
            print(f"Error getting backends: {e}")
            return []

    def get_backend_names(self) -> List[str]:
        """Get list of backend names"""
        backends = self.get_available_backends()
        return [b["name"] for b in backends]

    def create_job_record(
        self,
        db: Session,
        submission_id: str,
        user_id: str,
        backend_name: str = None
    ) -> IBMQJob:
        """Create a job record in database"""
        job = IBMQJob(
            submission_id=submission_id,
            user_id=user_id,
            backend_name=backend_name or settings.ibmq_backend,
            status="queued"
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    def _parse_circuit_from_code(self, circuit_code: str):
        """
        Securely parse a QuantumCircuit from user code.
        Only allows Qiskit circuit operations - no arbitrary code execution.

        Args:
            circuit_code: Python code that creates a QuantumCircuit

        Returns:
            QuantumCircuit object

        Raises:
            ValueError: If code is invalid or no circuit is found
        """
        from .code_validator import execute_circuit_code

        circuit, error = execute_circuit_code(circuit_code)
        if circuit is None:
            raise ValueError(error or "No QuantumCircuit found. Define 'circuit' or 'qc' variable.")

        return circuit

    def submit_circuit(
        self,
        db: Session,
        job: IBMQJob,
        circuit_code: str,
        shots: int = 1024
    ) -> IBMQJob:
        """
        Submit a circuit to IBMQ hardware using SamplerV2

        Args:
            db: Database session
            job: The job record
            circuit_code: Python code that creates a QuantumCircuit
            shots: Number of measurement shots

        Returns:
            Updated job record
        """
        self._ensure_initialized()

        if not self._service:
            job.status = "failed"
            job.error_message = "IBMQ service not configured"
            db.commit()
            return job

        try:
            from qiskit import transpile
            from qiskit_ibm_runtime import SamplerV2 as Sampler
            from qiskit.transpiler import generate_preset_pass_manager

            # Parse circuit from code
            circuit = self._parse_circuit_from_code(circuit_code)

            # Ensure circuit has measurements
            has_measurements = any(
                instr.operation.name == "measure"
                for instr in circuit.data
            )
            if not has_measurements:
                circuit.measure_all()

            # Get backend
            backend = self._service.backend(job.backend_name)
            print(f"[IBMQ] Using backend: {backend.name}")

            # Transpile for the backend using preset pass manager
            pm = generate_preset_pass_manager(backend=backend, optimization_level=3)
            isa_circuit = pm.run(circuit)

            # Create sampler and submit job
            sampler = Sampler(mode=backend)
            sampler.options.default_shots = shots

            print(f"[IBMQ] Submitting job with {shots} shots...")
            ibm_job = sampler.run([isa_circuit])

            # Update job record
            job.ibmq_job_id = ibm_job.job_id()
            job.status = "running"
            job.started_at = datetime.utcnow()
            db.commit()
            db.refresh(job)

            print(f"[IBMQ] Job submitted: {job.ibmq_job_id}")
            return job

        except Exception as e:
            print(f"[IBMQ] Error submitting job: {e}")
            job.status = "failed"
            job.error_message = str(e)
            db.commit()
            return job

    def submit_circuit_direct(
        self,
        circuit_code: str,
        backend_name: str = None,
        shots: int = 1024,
        wait_for_result: bool = False
    ) -> Dict[str, Any]:
        """
        Submit a circuit directly to IBMQ hardware (no database record)

        Args:
            circuit_code: Python code that creates a QuantumCircuit
            backend_name: Target backend (uses default if not specified)
            shots: Number of measurement shots
            wait_for_result: If True, wait for job completion

        Returns:
            Dictionary with job info and optionally results
        """
        self._ensure_initialized()

        if not self._service:
            return {
                "success": False,
                "error": "IBMQ service not configured. Please set IBMQ_TOKEN."
            }

        try:
            from qiskit import transpile
            from qiskit_ibm_runtime import SamplerV2 as Sampler
            from qiskit.transpiler import generate_preset_pass_manager

            # Parse circuit from code
            circuit = self._parse_circuit_from_code(circuit_code)

            # Get circuit info
            num_qubits = circuit.num_qubits
            gate_count = len(circuit.data)
            depth = circuit.depth()

            # Ensure circuit has measurements
            has_measurements = any(
                instr.operation.name == "measure"
                for instr in circuit.data
            )
            if not has_measurements:
                circuit.measure_all()

            # Get backend
            target_backend = backend_name or settings.ibmq_backend
            backend = self._service.backend(target_backend)
            print(f"[IBMQ] Using backend: {backend.name}")

            # Transpile for the backend
            pm = generate_preset_pass_manager(backend=backend, optimization_level=3)
            isa_circuit = pm.run(circuit)

            # Create sampler and submit job
            sampler = Sampler(mode=backend)
            sampler.options.default_shots = shots

            start_time = time.time()
            print(f"[IBMQ] Submitting job with {shots} shots...")
            ibm_job = sampler.run([isa_circuit])
            job_id = ibm_job.job_id()
            print(f"[IBMQ] Job submitted: {job_id}")

            result_data = {
                "success": True,
                "job_id": job_id,
                "backend": target_backend,
                "status": "running",
                "shots": shots,
                "qubitCount": num_qubits,
                "gateCount": gate_count,
                "circuitDepth": depth
            }

            if wait_for_result:
                print(f"[IBMQ] Waiting for job completion...")
                ibm_job.wait_for_final_state()

                # Get results
                pub = ibm_job.result()[0]
                counts = pub.join_data().get_counts()

                execution_time = (time.time() - start_time) * 1000

                # Calculate probabilities
                total = sum(counts.values())
                probabilities = {k: v / total for k, v in counts.items()}

                result_data.update({
                    "status": "completed",
                    "measurements": counts,
                    "probabilities": probabilities,
                    "executionTime": round(execution_time, 2)
                })
                print(f"[IBMQ] Job completed in {execution_time:.2f}ms")

            return result_data

        except Exception as e:
            print(f"[IBMQ] Error: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def check_job_status(self, db: Session, job: IBMQJob) -> IBMQJob:
        """Check and update job status from IBMQ"""
        self._ensure_initialized()

        if not self._service or not job.ibmq_job_id:
            return job

        try:
            ibm_job = self._service.job(job.ibmq_job_id)
            raw_status = ibm_job.status()
            # Handle both enum (older API) and string (newer API) status formats
            status_name = raw_status.name if hasattr(raw_status, 'name') else str(raw_status).upper()

            status_map = {
                "QUEUED": "queued",
                "VALIDATING": "running",
                "RUNNING": "running",
                "DONE": "completed",
                "ERROR": "failed",
                "CANCELLED": "cancelled"
            }

            new_status = status_map.get(status_name, job.status)
            job.status = new_status

            if job.status == "completed":
                try:
                    # Get results using SamplerV2 format
                    pub = ibm_job.result()[0]
                    counts = pub.join_data().get_counts()

                    # Calculate probabilities
                    total = sum(counts.values())
                    probabilities = {k: v / total for k, v in counts.items()}

                    job.result = json.dumps({
                        "counts": counts,
                        "probabilities": probabilities
                    })
                except Exception as e:
                    # Fallback for different result formats
                    result = ibm_job.result()
                    if hasattr(result, 'quasi_dists'):
                        job.result = json.dumps(result.quasi_dists[0] if result.quasi_dists else {})
                    else:
                        job.result = json.dumps({"error": str(e)})

                job.completed_at = datetime.utcnow()

            elif job.status == "failed":
                try:
                    job.error_message = str(ibm_job.error_message() or "Unknown error")
                except:
                    job.error_message = "Job failed"

            db.commit()
            db.refresh(job)

        except Exception as e:
            print(f"Error checking job status: {e}")

        return job

    def get_job_result_direct(self, job_id: str) -> Dict[str, Any]:
        """
        Get job result directly from IBMQ (no database)

        Args:
            job_id: The IBMQ job ID

        Returns:
            Dictionary with job status and results
        """
        self._ensure_initialized()

        if not self._service:
            return {
                "success": False,
                "error": "IBMQ service not configured"
            }

        try:
            ibm_job = self._service.job(job_id)
            raw_status = ibm_job.status()
            # Handle both enum (older API) and string (newer API) status formats
            status_name = raw_status.name if hasattr(raw_status, 'name') else str(raw_status).upper()

            status_map = {
                "QUEUED": "queued",
                "VALIDATING": "running",
                "RUNNING": "running",
                "DONE": "completed",
                "ERROR": "failed",
                "CANCELLED": "cancelled"
            }

            result_data = {
                "success": True,
                "job_id": job_id,
                "status": status_map.get(status_name, "unknown")
            }

            if result_data["status"] == "completed":
                try:
                    pub = ibm_job.result()[0]
                    counts = pub.join_data().get_counts()

                    total = sum(counts.values())
                    probabilities = {k: v / total for k, v in counts.items()}

                    result_data.update({
                        "measurements": counts,
                        "probabilities": probabilities
                    })
                except Exception as e:
                    result_data["error"] = f"Error parsing results: {e}"

            elif result_data["status"] == "failed":
                try:
                    result_data["error"] = str(ibm_job.error_message() or "Unknown error")
                except:
                    result_data["error"] = "Job failed"

            return result_data

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def get_job(self, db: Session, job_id: str) -> Optional[IBMQJob]:
        """Get job by ID"""
        return db.query(IBMQJob).filter(IBMQJob.id == job_id).first()

    def get_user_jobs(self, db: Session, user_id: str, limit: int = 20) -> list:
        """Get recent jobs for a user"""
        return db.query(IBMQJob).filter(
            IBMQJob.user_id == user_id
        ).order_by(
            IBMQJob.created_at.desc()
        ).limit(limit).all()


# Singleton instance
ibmq_service = IBMQService()

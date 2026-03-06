"""
FIFO Job Queue Manager for challenge hardware submissions.
Simplified from HomeworkQueueManager: single circuit per job, custom evaluate_code scoring.
"""
import json
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.challenge import Challenge, ChallengeToken, ChallengeSubmission
from .homework_service import decrypt_api_key
from .challenge_service import (
    execute_evaluate_code,
    deduct_budget,
    get_participant_label,
)


class ChallengeQueueManager:
    """
    Database-backed FIFO queue for challenge hardware submissions.
    Single circuit per job, scored by admin-defined evaluate_code.
    """

    def enqueue(
        self,
        db: Session,
        challenge: Challenge,
        token_record: ChallengeToken,
        code: str,
        backend_name: str,
        shots: int = 1024,
    ) -> ChallengeSubmission:
        """Add a submission to the queue."""
        max_pos = (
            db.query(func.max(ChallengeSubmission.queue_position))
            .filter(
                ChallengeSubmission.challenge_id == challenge.id,
                ChallengeSubmission.status == "queued",
            )
            .scalar()
        )
        next_pos = (max_pos or 0) + 1

        submission = ChallengeSubmission(
            challenge_id=challenge.id,
            token_id=token_record.id,
            code=code,
            backend_name=backend_name,
            shots=shots,
            queue_position=next_pos,
            status="queued",
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)
        return submission

    def process_next(self, db: Session, challenge_id: str) -> Optional[ChallengeSubmission]:
        """Try to start the next queued job if under concurrency limit."""
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        if not challenge:
            return None

        running_count = (
            db.query(ChallengeSubmission)
            .filter(
                ChallengeSubmission.challenge_id == challenge_id,
                ChallengeSubmission.status == "running",
            )
            .count()
        )

        if running_count >= challenge.max_concurrent_jobs:
            return None

        next_sub = (
            db.query(ChallengeSubmission)
            .filter(
                ChallengeSubmission.challenge_id == challenge_id,
                ChallengeSubmission.status == "queued",
            )
            .order_by(ChallengeSubmission.queue_position.asc())
            .first()
        )

        if not next_sub:
            return None

        success = self._submit_to_ibm(db, challenge, next_sub)
        if success:
            next_sub.status = "running"
            next_sub.queue_position = None
            next_sub.started_at = datetime.utcnow()
            db.commit()
            self._recalculate_positions(db, challenge_id)
            return next_sub
        else:
            db.commit()
            return None

    def _submit_to_ibm(
        self, db: Session, challenge: Challenge, submission: ChallengeSubmission
    ) -> bool:
        """Submit single circuit to IBM hardware. Returns True on success."""
        try:
            from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
            from qiskit.transpiler import generate_preset_pass_manager
            from ..services.code_validator import execute_circuit_code

            api_key = decrypt_api_key(challenge.ibmq_api_key_encrypted)
            ibm_service = QiskitRuntimeService(channel="ibm_cloud", token=api_key)
            backend = ibm_service.backend(submission.backend_name)

            # Parse student circuit
            circuit, _, initial_layout, err = execute_circuit_code(submission.code)
            if circuit is None:
                submission.status = "failed"
                submission.error_message = f"Circuit error: {err}"
                return False

            if not any(instr.operation.name == "measure" for instr in circuit.data):
                circuit.measure_all()

            # Record circuit stats
            submission.qubit_count = circuit.num_qubits
            submission.gate_count = len(circuit.data)
            submission.circuit_depth = circuit.depth()

            # Transpile
            pm_kwargs = {"backend": backend, "optimization_level": 0}
            if initial_layout:
                pm_kwargs["initial_layout"] = initial_layout
            pm = generate_preset_pass_manager(**pm_kwargs)
            transpiled = pm.run(circuit)

            # Submit single pub
            sampler = SamplerV2(mode=backend)
            sampler.options.default_shots = submission.shots
            ibm_job = sampler.run([transpiled])

            submission.ibmq_job_id = ibm_job.job_id()

            print(
                f"[ChallengeQueue] Job submitted: {ibm_job.job_id()} "
                f"for submission {submission.id}"
            )
            return True

        except Exception as e:
            print(f"[ChallengeQueue] Error submitting to IBM: {e}")
            submission.status = "failed"
            submission.error_message = str(e)
            return False

    def check_job_status(
        self, db: Session, submission: ChallengeSubmission
    ) -> ChallengeSubmission:
        """Poll IBM for job status. If completed, evaluate and score."""
        if submission.status != "running" or not submission.ibmq_job_id:
            return submission

        challenge = submission.challenge

        try:
            from qiskit_ibm_runtime import QiskitRuntimeService

            api_key = decrypt_api_key(challenge.ibmq_api_key_encrypted)
            ibm_service = QiskitRuntimeService(channel="ibm_cloud", token=api_key)

            ibm_job = ibm_service.job(submission.ibmq_job_id)
            raw_status = ibm_job.status()
            status_name = (
                raw_status.name
                if hasattr(raw_status, "name")
                else str(raw_status).upper()
            )

            status_map = {
                "QUEUED": "running",
                "VALIDATING": "running",
                "RUNNING": "running",
                "DONE": "completed",
                "ERROR": "failed",
                "CANCELLED": "failed",
            }

            new_status = status_map.get(status_name, submission.status)
            submission.last_checked_at = datetime.utcnow()

            if new_status == "completed":
                self._process_completion(db, submission, ibm_job, challenge)
            elif new_status == "failed":
                submission.status = "failed"
                try:
                    submission.error_message = str(
                        ibm_job.error_message() or "Job failed on IBM hardware"
                    )
                except Exception:
                    submission.error_message = "Job failed on IBM hardware"

            db.commit()

            if new_status in ("completed", "failed"):
                self.process_next(db, challenge.id)

        except Exception as e:
            print(f"[ChallengeQueue] Error checking status: {e}")
            submission.last_checked_at = datetime.utcnow()
            db.commit()

        return submission

    def _process_completion(
        self, db: Session, submission: ChallengeSubmission, ibm_job, challenge: Challenge
    ):
        """Extract results, run evaluate_code, deduct budget."""
        try:
            results = ibm_job.result()

            # Single pub result
            pub_result = results[0]
            counts = pub_result.join_data().get_counts()
            total_shots = sum(counts.values())

            submission.measurements = json.dumps(counts)

            # Run custom evaluation
            try:
                score = execute_evaluate_code(challenge.evaluate_code, counts, total_shots)
                submission.score = score
            except Exception as eval_err:
                print(f"[ChallengeQueue] Evaluate error: {eval_err}")
                submission.score = 0.0
                submission.error_message = f"Evaluation error: {str(eval_err)}"

            submission.status = "completed"
            submission.completed_at = datetime.utcnow()

            # Get execution time from IBM metrics
            execution_time = None
            try:
                metrics = ibm_job.metrics()
                if metrics:
                    usage = metrics.get("usage", {})
                    if isinstance(usage, dict):
                        execution_time = usage.get("quantum_seconds") or usage.get("seconds")
                    elif isinstance(usage, (int, float)):
                        execution_time = float(usage)
                    if not execution_time:
                        execution_time = metrics.get("billed_seconds") or metrics.get("estimated_run_time_seconds")
            except Exception:
                pass

            if not execution_time and submission.started_at:
                execution_time = (datetime.utcnow() - submission.started_at).total_seconds()

            if execution_time:
                submission.execution_time_seconds = execution_time
                token_record = submission.token
                if token_record:
                    deduct_budget(db, token_record, execution_time)

            print(
                f"[ChallengeQueue] Submission {submission.id} completed: "
                f"score={submission.score:.4f}"
            )

        except Exception as e:
            print(f"[ChallengeQueue] Error processing completion: {e}")
            submission.status = "completed"
            submission.completed_at = datetime.utcnow()
            submission.error_message = f"Results parsing error: {str(e)}"

    def get_queue_status(
        self, db: Session, challenge_id: str, token_record: Optional[ChallengeToken] = None
    ) -> Dict[str, Any]:
        """Get full queue status for a challenge."""
        queued = (
            db.query(ChallengeSubmission)
            .filter(
                ChallengeSubmission.challenge_id == challenge_id,
                ChallengeSubmission.status == "queued",
            )
            .order_by(ChallengeSubmission.queue_position.asc())
            .all()
        )

        running = (
            db.query(ChallengeSubmission)
            .filter(
                ChallengeSubmission.challenge_id == challenge_id,
                ChallengeSubmission.status == "running",
            )
            .all()
        )

        queue_entries = []
        for sub in queued:
            label = get_participant_label(sub.token) if sub.token else "unknown"
            queue_entries.append({
                "id": sub.id,
                "participant_label": label,
                "position": sub.queue_position,
                "backend": sub.backend_name,
                "submitted_at": sub.created_at.isoformat() if sub.created_at else None,
            })

        running_entries = []
        for sub in running:
            label = get_participant_label(sub.token) if sub.token else "unknown"
            running_entries.append({
                "id": sub.id,
                "participant_label": label,
                "backend": sub.backend_name,
                "started_at": sub.started_at.isoformat() if sub.started_at else None,
            })

        my_submissions = []
        if token_record:
            my_subs = (
                db.query(ChallengeSubmission)
                .filter(
                    ChallengeSubmission.token_id == token_record.id,
                    ChallengeSubmission.status.in_(["queued", "running"]),
                )
                .all()
            )
            for sub in my_subs:
                my_submissions.append({
                    "id": sub.id,
                    "position": sub.queue_position,
                    "status": sub.status,
                })

        avg_duration = self._get_avg_job_duration(db, challenge_id)
        challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
        max_concurrent = challenge.max_concurrent_jobs if challenge else 3
        estimated_wait = (len(queued) * avg_duration) / max_concurrent / 60.0

        return {
            "queue": queue_entries,
            "running": running_entries,
            "my_submissions": my_submissions,
            "total_queued": len(queued),
            "total_running": len(running),
            "estimated_wait_minutes": round(estimated_wait, 1),
        }

    def _get_avg_job_duration(self, db: Session, challenge_id: str) -> float:
        """Get average job duration in seconds from completed submissions."""
        avg = (
            db.query(func.avg(ChallengeSubmission.execution_time_seconds))
            .filter(
                ChallengeSubmission.challenge_id == challenge_id,
                ChallengeSubmission.status == "completed",
                ChallengeSubmission.execution_time_seconds.isnot(None),
            )
            .scalar()
        )
        return avg or 60.0

    def _recalculate_positions(self, db: Session, challenge_id: str):
        """Renumber queued jobs 1, 2, 3... after a job starts or completes."""
        queued = (
            db.query(ChallengeSubmission)
            .filter(
                ChallengeSubmission.challenge_id == challenge_id,
                ChallengeSubmission.status == "queued",
            )
            .order_by(ChallengeSubmission.queue_position.asc())
            .all()
        )
        for i, sub in enumerate(queued, start=1):
            sub.queue_position = i
        db.commit()


# Singleton instance
challenge_queue = ChallengeQueueManager()

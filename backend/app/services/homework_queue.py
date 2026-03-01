"""
FIFO Job Queue Manager for homework hardware submissions.
Manages concurrent IBM quantum hardware jobs with fair ordering.
"""
import json
import time
from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.homework import Homework, HomeworkToken, HomeworkSubmission
from .homework_service import (
    decrypt_api_key,
    compute_bell_fidelity,
    compute_homework_score,
    execute_judge_code,
    deduct_budget,
    get_student_label,
)
from ..config import settings


class HomeworkQueueManager:
    """
    Database-backed FIFO queue for homework hardware submissions.
    Limits concurrent IBM jobs and processes in order.
    """

    def enqueue(
        self,
        db: Session,
        homework: Homework,
        token_record: HomeworkToken,
        code: str,
        backend_name: str,
        shots: int = 1024,
    ) -> HomeworkSubmission:
        """
        Add a submission to the queue.
        Assigns next queue position and creates the submission record.
        The reference circuit comes from homework config; student provides one circuit.
        """
        # Get next queue position for this homework
        max_pos = (
            db.query(func.max(HomeworkSubmission.queue_position))
            .filter(
                HomeworkSubmission.homework_id == homework.id,
                HomeworkSubmission.status == "queued",
            )
            .scalar()
        )
        next_pos = (max_pos or 0) + 1

        submission = HomeworkSubmission(
            homework_id=homework.id,
            token_id=token_record.id,
            code_before=homework.reference_circuit,  # Admin's reference circuit
            code_after=code,                          # Student's distillation circuit
            backend_name=backend_name,
            shots=shots,
            queue_position=next_pos,
            status="queued",
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)
        return submission

    def process_next(self, db: Session, homework_id: str) -> Optional[HomeworkSubmission]:
        """
        Try to start the next queued job if under concurrency limit.
        Returns the submission that was started, or None.
        """
        homework = db.query(Homework).filter(Homework.id == homework_id).first()
        if not homework:
            return None

        # Count currently running jobs
        running_count = (
            db.query(HomeworkSubmission)
            .filter(
                HomeworkSubmission.homework_id == homework_id,
                HomeworkSubmission.status == "running",
            )
            .count()
        )

        if running_count >= homework.max_concurrent_jobs:
            return None

        # Pick the oldest queued submission (FIFO)
        next_sub = (
            db.query(HomeworkSubmission)
            .filter(
                HomeworkSubmission.homework_id == homework_id,
                HomeworkSubmission.status == "queued",
            )
            .order_by(HomeworkSubmission.queue_position.asc())
            .first()
        )

        if not next_sub:
            return None

        # Submit to IBM hardware
        success = self._submit_to_ibm(db, homework, next_sub)
        if success:
            next_sub.status = "running"
            next_sub.queue_position = None
            next_sub.started_at = datetime.utcnow()
            db.commit()
            self._recalculate_positions(db, homework_id)
            return next_sub
        else:
            db.commit()
            return None

    def _submit_to_ibm(
        self, db: Session, homework: Homework, submission: HomeworkSubmission
    ) -> bool:
        """
        Submit the circuit to IBM hardware using the homework's encrypted API key.
        Returns True on success, False on failure.
        """
        try:
            from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
            from qiskit.transpiler import generate_preset_pass_manager
            from ..services.code_validator import execute_circuit_code

            # Decrypt IBM API key
            api_key = decrypt_api_key(homework.ibmq_api_key_encrypted)

            # Create a QiskitRuntimeService instance
            service_kwargs = {
                "channel": homework.ibmq_channel,
                "token": api_key,
            }
            if homework.ibmq_instance:
                service_kwargs["instance"] = homework.ibmq_instance
            ibm_service = QiskitRuntimeService(**service_kwargs)

            backend = ibm_service.backend(submission.backend_name)
            pm = generate_preset_pass_manager(backend=backend, optimization_level=3)

            # Parse and submit the "before" circuit
            circuit_before, err = execute_circuit_code(submission.code_before)
            if circuit_before is None:
                submission.status = "failed"
                submission.error_message = f"Before circuit error: {err}"
                return False

            # Ensure measurements
            if not any(
                instr.operation.name == "measure" for instr in circuit_before.data
            ):
                circuit_before.measure_all()

            # Parse and submit the "after" circuit
            circuit_after, err = execute_circuit_code(submission.code_after)
            if circuit_after is None:
                submission.status = "failed"
                submission.error_message = f"After circuit error: {err}"
                return False

            if not any(
                instr.operation.name == "measure" for instr in circuit_after.data
            ):
                circuit_after.measure_all()

            # Record circuit stats from the "after" circuit
            submission.qubit_count = circuit_after.num_qubits
            submission.gate_count = len(circuit_after.data)
            submission.circuit_depth = circuit_after.depth()

            # Transpile both circuits
            isa_before = pm.run(circuit_before)
            isa_after = pm.run(circuit_after)

            # Submit both as a single batch job using SamplerV2
            sampler = SamplerV2(mode=backend)
            sampler.options.default_shots = submission.shots

            ibm_job = sampler.run([isa_before, isa_after])

            submission.ibmq_job_id_before = ibm_job.job_id()
            submission.ibmq_job_id_after = ibm_job.job_id()  # Same job, two pubs

            print(
                f"[HomeworkQueue] Job submitted: {ibm_job.job_id()} "
                f"for submission {submission.id}"
            )
            return True

        except Exception as e:
            print(f"[HomeworkQueue] Error submitting to IBM: {e}")
            submission.status = "failed"
            submission.error_message = str(e)
            return False

    def check_job_status(
        self, db: Session, submission: HomeworkSubmission
    ) -> HomeworkSubmission:
        """
        Poll IBM for job status and update the submission.
        If completed, compute fidelity and deduct budget.
        """
        if submission.status != "running" or not submission.ibmq_job_id_before:
            return submission

        homework = submission.homework

        try:
            from qiskit_ibm_runtime import QiskitRuntimeService

            api_key = decrypt_api_key(homework.ibmq_api_key_encrypted)
            service_kwargs = {
                "channel": homework.ibmq_channel,
                "token": api_key,
            }
            if homework.ibmq_instance:
                service_kwargs["instance"] = homework.ibmq_instance
            ibm_service = QiskitRuntimeService(**service_kwargs)

            ibm_job = ibm_service.job(submission.ibmq_job_id_before)
            raw_status = ibm_job.status()
            status_name = (
                raw_status.name
                if hasattr(raw_status, "name")
                else str(raw_status).upper()
            )

            status_map = {
                "QUEUED": "running",  # Keep as running from our perspective
                "VALIDATING": "running",
                "RUNNING": "running",
                "DONE": "completed",
                "ERROR": "failed",
                "CANCELLED": "failed",
            }

            new_status = status_map.get(status_name, submission.status)
            submission.last_checked_at = datetime.utcnow()

            if new_status == "completed":
                self._process_completion(db, submission, ibm_job)
            elif new_status == "failed":
                submission.status = "failed"
                try:
                    submission.error_message = str(
                        ibm_job.error_message() or "Job failed on IBM hardware"
                    )
                except Exception:
                    submission.error_message = "Job failed on IBM hardware"

            db.commit()

            # If job finished, try to process the next queued job
            if new_status in ("completed", "failed"):
                self.process_next(db, homework.id)

        except Exception as e:
            print(f"[HomeworkQueue] Error checking status: {e}")
            submission.last_checked_at = datetime.utcnow()
            db.commit()

        return submission

    def _process_completion(
        self, db: Session, submission: HomeworkSubmission, ibm_job
    ):
        """Process a completed IBM job: extract results, compute fidelity, deduct budget."""
        try:
            results = ibm_job.result()

            # Extract results for "before" circuit (pub index 0)
            pub_before = results[0]
            counts_before = pub_before.join_data().get_counts()
            total_before = sum(counts_before.values())
            probs_before = {k: v / total_before for k, v in counts_before.items()}

            # Extract results for "after" circuit (pub index 1)
            pub_after = results[1]
            counts_after = pub_after.join_data().get_counts()
            total_after = sum(counts_after.values())
            probs_after = {k: v / total_after for k, v in counts_after.items()}

            # Store results
            submission.measurements_before = json.dumps(counts_before)
            submission.measurements_after = json.dumps(counts_after)
            submission.probabilities_before = json.dumps(probs_before)
            submission.probabilities_after = json.dumps(probs_after)

            # Compute fidelities using custom judge code or defaults
            homework = submission.homework
            if homework and homework.judge_code:
                try:
                    judge_result = execute_judge_code(
                        homework.judge_code,
                        counts_before, total_before,
                        counts_after, total_after,
                    )
                    submission.fidelity_before = judge_result['fidelity_before']
                    submission.fidelity_after = judge_result['fidelity_after']
                    submission.fidelity_improvement = (
                        submission.fidelity_after - submission.fidelity_before
                    )
                    submission.score = judge_result['score']
                except Exception as judge_err:
                    print(f"[HomeworkQueue] Judge code error, using defaults: {judge_err}")
                    submission.fidelity_before = compute_bell_fidelity(
                        counts_before, total_before
                    )
                    submission.fidelity_after = compute_bell_fidelity(
                        counts_after, total_after
                    )
                    submission.fidelity_improvement = (
                        submission.fidelity_after - submission.fidelity_before
                    )
                    submission.score = compute_homework_score(
                        submission.fidelity_before, submission.fidelity_after
                    )
            else:
                submission.fidelity_before = compute_bell_fidelity(
                    counts_before, total_before
                )
                submission.fidelity_after = compute_bell_fidelity(
                    counts_after, total_after
                )
                submission.fidelity_improvement = (
                    submission.fidelity_after - submission.fidelity_before
                )
                submission.score = compute_homework_score(
                    submission.fidelity_before, submission.fidelity_after
                )

            submission.status = "completed"
            submission.completed_at = datetime.utcnow()

            # Estimate execution time from timestamps
            if submission.started_at:
                execution_time = (
                    datetime.utcnow() - submission.started_at
                ).total_seconds()
                submission.execution_time_seconds = execution_time

                # Deduct budget from student's token
                token_record = submission.token
                if token_record:
                    deduct_budget(db, token_record, execution_time)

            print(
                f"[HomeworkQueue] Submission {submission.id} completed: "
                f"fidelity {submission.fidelity_before:.3f} -> {submission.fidelity_after:.3f}"
            )

        except Exception as e:
            print(f"[HomeworkQueue] Error processing completion: {e}")
            submission.status = "completed"
            submission.completed_at = datetime.utcnow()
            submission.error_message = f"Results parsing error: {str(e)}"

    def get_queue_status(
        self, db: Session, homework_id: str, token_record: Optional[HomeworkToken] = None
    ) -> Dict[str, Any]:
        """Get full queue status for a homework."""
        # Queued jobs
        queued = (
            db.query(HomeworkSubmission)
            .filter(
                HomeworkSubmission.homework_id == homework_id,
                HomeworkSubmission.status == "queued",
            )
            .order_by(HomeworkSubmission.queue_position.asc())
            .all()
        )

        # Running jobs
        running = (
            db.query(HomeworkSubmission)
            .filter(
                HomeworkSubmission.homework_id == homework_id,
                HomeworkSubmission.status == "running",
            )
            .all()
        )

        # Build queue entries with anonymized labels
        queue_entries = []
        for sub in queued:
            label = get_student_label(sub.token) if sub.token else "unknown"
            queue_entries.append({
                "id": sub.id,
                "student_label": label,
                "position": sub.queue_position,
                "backend": sub.backend_name,
                "submitted_at": sub.created_at.isoformat() if sub.created_at else None,
            })

        running_entries = []
        for sub in running:
            label = get_student_label(sub.token) if sub.token else "unknown"
            running_entries.append({
                "id": sub.id,
                "student_label": label,
                "backend": sub.backend_name,
                "started_at": sub.started_at.isoformat() if sub.started_at else None,
            })

        # Current student's submissions
        my_submissions = []
        if token_record:
            my_subs = (
                db.query(HomeworkSubmission)
                .filter(
                    HomeworkSubmission.token_id == token_record.id,
                    HomeworkSubmission.status.in_(["queued", "running"]),
                )
                .all()
            )
            for sub in my_subs:
                my_submissions.append({
                    "id": sub.id,
                    "position": sub.queue_position,
                    "status": sub.status,
                })

        # Estimate wait time
        avg_duration = self._get_avg_job_duration(db, homework_id)
        homework = db.query(Homework).filter(Homework.id == homework_id).first()
        max_concurrent = homework.max_concurrent_jobs if homework else 3
        estimated_wait = (len(queued) * avg_duration) / max_concurrent / 60.0

        return {
            "queue": queue_entries,
            "running": running_entries,
            "my_submissions": my_submissions,
            "total_queued": len(queued),
            "total_running": len(running),
            "estimated_wait_minutes": round(estimated_wait, 1),
        }

    def _get_avg_job_duration(self, db: Session, homework_id: str) -> float:
        """Get average job duration in seconds from completed submissions."""
        avg = (
            db.query(func.avg(HomeworkSubmission.execution_time_seconds))
            .filter(
                HomeworkSubmission.homework_id == homework_id,
                HomeworkSubmission.status == "completed",
                HomeworkSubmission.execution_time_seconds.isnot(None),
            )
            .scalar()
        )
        return avg or 60.0  # Default 60s if no data

    def _recalculate_positions(self, db: Session, homework_id: str):
        """Renumber queued jobs 1, 2, 3... after a job starts or completes."""
        queued = (
            db.query(HomeworkSubmission)
            .filter(
                HomeworkSubmission.homework_id == homework_id,
                HomeworkSubmission.status == "queued",
            )
            .order_by(HomeworkSubmission.queue_position.asc())
            .all()
        )
        for i, sub in enumerate(queued, start=1):
            sub.queue_position = i
        db.commit()


# Singleton instance
homework_queue = HomeworkQueueManager()

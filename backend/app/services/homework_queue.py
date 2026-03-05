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
    _apply_post_selection,
    prepare_inverse_bell_circuit,
    prepare_tomography_circuits,
    compute_fidelity_inverse_bell,
    compute_fidelity_tomography,
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
        eval_method: str = "inverse_bell",
        custom_api_key: str = None,
    ) -> HomeworkSubmission:
        """
        Add a submission to the queue.
        Assigns next queue position and creates the submission record.
        The reference circuit comes from homework config; student provides one circuit.
        If custom_api_key is provided, it's encrypted and stored on the submission.
        """
        from .homework_service import encrypt_api_key

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
            code_before=homework.reference_circuit or "",  # Admin's reference circuit (may be empty)
            code_after=code,                          # Student's distillation circuit
            backend_name=backend_name,
            shots=shots,
            queue_position=next_pos,
            status="queued",
            eval_method=eval_method,
            custom_api_key_encrypted=encrypt_api_key(custom_api_key) if custom_api_key else None,
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

        For inverse_bell: 2 pubs (ref + student, each with inverse Bell verification)
        For tomography: 6 pubs (ref ZZ/XX/YY + student ZZ/XX/YY)
        """
        try:
            from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
            from qiskit.transpiler import generate_preset_pass_manager
            from ..services.code_validator import execute_circuit_code

            # Use student-provided key if available, otherwise homework's default
            if submission.custom_api_key_encrypted:
                api_key = decrypt_api_key(submission.custom_api_key_encrypted)
            else:
                api_key = decrypt_api_key(homework.ibmq_api_key_encrypted)

            ibm_service = QiskitRuntimeService(channel="ibm_cloud", token=api_key)

            backend = ibm_service.backend(submission.backend_name)

            has_reference = bool(submission.code_before and submission.code_before.strip())

            # Parse the "before" (reference) circuit if it exists
            circuit_before = None
            if has_reference:
                circuit_before, _, _, err = execute_circuit_code(submission.code_before)
                if circuit_before is None:
                    submission.status = "failed"
                    submission.error_message = f"Before circuit error: {err}"
                    return False

                if not any(
                    instr.operation.name == "measure" for instr in circuit_before.data
                ):
                    circuit_before.measure_all()

            # Parse the "after" (student) circuit + extract initial layout
            circuit_after, _, initial_layout, err = execute_circuit_code(submission.code_after)
            if circuit_after is None:
                submission.status = "failed"
                submission.error_message = f"After circuit error: {err}"
                return False

            if not any(
                instr.operation.name == "measure" for instr in circuit_after.data
            ):
                circuit_after.measure_all()

            # Record circuit stats from the "after" circuit (before eval transforms)
            submission.qubit_count = circuit_after.num_qubits
            submission.gate_count = len(circuit_after.data)
            submission.circuit_depth = circuit_after.depth()

            # Create pass managers
            pm_kwargs = {"backend": backend, "optimization_level": 0}
            if initial_layout:
                pm_kwargs["initial_layout"] = initial_layout
            pm_student = generate_preset_pass_manager(**pm_kwargs)

            eval_method = submission.eval_method or "inverse_bell"

            if has_reference:
                pm_ref = generate_preset_pass_manager(backend=backend, optimization_level=0)

                if eval_method == "tomography":
                    ref_tomo = prepare_tomography_circuits(circuit_before)
                    stu_tomo = prepare_tomography_circuits(circuit_after)

                    pubs_to_run = [
                        pm_ref.run(ref_tomo["ZZ"]),
                        pm_ref.run(ref_tomo["XX"]),
                        pm_ref.run(ref_tomo["YY"]),
                        pm_student.run(stu_tomo["ZZ"]),
                        pm_student.run(stu_tomo["XX"]),
                        pm_student.run(stu_tomo["YY"]),
                    ]
                    pub_count = 6
                else:
                    inv_before = prepare_inverse_bell_circuit(circuit_before)
                    inv_after = prepare_inverse_bell_circuit(circuit_after)

                    pubs_to_run = [
                        pm_ref.run(inv_before),
                        pm_student.run(inv_after),
                    ]
                    pub_count = 2
            else:
                # No reference circuit — run only the student's circuit
                if eval_method == "tomography":
                    stu_tomo = prepare_tomography_circuits(circuit_after)
                    pubs_to_run = [
                        pm_student.run(stu_tomo["ZZ"]),
                        pm_student.run(stu_tomo["XX"]),
                        pm_student.run(stu_tomo["YY"]),
                    ]
                    pub_count = 3
                else:
                    inv_after = prepare_inverse_bell_circuit(circuit_after)
                    pubs_to_run = [pm_student.run(inv_after)]
                    pub_count = 1

            # Submit as a single batch job using SamplerV2
            sampler = SamplerV2(mode=backend)
            sampler.options.default_shots = submission.shots

            ibm_job = sampler.run(pubs_to_run)

            submission.ibmq_job_id_before = ibm_job.job_id()
            submission.ibmq_job_id_after = ibm_job.job_id()  # Same job

            print(
                f"[HomeworkQueue] Job submitted: {ibm_job.job_id()} "
                f"({eval_method}, {pub_count} pubs, ref={'yes' if has_reference else 'no'}) "
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

            # Use student-provided key if available, otherwise homework's default
            if submission.custom_api_key_encrypted:
                api_key = decrypt_api_key(submission.custom_api_key_encrypted)
            else:
                api_key = decrypt_api_key(homework.ibmq_api_key_encrypted)
            ibm_service = QiskitRuntimeService(channel="ibm_cloud", token=api_key)

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
            eval_method = submission.eval_method or "inverse_bell"
            has_reference = bool(submission.code_before and submission.code_before.strip())

            # Extract POST_SELECT from student's code for post-selection
            from ..services.code_validator import execute_circuit_code
            _, post_select, _, _ = execute_circuit_code(submission.code_after)

            homework = submission.homework

            if eval_method == "tomography":
                self._process_tomography(submission, results, post_select, homework, has_reference)
            else:
                self._process_inverse_bell(submission, results, post_select, homework, has_reference)

            submission.status = "completed"
            submission.completed_at = datetime.utcnow()

            # Get actual execution time from IBM job metrics
            execution_time = None
            try:
                metrics = ibm_job.metrics()
                # IBM reports usage in seconds via 'usage' or 'quantum_seconds'
                if metrics:
                    usage = metrics.get("usage", {})
                    if isinstance(usage, dict):
                        execution_time = usage.get("quantum_seconds") or usage.get("seconds")
                    elif isinstance(usage, (int, float)):
                        execution_time = float(usage)
                    # Fallback: try billed_seconds or estimated_run_time
                    if not execution_time:
                        execution_time = metrics.get("billed_seconds") or metrics.get("estimated_run_time_seconds")
            except Exception as e:
                print(f"[HomeworkQueue] Could not get IBM metrics: {e}")

            # Fallback to wall-clock time if IBM metrics unavailable
            if not execution_time and submission.started_at:
                execution_time = (
                    datetime.utcnow() - submission.started_at
                ).total_seconds()

            if execution_time:
                submission.execution_time_seconds = execution_time

                # Only deduct budget if student used the platform's API key (not their own)
                if not submission.custom_api_key_encrypted:
                    token_record = submission.token
                    if token_record:
                        deduct_budget(db, token_record, execution_time)

            print(
                f"[HomeworkQueue] Submission {submission.id} completed ({eval_method}): "
                f"fidelity {submission.fidelity_before:.3f} -> {submission.fidelity_after:.3f}"
            )

        except Exception as e:
            print(f"[HomeworkQueue] Error processing completion: {e}")
            submission.status = "completed"
            submission.completed_at = datetime.utcnow()
            submission.error_message = f"Results parsing error: {str(e)}"

    def _process_inverse_bell(self, submission, results, post_select, homework, has_reference=True):
        """Process inverse_bell results."""
        if has_reference:
            # 2 pubs: pub 0 = reference, pub 1 = student
            pub_before = results[0]
            counts_before = pub_before.join_data().get_counts()
            total_before = sum(counts_before.values())
            pub_after = results[1]
        else:
            # 1 pub: pub 0 = student only
            counts_before = {}
            total_before = 0
            pub_after = results[0]

        counts_after = pub_after.join_data().get_counts()
        total_after = sum(counts_after.values())

        # Store counts for display
        submission.measurements_before = json.dumps(counts_before) if counts_before else None
        submission.measurements_after = json.dumps(counts_after)
        probs_before = {k: v / total_before for k, v in counts_before.items()} if total_before > 0 else {}
        probs_after = {k: v / total_after for k, v in counts_after.items()} if total_after > 0 else {}
        submission.probabilities_before = json.dumps(probs_before) if probs_before else None
        submission.probabilities_after = json.dumps(probs_after)

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
                _, post_selected_shots, _ = _apply_post_selection(counts_after, post_select)
            except Exception as judge_err:
                print(f"[HomeworkQueue] Judge code error, using inverse_bell defaults: {judge_err}")
                self._compute_inverse_bell_fidelities(submission, counts_before, counts_after, post_select)
                return
        else:
            self._compute_inverse_bell_fidelities(submission, counts_before, counts_after, post_select)
            return

        # Store post-selection stats
        submission.post_selected_shots = post_selected_shots
        submission.success_probability = (
            post_selected_shots / total_after if total_after > 0 else 0.0
        )

    def _compute_inverse_bell_fidelities(self, submission, counts_before, counts_after, post_select):
        """Compute fidelities using inverse Bell method."""
        total_after = sum(counts_after.values())

        # Reference: no post-selection (reference circuit has no ancilla)
        if counts_before:
            fid_before, _, _ = compute_fidelity_inverse_bell(counts_before, post_select=None)
        else:
            fid_before = 0.0
        submission.fidelity_before = fid_before

        # Student: with post-selection
        fid_after, post_selected_shots, _ = compute_fidelity_inverse_bell(counts_after, post_select)
        submission.fidelity_after = fid_after
        submission.fidelity_improvement = fid_after - fid_before
        submission.score = compute_homework_score(fid_before, fid_after)
        submission.post_selected_shots = post_selected_shots
        submission.success_probability = (
            post_selected_shots / total_after if total_after > 0 else 0.0
        )

    def _process_tomography(self, submission, results, post_select, homework, has_reference=True):
        """Process tomography results."""
        stu_counts = {}

        if has_reference:
            # 6 pubs: ref ZZ/XX/YY (0-2), student ZZ/XX/YY (3-5)
            ref_counts = {}
            for i, basis in enumerate(["ZZ", "XX", "YY"]):
                ref_counts[basis] = results[i].join_data().get_counts()
                stu_counts[basis] = results[i + 3].join_data().get_counts()

            total_before = sum(ref_counts["ZZ"].values())
            submission.measurements_before = json.dumps(ref_counts["ZZ"])
            probs_before = {k: v / total_before for k, v in ref_counts["ZZ"].items()} if total_before > 0 else {}
            submission.probabilities_before = json.dumps(probs_before)

            fid_before, _, _ = compute_fidelity_tomography(
                ref_counts["ZZ"], ref_counts["XX"], ref_counts["YY"], post_select=None
            )
        else:
            # 3 pubs: student ZZ/XX/YY (0-2)
            for i, basis in enumerate(["ZZ", "XX", "YY"]):
                stu_counts[basis] = results[i].join_data().get_counts()

            fid_before = 0.0
            submission.measurements_before = None
            submission.probabilities_before = None

        submission.fidelity_before = fid_before

        total_after = sum(stu_counts["ZZ"].values())
        submission.measurements_after = json.dumps(stu_counts["ZZ"])
        probs_after = {k: v / total_after for k, v in stu_counts["ZZ"].items()} if total_after > 0 else {}
        submission.probabilities_after = json.dumps(probs_after)

        # Student fidelity: with post-selection
        fid_after, corr_after, min_ps = compute_fidelity_tomography(
            stu_counts["ZZ"], stu_counts["XX"], stu_counts["YY"], post_select=post_select
        )
        submission.fidelity_after = fid_after
        submission.fidelity_improvement = fid_after - fid_before
        submission.score = compute_homework_score(fid_before, fid_after)
        submission.tomography_correlators = json.dumps(corr_after)
        submission.post_selected_shots = min_ps
        submission.success_probability = (
            min_ps / total_after if total_after > 0 else 0.0
        )

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

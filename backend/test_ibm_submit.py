"""
Test script: Submit jobs to all IBM backends and verify results.
Run on the server: cd /root/QCloud/backend && source venv/bin/activate && python test_ibm_submit.py
"""
import sys
import time
import json
sys.path.insert(0, '.')

from app.database import SessionLocal, engine
from app.models.homework import Homework, HomeworkToken, HomeworkSubmission
from app.services.homework_service import encrypt_api_key, decrypt_api_key
from app.services.homework_queue import homework_queue

# ---- Config ----
NEW_API_KEY = "M52Lw98hsbtzV6MhTQ36Mm1X1WPIBLkhT7VuEj2E2HVk"

ALL_IBM_BACKENDS = [
    "ibm_torino",
    "ibm_fez",
    "ibm_kingston",
    "ibm_marrakesh",
    "ibm_boston",
    "ibm_pittsburgh",
    "ibm_miami",
]

# Simple BBPSSW test circuit
TEST_CODE = """
qc = QuantumCircuit(4, 4)

# Bell pair 1 (output): q0, q1
qc.h(0)
qc.cx(0, 1)

# Bell pair 2 (ancilla): q2, q3
qc.h(2)
qc.cx(2, 3)

# Bilateral CNOT
qc.cx(0, 2)
qc.cx(1, 3)

# Measure all
qc.measure([0, 1, 2, 3], [0, 1, 2, 3])

POST_SELECT = {"00"}
INITIAL_LAYOUT = [0, 1, 2, 3]
"""

def main():
    db = SessionLocal()
    try:
        # 1. Find homework
        homework = db.query(Homework).first()
        if not homework:
            print("ERROR: No homework found in database!")
            return
        print(f"Found homework: {homework.id} - {homework.title}")

        # 2. Update API key
        print(f"\nUpdating IBM API key...")
        homework.ibmq_api_key_encrypted = encrypt_api_key(NEW_API_KEY)
        db.commit()
        # Verify
        decrypted = decrypt_api_key(homework.ibmq_api_key_encrypted)
        assert decrypted == NEW_API_KEY, "API key roundtrip failed!"
        print("API key updated and verified OK")

        # 3. Get or create admin token
        admin_token = (
            db.query(HomeworkToken)
            .filter(HomeworkToken.homework_id == homework.id, HomeworkToken.student_uid == "__admin__")
            .first()
        )
        if not admin_token:
            admin_token = HomeworkToken(
                homework_id=homework.id,
                student_uid="__admin__",
                token_hash="__admin_no_token__",
                budget_limit_seconds=999999,
                is_active=True,
                display_name="IBM Test",
            )
            db.add(admin_token)
            db.commit()
            db.refresh(admin_token)
        print(f"Admin token: {admin_token.id}")

        # 4. Submit to all backends
        submission_ids = {}
        for backend in ALL_IBM_BACKENDS:
            print(f"\nSubmitting to {backend}...")
            try:
                sub = homework_queue.enqueue(
                    db=db,
                    homework=homework,
                    token_record=admin_token,
                    code=TEST_CODE,
                    backend_name=backend,
                    shots=100,  # small for test
                    eval_method="inverse_bell",
                )
                submission_ids[backend] = sub.id
                print(f"  Enqueued: {sub.id} (status={sub.status}, pos={sub.queue_position})")
            except Exception as e:
                print(f"  ERROR enqueue: {e}")

        # 5. Process queue
        print(f"\nProcessing queue (max_concurrent={homework.max_concurrent_jobs})...")
        started_count = 0
        for _ in range(len(ALL_IBM_BACKENDS)):
            started = homework_queue.process_next(db, homework.id)
            if started:
                started_count += 1
                print(f"  Started: {started.id} on {started.backend_name} (IBM job: {started.ibmq_job_id_after})")
            else:
                break
        print(f"  {started_count} jobs started, rest queued")

        # 6. Poll for results
        print(f"\nPolling for results (max 10 minutes)...")
        poll_interval = 30  # seconds
        max_polls = 20  # 10 minutes
        completed = set()
        failed = set()

        for poll_num in range(1, max_polls + 1):
            # Check status of all submissions
            for backend, sub_id in submission_ids.items():
                if backend in completed or backend in failed:
                    continue
                sub = db.query(HomeworkSubmission).get(sub_id)
                if not sub:
                    continue
                db.refresh(sub)

                if sub.status == "completed":
                    completed.add(backend)
                    fid = sub.fidelity_after
                    print(f"  COMPLETED: {backend} - fidelity_after={fid:.4f}" if fid else f"  COMPLETED: {backend}")
                elif sub.status == "failed":
                    failed.add(backend)
                    print(f"  FAILED: {backend} - {sub.error_message}")
                elif sub.status == "running":
                    # Try to check IBM status
                    try:
                        homework_queue.check_job_status(db, sub)
                        db.refresh(sub)
                        if sub.status == "completed":
                            completed.add(backend)
                            fid = sub.fidelity_after
                            print(f"  COMPLETED: {backend} - fidelity_after={fid:.4f}" if fid else f"  COMPLETED: {backend}")
                            # Process next from queue
                            next_sub = homework_queue.process_next(db, homework.id)
                            if next_sub:
                                print(f"  Started next: {next_sub.id} on {next_sub.backend_name}")
                        elif sub.status == "failed":
                            failed.add(backend)
                            print(f"  FAILED: {backend} - {sub.error_message}")
                            next_sub = homework_queue.process_next(db, homework.id)
                            if next_sub:
                                print(f"  Started next: {next_sub.id} on {next_sub.backend_name}")
                    except Exception as e:
                        print(f"  Error checking {backend}: {e}")
                elif sub.status == "queued":
                    pass  # Still waiting

            all_done = len(completed) + len(failed) == len(submission_ids)
            if all_done:
                break

            # At least one completed? Good enough for verification
            if completed and poll_num >= 3:
                print(f"\n  At least one job completed, continuing to poll remaining...")

            remaining = len(submission_ids) - len(completed) - len(failed)
            print(f"\n  Poll {poll_num}/{max_polls}: {len(completed)} completed, {len(failed)} failed, {remaining} pending")

            if remaining == 0:
                break

            time.sleep(poll_interval)

        # 7. Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        for backend in ALL_IBM_BACKENDS:
            sub_id = submission_ids.get(backend)
            if not sub_id:
                print(f"  {backend}: NOT SUBMITTED")
                continue
            sub = db.query(HomeworkSubmission).get(sub_id)
            db.refresh(sub)
            status = sub.status
            fid = f"{sub.fidelity_after:.4f}" if sub.fidelity_after else "N/A"
            job_id = sub.ibmq_job_id_after or "N/A"
            print(f"  {backend}: {status} | fidelity={fid} | ibm_job={job_id}")

        print(f"\nTotal: {len(completed)} completed, {len(failed)} failed, {len(submission_ids) - len(completed) - len(failed)} still pending")
        if completed:
            print("\nVERIFICATION: SUCCESS - at least one IBM backend returned results!")
        else:
            print("\nVERIFICATION: PENDING - no jobs completed yet. Check back later or run again.")

    finally:
        db.close()


if __name__ == "__main__":
    main()

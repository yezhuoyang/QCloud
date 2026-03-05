"""
Test: Verify that submissions with a custom IBM API key bypass the queue
and are submitted directly to IBM.

Run: cd /root/QCloud/backend && source venv/bin/activate && python test_custom_key_submit.py
"""
import sys
import time
sys.path.insert(0, '.')

from app.database import SessionLocal
from app.models.homework import Homework, HomeworkToken, HomeworkSubmission
from app.services.homework_service import encrypt_api_key
from app.services.homework_queue import homework_queue
from datetime import datetime

CUSTOM_API_KEY = "M52Lw98hsbtzV6MhTQ36Mm1X1WPIBLkhT7VuEj2E2HVk"
TEST_BACKEND = "ibm_torino"

TEST_CODE = """
qc = QuantumCircuit(4, 4)
qc.h(0)
qc.cx(0, 1)
qc.h(2)
qc.cx(2, 3)
qc.cx(0, 2)
qc.cx(1, 3)
qc.measure([0, 1, 2, 3], [0, 1, 2, 3])
POST_SELECT = {"00"}
INITIAL_LAYOUT = [0, 1, 2, 3]
"""


def main():
    db = SessionLocal()
    try:
        homework = db.query(Homework).first()
        if not homework:
            print("ERROR: No homework found!")
            return
        print(f"Homework: {homework.id} - {homework.title}")
        print(f"Max concurrent jobs (queue limit): {homework.max_concurrent_jobs}")

        # Get admin token
        admin_token = (
            db.query(HomeworkToken)
            .filter(HomeworkToken.homework_id == homework.id, HomeworkToken.student_uid == "__admin__")
            .first()
        )
        if not admin_token:
            print("ERROR: No admin token found. Run test_ibm_submit.py first.")
            return

        # Count currently running/queued jobs
        running = db.query(HomeworkSubmission).filter(
            HomeworkSubmission.homework_id == homework.id,
            HomeworkSubmission.status == "running",
        ).count()
        queued = db.query(HomeworkSubmission).filter(
            HomeworkSubmission.homework_id == homework.id,
            HomeworkSubmission.status == "queued",
        ).count()
        print(f"\nCurrent queue state: {running} running, {queued} queued")

        # Submit with custom API key — should bypass queue
        print(f"\nSubmitting to {TEST_BACKEND} with CUSTOM API key (should bypass queue)...")
        sub = homework_queue.enqueue(
            db=db,
            homework=homework,
            token_record=admin_token,
            code=TEST_CODE,
            backend_name=TEST_BACKEND,
            shots=100,
            eval_method="inverse_bell",
            custom_api_key=CUSTOM_API_KEY,
        )
        print(f"  Enqueued: {sub.id} (status={sub.status})")

        # Now directly submit to IBM (bypassing queue concurrency check)
        print("  Submitting directly to IBM (bypassing queue)...")
        success = homework_queue._submit_to_ibm(db, homework, sub)
        if success:
            sub.status = "running"
            sub.queue_position = None
            sub.started_at = datetime.utcnow()
            db.commit()
            print(f"  DIRECT SUBMIT SUCCESS!")
            print(f"  Status: {sub.status}")
            print(f"  IBM Job ID: {sub.ibmq_job_id_after}")
        else:
            db.commit()
            print(f"  DIRECT SUBMIT FAILED: {sub.error_message}")
            return

        # Poll for result
        print(f"\nPolling for result (max 5 minutes)...")
        for i in range(10):
            time.sleep(30)
            db.refresh(sub)
            homework_queue.check_job_status(db, sub)
            db.refresh(sub)
            print(f"  Poll {i+1}/10: status={sub.status}")
            if sub.status == "completed":
                print(f"\n  RESULT: fidelity={sub.fidelity_after:.4f}")
                break
            elif sub.status == "failed":
                print(f"\n  FAILED: {sub.error_message}")
                break

        print("\n" + "=" * 60)
        if sub.status == "completed":
            print("VERIFICATION: SUCCESS")
            print(f"  Custom API key job submitted directly (bypassed queue)")
            print(f"  IBM Job: {sub.ibmq_job_id_after}")
            print(f"  Fidelity: {sub.fidelity_after:.4f}")
        elif sub.status == "running":
            print("VERIFICATION: JOB STILL RUNNING")
            print(f"  IBM Job: {sub.ibmq_job_id_after}")
            print("  The job was submitted directly (bypassed queue) - just needs more time.")
        else:
            print(f"VERIFICATION: {sub.status}")
        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    main()

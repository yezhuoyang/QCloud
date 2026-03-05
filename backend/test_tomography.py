"""
Test: Verify tomography eval method works on real IBM hardware.
Tomography submits 3 pubs (ZZ, XX, YY bases) in a single IBM job.

Run: cd /root/QCloud/backend && source venv/bin/activate && python test_tomography.py
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

        # Get admin token
        admin_token = (
            db.query(HomeworkToken)
            .filter(HomeworkToken.homework_id == homework.id, HomeworkToken.student_uid == "__admin__")
            .first()
        )
        if not admin_token:
            print("ERROR: No admin token found.")
            return

        # Submit with tomography eval method
        print(f"\nSubmitting to {TEST_BACKEND} with eval_method=tomography...")
        print("  (Tomography creates 3 pubs: ZZ, XX, YY bases)")
        sub = homework_queue.enqueue(
            db=db,
            homework=homework,
            token_record=admin_token,
            code=TEST_CODE,
            backend_name=TEST_BACKEND,
            shots=100,
            eval_method="tomography",
            custom_api_key=CUSTOM_API_KEY,
        )
        print(f"  Enqueued: {sub.id} (eval_method={sub.eval_method})")

        # Submit directly to IBM
        print("  Submitting directly to IBM...")
        success = homework_queue._submit_to_ibm(db, homework, sub)
        if success:
            sub.status = "running"
            sub.queue_position = None
            sub.started_at = datetime.utcnow()
            db.commit()
            print(f"  SUCCESS! IBM Job ID: {sub.ibmq_job_id_after}")
        else:
            db.commit()
            print(f"  FAILED: {sub.error_message}")
            return

        # Poll for result
        print(f"\nPolling for result (max 10 minutes)...")
        for i in range(20):
            time.sleep(30)
            db.refresh(sub)
            try:
                homework_queue.check_job_status(db, sub)
                db.refresh(sub)
            except Exception as e:
                print(f"  Poll {i+1}/20: Error checking status: {e}")
                continue

            print(f"  Poll {i+1}/20: status={sub.status}")

            if sub.status == "completed":
                print(f"\n  === TOMOGRAPHY RESULTS ===")
                print(f"  Fidelity: {sub.fidelity_after:.4f}" if sub.fidelity_after else "  Fidelity: N/A")
                if sub.success_probability is not None:
                    print(f"  Success Probability: {sub.success_probability:.4f}")
                if sub.tomography_correlators:
                    import json
                    corr = json.loads(sub.tomography_correlators) if isinstance(sub.tomography_correlators, str) else sub.tomography_correlators
                    print(f"  Correlators:")
                    for basis, val in corr.items():
                        print(f"    {basis}: {val:.4f}")
                if sub.measurements_after:
                    import json
                    meas = json.loads(sub.measurements_after) if isinstance(sub.measurements_after, str) else sub.measurements_after
                    print(f"  Measurements (top 5):")
                    sorted_m = sorted(meas.items(), key=lambda x: -x[1])[:5]
                    for bitstr, count in sorted_m:
                        print(f"    {bitstr}: {count}")
                break
            elif sub.status == "failed":
                print(f"\n  FAILED: {sub.error_message}")
                break

        print("\n" + "=" * 60)
        if sub.status == "completed":
            print("VERIFICATION: TOMOGRAPHY SUCCESS")
            print(f"  Fidelity: {sub.fidelity_after:.4f}" if sub.fidelity_after else "  Fidelity: N/A")
        elif sub.status == "running":
            print("VERIFICATION: STILL RUNNING - needs more time")
            print(f"  IBM Job: {sub.ibmq_job_id_after}")
        else:
            print(f"VERIFICATION: {sub.status} - {sub.error_message}")
        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    main()

"""
CLI script for TA to generate homework tokens from a list of student UIDs.

Usage:
    python generate_tokens.py <homework_id> <uids_file.txt>

The UIDs file should have one UCLA student ID per line.
Outputs a CSV with columns: student_uid, token

Example:
    python generate_tokens.py abc123 student_uids.txt > tokens.csv
"""
import sys
import csv

# Add the parent directory to path so we can import app modules
sys.path.insert(0, ".")

from app.database import SessionLocal
from app.models.homework import Homework, HomeworkToken
from app.services.homework_service import (
    generate_student_token,
    hash_token,
    hash_student_uid,
)


def main():
    if len(sys.argv) < 3:
        print("Usage: python generate_tokens.py <homework_id> <uids_file.txt>", file=sys.stderr)
        print("", file=sys.stderr)
        print("The UIDs file should have one student ID per line.", file=sys.stderr)
        print("Outputs CSV to stdout: student_uid,token", file=sys.stderr)
        sys.exit(1)

    homework_id = sys.argv[1]
    uids_file = sys.argv[2]

    db = SessionLocal()

    try:
        homework = db.query(Homework).filter(Homework.id == homework_id).first()
        if not homework:
            print(f"Error: Homework '{homework_id}' not found", file=sys.stderr)
            sys.exit(1)

        print(f"Homework: {homework.title} ({homework.course})", file=sys.stderr)
        print(f"Budget per student: {homework.per_student_budget_seconds}s", file=sys.stderr)
        print("", file=sys.stderr)

        # Read UIDs
        with open(uids_file, "r") as f:
            uids = [line.strip() for line in f if line.strip()]

        print(f"Found {len(uids)} student UIDs", file=sys.stderr)

        output_rows = []
        created = 0
        existing = 0

        for uid in uids:
            token = generate_student_token(homework.token_secret, uid)
            uid_hash = hash_student_uid(uid)
            token_h = hash_token(token)

            # Check if token already exists
            existing_record = (
                db.query(HomeworkToken)
                .filter(
                    HomeworkToken.homework_id == homework_id,
                    HomeworkToken.student_uid == uid_hash,
                )
                .first()
            )

            if not existing_record:
                token_record = HomeworkToken(
                    homework_id=homework_id,
                    student_uid=uid_hash,
                    token_hash=token_h,
                    budget_limit_seconds=homework.per_student_budget_seconds,
                    is_active=True,
                )
                db.add(token_record)
                created += 1
            else:
                existing += 1

            output_rows.append((uid, token))

        db.commit()

        # Write CSV to stdout
        writer = csv.writer(sys.stdout)
        writer.writerow(["student_uid", "token"])
        for row in output_rows:
            writer.writerow(row)

        print("", file=sys.stderr)
        print(f"Generated {len(output_rows)} tokens:", file=sys.stderr)
        print(f"  - {created} new tokens created", file=sys.stderr)
        print(f"  - {existing} already existed (tokens regenerated)", file=sys.stderr)

    finally:
        db.close()


if __name__ == "__main__":
    main()

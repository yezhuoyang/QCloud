"""
QCloud Backend - FastAPI Application Entry Point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables
from app.api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and other services on startup"""
    import asyncio

    print(f"Starting {settings.app_name} v{settings.app_version}")
    create_tables()
    print("Database tables created/verified")

    # Recover orphaned running/queued jobs from previous server session
    asyncio.ensure_future(_recover_orphaned_jobs())

    yield


async def _recover_orphaned_jobs():
    """Find jobs stuck in 'running' or 'queued' and restart polling/processing."""
    import asyncio
    from app.database import SessionLocal
    from app.models.homework import HomeworkSubmission
    from app.models.challenge import ChallengeSubmission
    from app.services.homework_queue import homework_queue
    from app.services.challenge_queue import challenge_queue
    from app.api.homework import _poll_submission_status
    from app.api.challenge import _poll_challenge_submission

    # Small delay to let the server finish starting
    await asyncio.sleep(2)

    db = SessionLocal()
    try:
        # === Homework jobs ===
        running_hw = (
            db.query(HomeworkSubmission)
            .filter(HomeworkSubmission.status == "running")
            .all()
        )
        if running_hw:
            print(f"[Recovery] Found {len(running_hw)} orphaned running homework jobs, restarting polling")
        for sub in running_hw:
            asyncio.ensure_future(_poll_submission_status(sub.id))

        queued_hw_ids = (
            db.query(HomeworkSubmission.homework_id)
            .filter(HomeworkSubmission.status == "queued")
            .distinct()
            .all()
        )
        for (hw_id,) in queued_hw_ids:
            started = homework_queue.process_next(db, hw_id)
            if started:
                print(f"[Recovery] Started queued homework submission {started.id} on {started.backend_name}")
                asyncio.ensure_future(_poll_submission_status(started.id))

        # === Challenge jobs ===
        running_ch = (
            db.query(ChallengeSubmission)
            .filter(ChallengeSubmission.status == "running")
            .all()
        )
        if running_ch:
            print(f"[Recovery] Found {len(running_ch)} orphaned running challenge jobs, restarting polling")
        for sub in running_ch:
            asyncio.ensure_future(_poll_challenge_submission(sub.id))

        queued_ch_ids = (
            db.query(ChallengeSubmission.challenge_id)
            .filter(ChallengeSubmission.status == "queued")
            .distinct()
            .all()
        )
        for (ch_id,) in queued_ch_ids:
            started = challenge_queue.process_next(db, ch_id)
            if started:
                print(f"[Recovery] Started queued challenge submission {started.id} on {started.backend_name}")
                asyncio.ensure_future(_poll_challenge_submission(started.id))

    except Exception as e:
        print(f"[Recovery] Error recovering orphaned jobs: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="QCloud Quantum Computing Platform Backend API",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:5173",  # Vite default port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint - API health check"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

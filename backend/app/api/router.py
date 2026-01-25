"""
Main API router - combines all route modules
"""
from fastapi import APIRouter

from .auth import router as auth_router
from .users import router as users_router
from .submissions import router as submissions_router
from .jobs import router as jobs_router
from .leaderboard import router as leaderboard_router
from .admin import router as admin_router
from .problems import router as problems_router
from .simulator import router as simulator_router
from .hardware import router as hardware_router

# Create main API router (no prefix - added in main.py)
api_router = APIRouter()

# Include all route modules
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(submissions_router)
api_router.include_router(jobs_router)
api_router.include_router(leaderboard_router)
api_router.include_router(admin_router)
api_router.include_router(problems_router)
api_router.include_router(simulator_router)
api_router.include_router(hardware_router)

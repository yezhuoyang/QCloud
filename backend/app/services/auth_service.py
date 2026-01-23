"""
Authentication service - business logic for user auth
"""
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from ..models import User, UserStats
from ..schemas import RegisterRequest, UserResponse
from ..core.security import get_password_hash, verify_password, create_access_token


class AuthService:
    """Authentication service class"""

    @staticmethod
    def register_user(db: Session, data: RegisterRequest) -> Tuple[Optional[User], Optional[str]]:
        """
        Register a new user
        Returns: (user, error_message)
        """
        # Check if email exists
        existing_email = db.query(User).filter(User.email == data.email).first()
        if existing_email:
            return None, "Email already registered"

        # Check if username exists
        existing_username = db.query(User).filter(User.username == data.username).first()
        if existing_username:
            return None, "Username already taken"

        # Create user
        user = User(
            email=data.email,
            username=data.username,
            password_hash=get_password_hash(data.password)
        )
        db.add(user)
        db.flush()  # Get the user ID

        # Create user stats
        user_stats = UserStats(user_id=user.id)
        db.add(user_stats)

        db.commit()
        db.refresh(user)

        return user, None

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """
        Authenticate user by email and password
        Returns user if valid, None otherwise
        """
        user = db.query(User).filter(User.email == email).first()

        if user is None:
            return None

        if not verify_password(password, user.password_hash):
            return None

        if not user.is_active:
            return None

        return user

    @staticmethod
    def create_user_token(user: User) -> str:
        """Create JWT token for user"""
        return create_access_token(user_id=user.id)

    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(User.email == email).first()


# Singleton instance
auth_service = AuthService()

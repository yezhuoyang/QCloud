"""
Dependency injection for FastAPI routes
"""
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from .security import decode_access_token

# HTTP Bearer token scheme
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials
    user_id = decode_access_token(token)

    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    return user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    if credentials is None:
        return None

    token = credentials.credentials
    user_id = decode_access_token(token)

    if user_id is None:
        return None

    user = db.query(User).filter(User.id == user_id).first()

    if user is None or not user.is_active:
        return None

    return user


def get_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current user and verify they are an admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

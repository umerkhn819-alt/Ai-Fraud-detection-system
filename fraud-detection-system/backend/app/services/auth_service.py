"""Auth helpers — register and authenticate."""
from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.models import User, UserRole


def _parse_role(role_str: str) -> UserRole:
    try:
        return UserRole(role_str.lower())
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Choose one of: {[r.value for r in UserRole]}",
        ) from e


def register_user(db: Session, *, full_name: str, email: str, password: str, role: str) -> User:
    existing = db.query(User).filter(User.email == email.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        full_name=full_name,
        email=email.lower(),
        hashed_password=hash_password(password),
        role=_parse_role(role),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, *, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

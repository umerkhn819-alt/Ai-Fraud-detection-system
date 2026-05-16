"""Auth helpers — register, authenticate, and seed admin."""
from __future__ import annotations

import logging

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.models import User, UserRole

logger = logging.getLogger(__name__)

# Primary seeded admin
ADMIN_EMAIL = "admin@fraudguard.ai"
ADMIN_PASSWORD = "Admin@123456"
ADMIN_NAME = "System Admin"

# Legacy account — always elevated to admin if it exists in DB
LEGACY_ADMIN_EMAIL = "qa.user.v2@test.com"


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

    parsed_role = _parse_role(role)
    # Public registration cannot create privileged roles.
    if parsed_role == UserRole.admin:
        parsed_role = UserRole.analyst

    user = User(
        full_name=full_name,
        email=email.lower(),
        hashed_password=hash_password(password),
        role=parsed_role,
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


def seed_admin(db: Session) -> User | None:
    """
    Ensure at least one admin exists:
    1. Elevate legacy account (qa.user.v2@test.com) to admin if it exists.
    2. If no admin exists at all, create admin@fraudguard.ai / Admin@123456.
    """
    # Step 1: Elevate legacy account if it exists and isn't already admin
    legacy = db.query(User).filter(User.email == LEGACY_ADMIN_EMAIL).first()
    if legacy and legacy.role != UserRole.admin:
        legacy.role = UserRole.admin
        legacy.is_active = True
        db.commit()
        db.refresh(legacy)
        logger.info("Elevated legacy account to admin: %s", LEGACY_ADMIN_EMAIL)

    # Step 2: Check if any admin exists now
    existing_admin = db.query(User).filter(User.role == UserRole.admin).first()
    if existing_admin:
        logger.info("Admin account exists (%s), skipping seed.", existing_admin.email)
        return None

    # Step 3: Create fresh admin
    admin = User(
        full_name=ADMIN_NAME,
        email=ADMIN_EMAIL,
        hashed_password=hash_password(ADMIN_PASSWORD),
        role=UserRole.admin,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    logger.info("Seeded admin account: %s", ADMIN_EMAIL)
    return admin

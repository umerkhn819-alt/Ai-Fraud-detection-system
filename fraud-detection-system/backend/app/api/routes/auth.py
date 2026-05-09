from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, get_current_user, verify_password, hash_password
from app.models.models import User
from app.schemas.schemas import (
    LoginRequest,
    PasswordUpdateRequest,
    TokenResponse,
    UserCreate,
    UserProfileUpdate,
    UserResponse,
)
from app.services import auth_service, audit_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    user = auth_service.register_user(
        db,
        full_name=user_data.full_name,
        email=str(user_data.email),
        password=user_data.password,
        role=user_data.role,
    )
    audit_service.log_action(
        db,
        user_id=user.id,
        action="register",
        resource="user",
        resource_id=user.id,
        details={"email": user.email, "role": user.role.value},
    )
    return user


MAX_AUTH_FAIL = 3


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(
        db,
        email=str(credentials.email),
        password=credentials.password,
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    audit_service.log_action(
        db,
        user_id=user.id,
        action="login",
        resource="user",
        resource_id=user.id,
        details={"email": user.email},
    )
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return TokenResponse(access_token=token, token_type="bearer", user=user)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_profile(
    body: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.full_name:
        current_user.full_name = body.full_name
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: PasswordUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(body.new_password)
    db.add(current_user)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

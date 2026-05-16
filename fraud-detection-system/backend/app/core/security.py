from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import bcrypt
from fastapi import Depends, HTTPException, status, Security, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, APIKeyHeader
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.models import User, UserRole, APIKey

bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt directly (passlib is broken on Python 3.14)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a password against its bcrypt hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict[str, Any]) -> str:
    payload = dict(data)
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    payload["exp"] = expire
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return current_user

def verify_api_key(
    api_key_header: str = Security(api_key_header),
    db: Session = Depends(get_db)
):
    """
    Validates the X-API-Key header.
    In a real SaaS, this hashes the incoming key and looks it up in Redis/PostgreSQL.
    For now, it checks the database directly.
    """
    if not api_key_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API Key"
        )
        
    # Example logic: in production, you would hash api_key_header and look up key_hash
    # For MVP, we'll assume the client passed a raw key and we mock a hash lookup
    import hashlib
    incoming_hash = hashlib.sha256(api_key_header.encode()).hexdigest()
    
    key_record = db.query(APIKey).filter(APIKey.key_hash == incoming_hash, APIKey.is_active == True).first()
    
    if not key_record:
        # Check if it's a test master key for local dev
        if api_key_header == "dev-master-key":
            return {"tenant_id": "default", "type": "test"}
            
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API Key"
        )
        
    # Update last_used
    key_record.last_used = datetime.now(timezone.utc)
    db.commit()
    
    return {"tenant_id": key_record.tenant_id, "key_id": key_record.id, "type": "api_client"}

async def get_current_client(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Unified dependency: Allows EITHER a Dashboard User (JWT) OR a B2B system (API Key).
    """
    api_key = request.headers.get("X-API-Key")
    if api_key:
        return verify_api_key(api_key_header=api_key, db=db)
    
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = decode_token(token)
            user_id = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == int(user_id)).first()
                if user and user.is_active:
                    # Provide same interface as verify_api_key
                    return {"tenant_id": user.tenant_id, "type": "dashboard_user", "user_id": user.id}
        except Exception:
            pass
            
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing or invalid authentication. Requires X-API-Key or Bearer token."
    )

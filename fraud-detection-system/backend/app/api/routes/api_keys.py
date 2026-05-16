from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import hashlib
import secrets
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, UserRole, APIKey

router = APIRouter(prefix="/api-keys", tags=["API Keys"])

class APIKeyCreate(BaseModel):
    name: str

class APIKeyResponse(BaseModel):
    id: int
    name: str
    is_active: bool
    created_at: datetime
    last_used: datetime | None

    class Config:
        orm_mode = True

class APIKeyGenerated(APIKeyResponse):
    key: str # Only returned once

def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user

@router.get("/", response_model=List[APIKeyResponse])
def list_api_keys(db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    keys = db.query(APIKey).filter(APIKey.tenant_id == current_user.tenant_id).all()
    return keys

@router.post("/", response_model=APIKeyGenerated)
def create_api_key(body: APIKeyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    raw_key = "fg_" + secrets.token_urlsafe(32)
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    
    new_key = APIKey(
        tenant_id=current_user.tenant_id,
        name=body.name,
        key_hash=key_hash
    )
    db.add(new_key)
    db.commit()
    db.refresh(new_key)
    
    # Return the raw key just once
    return {
        "id": new_key.id,
        "name": new_key.name,
        "is_active": new_key.is_active,
        "created_at": new_key.created_at,
        "last_used": new_key.last_used,
        "key": raw_key
    }

@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_api_key(key_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    db_key = db.query(APIKey).filter(APIKey.id == key_id, APIKey.tenant_id == current_user.tenant_id).first()
    if not db_key:
        raise HTTPException(status_code=404, detail="API Key not found")
    
    db_key.is_active = False
    db.commit()
    return None

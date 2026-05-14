from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_admin, get_current_user
from app.models.models import User
from app.services import rules_service

router = APIRouter(prefix="/rules", tags=["Rules"])


@router.get("/")
def list_rules(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return rules_service.list_rules(db)


@router.post("/")
def upsert_rule(payload: dict, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    return rules_service.upsert_rule(db, payload)

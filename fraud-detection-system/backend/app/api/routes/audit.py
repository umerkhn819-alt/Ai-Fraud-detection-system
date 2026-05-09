from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_admin, get_current_user
from app.models.models import User
from app.services import audit_service

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("/")
def list_audit_logs(
    limit: int = Query(200, ge=1, le=1000),
    action: str | None = None,
    user_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    rows = audit_service.list_logs(db, limit=limit, action=action, user_id=user_id)
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "action": r.action,
            "resource": r.resource,
            "resource_id": r.resource_id,
            "details": r.details,
            "ip_address": r.ip_address,
            "timestamp": r.timestamp,
        }
        for r in rows
    ]

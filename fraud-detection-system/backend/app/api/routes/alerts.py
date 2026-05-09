from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_admin, get_current_user
from app.models.models import User
from app.services import alert_service

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/rules")
def list_rules(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return alert_service.list_rules(db)


@router.post("/rules")
def upsert_rule(payload: dict, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    return alert_service.upsert_rule(db, payload)


@router.get("/")
def list_events(
    limit: int = Query(200, ge=1, le=1000),
    acknowledged: bool | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return alert_service.list_events(db, limit=limit, acknowledged=acknowledged)


@router.post("/{event_id}/ack")
def acknowledge_event(event_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    row = alert_service.acknowledge_event(db, event_id)
    if not row:
        raise HTTPException(status_code=404, detail="Alert event not found")
    return row

from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User
from app.services import case_service, audit_service

router = APIRouter(prefix="/cases", tags=["Cases"])


@router.get("/")
def list_cases(
    status: str | None = Query(None, description="new|in_review|resolved"),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = case_service.list_cases(db, status_filter=status, limit=limit)
    now_aware = datetime.now(timezone.utc)
    return [
        {
            "id": c.id,
            "transaction_id": c.transaction_id,
            "transaction_ref": c.transaction.transaction_ref if c.transaction else None,
            "amount": c.transaction.amount if c.transaction else None,
            "reviewed_by": c.reviewed_by,
            "reviewer_name": c.reviewed_by_user.full_name if c.reviewed_by_user else None,
            "is_confirmed": c.is_confirmed,
            "resolution": c.resolution,
            "analyst_notes": c.analyst_notes,
            "created_at": c.created_at,
            "resolved_at": c.resolved_at,
            "sla_age_hours": (
                round(
                    (
                        (now_aware if c.created_at.tzinfo else datetime.utcnow()) - c.created_at
                    ).total_seconds()
                    / 3600,
                    2,
                )
                if c.created_at
                else 0
            ),
        }
        for c in rows
    ]


@router.post("/{case_id}/assign")
def assign_case(
    case_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analyst_id = int(payload.get("analyst_id", 0))
    case = case_service.assign_case(db, case_id=case_id, analyst_id=analyst_id)
    audit_service.log_action(
        db,
        user_id=current_user.id,
        action="assign_case",
        resource="fraud_case",
        resource_id=case.id,
        details={"analyst_id": analyst_id},
    )
    return {"id": case.id, "reviewed_by": case.reviewed_by}


@router.post("/{case_id}/resolve")
def resolve_case(
    case_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if "is_confirmed" not in payload or "resolution" not in payload:
        raise HTTPException(status_code=400, detail="is_confirmed and resolution are required")
    case = case_service.resolve_case(
        db,
        case_id=case_id,
        is_confirmed=bool(payload["is_confirmed"]),
        resolution=str(payload["resolution"]),
        analyst_notes=payload.get("analyst_notes"),
        reviewer_user_id=current_user.id,
    )
    audit_service.log_action(
        db,
        user_id=current_user.id,
        action="resolve_case",
        resource="fraud_case",
        resource_id=case.id,
        details={"is_confirmed": case.is_confirmed, "resolution": case.resolution},
    )
    return {
        "id": case.id,
        "is_confirmed": case.is_confirmed,
        "resolution": case.resolution,
        "resolved_at": case.resolved_at,
    }

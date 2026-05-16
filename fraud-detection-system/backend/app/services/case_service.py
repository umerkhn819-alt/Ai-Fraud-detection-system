from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.models import FraudCase, FraudPrediction, User


def _derived_status(case: FraudCase) -> str:
    if case.is_confirmed is None:
        return "in_review" if case.reviewed_by else "new"
    return "resolved"


def list_cases(db: Session, *, status_filter: str | None = None, limit: int = 200):
    rows = (
        db.query(FraudCase)
        .options(joinedload(FraudCase.transaction), joinedload(FraudCase.reviewed_by_user))
        .order_by(FraudCase.created_at.desc())
        .limit(limit)
        .all()
    )
    if not status_filter:
        return rows
    return [c for c in rows if _derived_status(c) == status_filter]


def assign_case(db: Session, *, case_id: int, analyst_id: int) -> FraudCase:
    case = db.query(FraudCase).filter(FraudCase.id == case_id).first()
    analyst = db.query(User).filter(User.id == analyst_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    if not analyst:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analyst user not found")
    case.reviewed_by = analyst_id
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


def resolve_case(
    db: Session,
    *,
    case_id: int,
    is_confirmed: bool,
    resolution: str,
    analyst_notes: str | None,
    reviewer_user_id: int,
) -> FraudCase:
    case = db.query(FraudCase).filter(FraudCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    case.reviewed_by = reviewer_user_id
    case.is_confirmed = is_confirmed
    case.resolution = resolution
    case.analyst_notes = analyst_notes
    case.resolved_at = datetime.now(timezone.utc)

    pred = db.query(FraudPrediction).filter(FraudPrediction.transaction_id == case.transaction_id).first()
    if pred:
        pred.is_fraud = bool(is_confirmed)
        db.add(pred)

    db.add(case)
    db.commit()
    db.refresh(case)
    return case

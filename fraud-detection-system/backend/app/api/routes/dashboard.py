from typing import Any, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User
from app.schemas.schemas import DashboardStats, FraudOverTimePoint, SeverityCount
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return dashboard_service.get_dashboard_stats(db)


@router.get("/fraud-over-time", response_model=List[FraudOverTimePoint])
def fraud_over_time(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows: list[dict[str, Any]] = dashboard_service.fraud_over_time(db)
    return [FraudOverTimePoint(**r) for r in rows]


@router.get("/severity-distribution", response_model=List[SeverityCount])
def severity_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = dashboard_service.severity_distribution(db)
    return [SeverityCount(**r) for r in rows]


@router.get("/top-merchants")
def top_merchants(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return dashboard_service.top_fraud_merchants(db, limit=limit)

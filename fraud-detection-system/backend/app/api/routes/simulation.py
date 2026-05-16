from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.models import User
from app.services import reporting_service

router = APIRouter(prefix="/simulation", tags=["Simulation"])


@router.get("/threshold-impact")
def threshold_impact(
    threshold: float = Query(0.5, ge=0.0, le=1.0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return reporting_service.simulate_threshold(db, threshold=threshold)

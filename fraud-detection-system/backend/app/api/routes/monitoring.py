from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User
from app.services import model_ops_service

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


@router.get("/live")
def live_snapshot(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return model_ops_service.monitoring_snapshot(db)


@router.get("/distribution")
def score_distribution(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return model_ops_service.distribution(db)

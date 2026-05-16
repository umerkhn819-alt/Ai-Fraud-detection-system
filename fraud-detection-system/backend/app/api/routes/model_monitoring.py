from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_admin, get_current_user
from app.models.models import User
from app.services import model_ops_service

router = APIRouter(prefix="/model-monitoring", tags=["Model Monitoring"])


@router.get("/metrics")
def metrics(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return model_ops_service.live_metrics(db)


@router.get("/snapshot")
def snapshot(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return model_ops_service.monitoring_snapshot(db)


@router.get("/distribution")
def distribution(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return model_ops_service.distribution(db)


@router.get("/versions")
def versions(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    return model_ops_service.list_versions(db)


@router.post("/versions")
def add_version(payload: dict, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    return model_ops_service.register_version(db, payload)


@router.post("/feedback")
def add_feedback(payload: dict, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return model_ops_service.add_feedback(db, payload)


@router.get("/feedback-summary")
def feedback_summary(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    return model_ops_service.feedback_summary(db)

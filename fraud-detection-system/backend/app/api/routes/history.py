from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import FraudPrediction, User
from app.schemas.schemas import PaginatedPredictions, PredictionResponse

router = APIRouter(prefix="/history", tags=["History"])


@router.get("/", response_model=PaginatedPredictions)
def list_predictions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_fraud: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(FraudPrediction).options(joinedload(FraudPrediction.transaction))
    if is_fraud is not None:
        q = q.filter(FraudPrediction.is_fraud == is_fraud)
    total = q.count()
    offset = (page - 1) * page_size
    rows = q.order_by(FraudPrediction.predicted_at.desc()).offset(offset).limit(page_size).all()
    return PaginatedPredictions(
        items=[PredictionResponse.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{prediction_id}", response_model=PredictionResponse)
def get_prediction(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.query(FraudPrediction).filter(FraudPrediction.id == prediction_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found")
    return row

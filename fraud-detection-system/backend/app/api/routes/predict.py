from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import FraudPrediction, User
from app.schemas.schemas import PredictRequest, PredictionResponse
from app.services.explanation_service import generate_explanation
from app.services import prediction_service
from app.services import transaction_service

router = APIRouter(prefix="/predict", tags=["Prediction"])


@router.post("/", response_model=PredictionResponse)
async def predict_fraud(
    request: PredictRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = transaction_service.get_transaction(db, request.transaction_id)
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    try:
        prediction = prediction_service.run_prediction(db, transaction=transaction)
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        ) from e
    return prediction


@router.post("/explain/{prediction_id}")
async def explain_prediction(
    prediction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prediction = (
        db.query(FraudPrediction)
        .options(joinedload(FraudPrediction.transaction))
        .filter(FraudPrediction.id == prediction_id)
        .first()
    )
    if not prediction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found")

    explanation = await generate_explanation(prediction)
    return {"explanation": explanation, "prediction_id": prediction_id}

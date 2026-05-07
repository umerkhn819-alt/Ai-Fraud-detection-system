from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import FraudPrediction, User
from app.schemas.schemas import ExplainRequest, ExplainResponse
from app.services.explanation_service import generate_explanation

router = APIRouter(prefix="/explain", tags=["Explainability"])


@router.post("/", response_model=ExplainResponse)
async def explain(
    body: ExplainRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prediction = (
        db.query(FraudPrediction)
        .options(joinedload(FraudPrediction.transaction))
        .filter(FraudPrediction.id == body.prediction_id)
        .first()
    )
    if not prediction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found")

    text = await generate_explanation(prediction)
    return ExplainResponse(prediction_id=body.prediction_id, explanation=text)

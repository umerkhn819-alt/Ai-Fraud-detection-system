"""Run fraud scoring and persist FraudPrediction / FraudCase."""
from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.ml.predictor import get_predictor
from app.models.models import FraudCase, FraudPrediction, FraudSeverity, Transaction, TransactionStatus


def run_prediction(db: Session, *, transaction: Transaction) -> FraudPrediction:
    existing = db.query(FraudPrediction).filter(FraudPrediction.transaction_id == transaction.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A prediction already exists for this transaction",
        )

    predictor = get_predictor()
    result = predictor.predict(transaction)

    sev_raw = result.get("severity") or "low"
    try:
        severity = FraudSeverity(sev_raw)
    except ValueError:
        severity = FraudSeverity.low

    prediction = FraudPrediction(
        transaction_id=transaction.id,
        fraud_probability=result["probability"],
        is_fraud=result["is_fraud"],
        model_version=result.get("model_version", "v1.0"),
        confidence_score=result.get("confidence"),
        severity=severity,
        features_used=str(result.get("top_features", "")),
    )
    db.add(prediction)

    if result["is_fraud"]:
        case = FraudCase(transaction_id=transaction.id)
        db.add(case)
        transaction.status = TransactionStatus.flagged
    else:
        transaction.status = TransactionStatus.approved

    db.commit()
    db.refresh(prediction)
    return prediction

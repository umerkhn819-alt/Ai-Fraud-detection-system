"""Run fraud scoring and persist FraudPrediction / FraudCase."""
from __future__ import annotations

import json
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.ml.predictor import get_predictor
from app.models.models import FraudCase, FraudPrediction, FraudSeverity, Transaction, TransactionStatus
from app.services import alert_service, rules_service


def run_prediction(db: Session, *, transaction: Transaction) -> FraudPrediction:
    existing = db.query(FraudPrediction).filter(FraudPrediction.transaction_id == transaction.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A prediction already exists for this transaction",
        )

    predictor = get_predictor()
    result = predictor.predict(transaction)
    rule_raw, rule_hits = rules_service.apply_rules(db, transaction)
    cap = float(settings.RULE_DELTA_MAX)
    rule_delta = max(-cap, min(cap, float(rule_raw)))
    model_thr = float(result.get("fraud_threshold", settings.FRAUD_THRESHOLD))
    combined = max(0.0, min(1.0, float(result["probability"]) + rule_delta))
    is_fraud = combined >= model_thr

    if combined >= 0.9:
        severity = FraudSeverity.critical
    elif combined >= 0.7:
        severity = FraudSeverity.high
    elif is_fraud:
        severity = FraudSeverity.medium
    else:
        severity = FraudSeverity.low

    features_payload: dict[str, Any] = {
        "model_top_features": result.get("top_features", []),
        "rules_triggered": rule_hits,
        "rules_delta_raw": float(rule_raw),
        "rules_delta_applied": float(rule_delta),
        "rules_delta_cap": cap,
        "rules_capped": rule_raw != rule_delta,
        "model_probability": float(result["probability"]),
        "combined_probability": float(combined),
        "fraud_threshold": model_thr,
    }
    prediction = FraudPrediction(
        transaction_id=transaction.id,
        fraud_probability=combined,
        is_fraud=is_fraud,
        model_version=result.get("model_version", "v1.0"),
        confidence_score=result.get("confidence"),
        severity=severity,
        features_used=json.dumps(features_payload),
    )
    db.add(prediction)

    if is_fraud:
        case = FraudCase(transaction_id=transaction.id)
        db.add(case)
        transaction.status = TransactionStatus.flagged
    else:
        transaction.status = TransactionStatus.approved

    db.commit()
    db.refresh(prediction)
    if is_fraud:
        alert_service.evaluate_prediction_alerts(db, prediction=prediction, transaction=transaction)
    return prediction

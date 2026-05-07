"""Fraud scoring using saved sklearn model + scaler."""
from __future__ import annotations

from typing import Any

import numpy as np

from app.core.config import settings
from app.ml.model_loader import get_model_and_scaler
from app.ml.preprocessor import scale_time_amount, transaction_to_matrix
from app.models.models import Transaction

FEATURE_NAMES = ["Time", "Amount"] + [f"v{i}" for i in range(1, 29)]

_predictor_instance: "FraudPredictor | None" = None


class FraudPredictor:
    def __init__(self) -> None:
        self.model, self.scaler = get_model_and_scaler()

    def predict(self, transaction: Transaction) -> dict[str, Any]:
        raw = transaction_to_matrix(transaction)
        features = scale_time_amount(raw, self.scaler)

        if not hasattr(self.model, "predict_proba"):
            prob_pos = float(self.model.predict(features)[0])
        else:
            proba = self.model.predict_proba(features)[0]
            prob_pos = float(proba[1]) if len(proba) > 1 else float(proba[0])

        is_fraud = prob_pos >= settings.FRAUD_THRESHOLD

        if prob_pos >= 0.9:
            severity = "critical"
        elif prob_pos >= 0.7:
            severity = "high"
        elif prob_pos >= 0.5:
            severity = "medium"
        else:
            severity = "low"

        top_features = self._top_features(features)

        return {
            "probability": prob_pos,
            "is_fraud": is_fraud,
            "confidence": round(abs(prob_pos - 0.5) * 2, 4),
            "severity": severity,
            "top_features": top_features,
            "model_version": "v1.0-sklearn",
        }

    def _top_features(self, features: np.ndarray) -> dict[str, float]:
        model = self.model
        if hasattr(model, "feature_importances_"):
            imp = np.asarray(model.feature_importances_, dtype=float)
            idx = np.argsort(imp)[::-1][:5]
            return {FEATURE_NAMES[i]: round(float(imp[i]), 4) for i in idx}
        if hasattr(model, "coef_"):
            coef = np.asarray(model.coef_).ravel()
            if coef.size >= len(FEATURE_NAMES):
                coef = coef[: len(FEATURE_NAMES)]
            idx = np.argsort(np.abs(coef))[::-1][:5]
            return {FEATURE_NAMES[i]: round(float(coef[i]), 4) for i in idx if i < len(FEATURE_NAMES)}
        return {"model": 1.0}


def get_predictor() -> FraudPredictor:
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = FraudPredictor()
    return _predictor_instance

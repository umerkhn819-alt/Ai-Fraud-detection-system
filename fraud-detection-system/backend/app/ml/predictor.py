"""Fraud scoring using saved sklearn model + scaler."""
from __future__ import annotations

import logging
from typing import Any

import numpy as np

from app.core.config import settings
from app.ml.model_loader import get_model_and_scaler, get_training_metadata
from app.ml.preprocessor import FEATURE_ORDER_DISPLAY, FEATURE_ORDER_HASH, scale_time_amount, transaction_to_matrix
from app.models.models import Transaction

logger = logging.getLogger(__name__)

FEATURE_NAMES = list(FEATURE_ORDER_DISPLAY)

_predictor_instance: "FraudPredictor | None" = None


class FraudPredictor:
    def __init__(self) -> None:
        self.model, self.scaler = get_model_and_scaler()
        meta = get_training_metadata()
        self.threshold = float(meta.get("threshold", settings.FRAUD_THRESHOLD))
        expected_hash = meta.get("feature_order_hash")
        if expected_hash and expected_hash != FEATURE_ORDER_HASH:
            msg = (
                f"feature_order_hash mismatch: training artifact {expected_hash!r} "
                f"!= serving {FEATURE_ORDER_HASH!r}"
            )
            logger.error(msg)
            raise ValueError(msg)
        if meta:
            logger.info(
                "Loaded fraud threshold %.4f from model_training_metadata (winner=%s)",
                self.threshold,
                meta.get("winner_model", "?"),
            )

    def predict(self, transaction: Transaction) -> dict[str, Any]:
        raw = transaction_to_matrix(transaction)
        features = scale_time_amount(raw, self.scaler)

        if not hasattr(self.model, "predict_proba"):
            prob_pos = float(self.model.predict(features)[0])
        else:
            proba = self.model.predict_proba(features)[0]
            prob_pos = float(proba[1]) if len(proba) > 1 else float(proba[0])

        is_fraud = prob_pos >= self.threshold

        if prob_pos >= 0.9:
            severity = "critical"
        elif prob_pos >= 0.7:
            severity = "high"
        elif prob_pos >= self.threshold:
            severity = "medium"
        else:
            severity = "low"

        top_features = self._top_features(features)

        return {
            "probability": prob_pos,
            "is_fraud": is_fraud,
            "confidence": round(abs(prob_pos - self.threshold) * 2, 4),
            "severity": severity,
            "top_features": top_features,
            "model_version": "v2.0-sklearn-calibrated",
            "fraud_threshold": self.threshold,
        }

    def _top_features(self, features: np.ndarray) -> dict[str, float]:
        model = self.model
        # Direct feature_importances_ (XGBIsotonicModel, XGBClassifier, RandomForest, etc.)
        if hasattr(model, "feature_importances_"):
            imp = np.asarray(model.feature_importances_, dtype=float)
            if imp.size >= len(FEATURE_NAMES):
                imp = imp[:len(FEATURE_NAMES)]
            idx = np.argsort(imp)[::-1][:5]
            return {FEATURE_NAMES[i]: round(float(imp[i]), 4) for i in idx if i < len(FEATURE_NAMES)}
        # Calibrated sklearn wrapper
        cals = getattr(model, "calibrated_classifiers_", None)
        if cals:
            base = getattr(cals[0], "estimator", None)
            if base is not None and hasattr(base, "feature_importances_"):
                imp = np.asarray(base.feature_importances_, dtype=float)
                idx = np.argsort(imp)[::-1][:5]
                return {FEATURE_NAMES[i]: round(float(imp[i]), 4) for i in idx if i < len(FEATURE_NAMES)}
        # Logistic regression
        if hasattr(model, "coef_"):
            coef = np.asarray(model.coef_).ravel()[:len(FEATURE_NAMES)]
            idx = np.argsort(np.abs(coef))[::-1][:5]
            return {FEATURE_NAMES[i]: round(float(coef[i]), 4) for i in idx if i < len(FEATURE_NAMES)}
        return {"model": 1.0}


def get_predictor() -> FraudPredictor:
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = FraudPredictor()
    return _predictor_instance

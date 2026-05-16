"""
Lazy-load XGBoost model + isotonic calibration, scaler, and training metadata.

Supports two formats:
  1. New bundle: fraud_model.joblib is a dict with keys
       {"type": "xgb_isotonic", "booster_path": ..., "isotonic_path": ...}
     The booster and isotonic files live in the SAME directory as fraud_model.joblib.
  2. Legacy format: fraud_model.joblib is a sklearn-compatible object with predict_proba().

MODEL_PATH / SCALER_PATH may be:
  - Absolute: /app/ml/models/saved/fraud_model.joblib   (Docker)
  - Relative to backend root: ../ml/models/saved/fraud_model.joblib  (local dev)
"""
from __future__ import annotations

import json
import os
from typing import Any, Dict, Tuple

import joblib
import numpy as np

from app.core.config import settings

_model: Any | None = None
_scaler: Any | None = None
_training_metadata: Dict[str, Any] | None = None


def _resolve_path(configured: str) -> str:
    """Return an absolute path whether configured value is absolute or relative."""
    if os.path.isabs(configured):
        return configured
    # Relative: resolve from backend root (two levels up from this file)
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    return os.path.normpath(os.path.join(backend_root, configured))


def get_training_metadata() -> Dict[str, Any]:
    global _training_metadata
    if _training_metadata is None:
        path = _resolve_path(settings.MODEL_TRAINING_METADATA_PATH)
        if os.path.isfile(path):
            with open(path, encoding="utf-8") as f:
                _training_metadata = json.load(f)
        else:
            _training_metadata = {}
    return _training_metadata


class _XGBIsotonicModel:
    """
    Runtime wrapper: loads XGBoost Booster + IsotonicRegression from disk.
    Never pickled — constructed fresh at runtime so no class-pickling issues.
    """

    def __init__(self, booster_path: str, iso_path: str, feature_importances: list):
        import xgboost as xgb
        booster = xgb.Booster()
        booster.load_model(booster_path)
        self._booster = booster
        self._iso = joblib.load(iso_path)
        self.feature_importances_ = np.array(feature_importances, dtype=float)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        import xgboost as xgb
        dmat = xgb.DMatrix(X)
        raw = self._booster.predict(dmat)
        cal = self._iso.transform(raw).clip(0.0, 1.0)
        return np.column_stack([1.0 - cal, cal])

    def predict(self, X: np.ndarray) -> np.ndarray:
        return (self.predict_proba(X)[:, 1] >= 0.5).astype(int)


def get_model_and_scaler() -> Tuple[Any, Any]:
    global _model, _scaler
    if _model is None or _scaler is None:
        model_path = _resolve_path(settings.MODEL_PATH)
        scaler_path = _resolve_path(settings.SCALER_PATH)

        if not os.path.isfile(model_path):
            raise FileNotFoundError(
                f"Model not found at {model_path}. "
                "Run: cd ml/src && python train_on_real_data.py"
            )
        if not os.path.isfile(scaler_path):
            raise FileNotFoundError(
                f"Scaler not found at {scaler_path}. "
                "Run: cd ml/src && python train_on_real_data.py"
            )

        raw = joblib.load(model_path)
        models_dir = os.path.dirname(model_path)

        if isinstance(raw, dict) and raw.get("type") == "xgb_isotonic":
            # New bundle format — load booster + isotonic from same directory
            booster_path = os.path.join(models_dir, raw["booster_path"])
            iso_path = os.path.join(models_dir, raw["isotonic_path"])
            feat_imp = raw.get("feature_importances", [])

            if not os.path.isfile(booster_path):
                raise FileNotFoundError(f"XGBoost booster not found at {booster_path}")
            if not os.path.isfile(iso_path):
                raise FileNotFoundError(f"Isotonic calibrator not found at {iso_path}")

            _model = _XGBIsotonicModel(booster_path, iso_path, feat_imp)
        else:
            # Legacy sklearn-compatible object
            _model = raw

        _scaler = joblib.load(scaler_path)
    return _model, _scaler


def reload_model() -> None:
    """Force reload model on next access (call after retraining)."""
    global _model, _scaler, _training_metadata
    _model = None
    _scaler = None
    _training_metadata = None


# Keep old name for test compatibility
reset_cache_for_tests = reload_model

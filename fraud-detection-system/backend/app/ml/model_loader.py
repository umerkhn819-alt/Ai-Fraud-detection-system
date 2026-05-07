"""Lazy-load sklearn model and scaler from disk."""
from __future__ import annotations

import os
from typing import Any, Tuple

import joblib

from app.core.config import settings

_model: Any | None = None
_scaler: Any | None = None


def _artifact_path(relative: str) -> str:
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    return os.path.normpath(os.path.join(backend_root, relative))


def get_model_and_scaler() -> Tuple[Any, Any]:
    global _model, _scaler
    if _model is None or _scaler is None:
        model_path = _artifact_path(settings.MODEL_PATH)
        scaler_path = _artifact_path(settings.SCALER_PATH)
        if not os.path.isfile(model_path):
            raise FileNotFoundError(f"Model not found at {model_path}. Train and save fraud_model.joblib first.")
        if not os.path.isfile(scaler_path):
            raise FileNotFoundError(f"Scaler not found at {scaler_path}. Train and save scaler.joblib first.")
        _model = joblib.load(model_path)
        _scaler = joblib.load(scaler_path)
    return _model, _scaler


def reset_cache_for_tests() -> None:
    global _model, _scaler
    _model = None
    _scaler = None

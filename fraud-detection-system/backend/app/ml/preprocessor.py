"""Build feature vectors matching training pipeline (Time, Amount, V1–V28)."""
from __future__ import annotations

import numpy as np

from app.models.models import Transaction


def transaction_to_matrix(transaction: Transaction) -> np.ndarray:
    row = [
        float(transaction.time_seconds or 0.0),
        float(transaction.amount),
        *[float(getattr(transaction, f"v{i}", 0.0) or 0.0) for i in range(1, 29)],
    ]
    return np.array([row], dtype=np.float64)


def scale_time_amount(features: np.ndarray, scaler) -> np.ndarray:
    out = features.copy()
    out[:, :2] = scaler.transform(out[:, :2])
    return out

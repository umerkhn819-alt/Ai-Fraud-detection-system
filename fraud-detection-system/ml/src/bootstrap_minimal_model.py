"""Create minimal sklearn model + scaler for local dev when creditcard.csv is not yet used."""
from __future__ import annotations

import os

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models", "saved"))
os.makedirs(ROOT, exist_ok=True)

rng = np.random.default_rng(42)
n, d = 2000, 30
X = rng.standard_normal((n, d))
y = (X[:, 0] + X[:, 1] * 0.5 + rng.standard_normal(n) * 0.5 > 0.8).astype(int)

scaler = StandardScaler()
X_scaled = X.copy()
X_scaled[:, :2] = scaler.fit_transform(X[:, :2])

clf = LogisticRegression(max_iter=500, random_state=42)
clf.fit(X_scaled, y)

joblib.dump(clf, os.path.join(ROOT, "fraud_model.joblib"))
joblib.dump(scaler, os.path.join(ROOT, "scaler.joblib"))
print("Wrote fraud_model.joblib and scaler.joblib to", ROOT)

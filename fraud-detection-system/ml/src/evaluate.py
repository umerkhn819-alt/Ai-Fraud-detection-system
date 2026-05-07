"""CLI: evaluate saved sklearn model on X_test."""
from __future__ import annotations

import argparse
import os

import joblib
import numpy as np
from sklearn.metrics import classification_report, roc_auc_score


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--data-dir", default="../data/processed")
    p.add_argument("--model", default="../models/saved/fraud_model.joblib")
    args = p.parse_args()

    X_test = np.load(os.path.join(args.data_dir, "X_test.npy"))
    y_test = np.load(os.path.join(args.data_dir, "y_test.npy"))
    model = joblib.load(args.model)
    proba = model.predict_proba(X_test)[:, 1]
    pred = (proba >= 0.5).astype(int)
    print(classification_report(y_test, pred))
    print("ROC-AUC:", roc_auc_score(y_test, proba))


if __name__ == "__main__":
    main()

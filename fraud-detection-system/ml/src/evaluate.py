"""Evaluate saved model on held-out test arrays; optionally write metrics JSON (mirrors training artifact)."""
from __future__ import annotations

import argparse
import json
import os

import joblib
import numpy as np
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    roc_auc_score,
    roc_curve,
)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--data-dir", default="../data/processed")
    p.add_argument("--models-dir", default="../models/saved")
    p.add_argument("--model", default=None, help="Override model path")
    p.add_argument("--write-json", action="store_true", help="Write evaluate_output.json to models-dir")
    args = p.parse_args()

    model_path = args.model or os.path.join(args.models_dir, "fraud_model.joblib")
    meta_path = os.path.join(args.models_dir, "model_training_metadata.json")

    X_test = np.load(os.path.join(args.data_dir, "X_test.npy"))
    y_test = np.load(os.path.join(args.data_dir, "y_test.npy"))
    model = joblib.load(model_path)

    proba = model.predict_proba(X_test)[:, 1]
    threshold = 0.5
    if os.path.isfile(meta_path):
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)
            threshold = float(meta.get("threshold", 0.5))

    pred = (proba >= threshold).astype(int)
    print(classification_report(y_test, pred, digits=4))
    print("ROC-AUC:", round(float(roc_auc_score(y_test, proba)), 4))
    print("PR-AUC:", round(float(average_precision_score(y_test, proba)), 4))
    print("F1 @ threshold", threshold, ":", round(float(f1_score(y_test, pred, zero_division=0)), 4))
    cm = confusion_matrix(y_test, pred, labels=[0, 1])
    print("Confusion [tn fp; fn tp]:\n", cm)

    if args.write_json:
        fpr, tpr, _ = roc_curve(y_test, proba)
        prec, rec, _ = precision_recall_curve(y_test, proba)
        out = {
            "threshold_used": threshold,
            "roc_auc": float(roc_auc_score(y_test, proba)),
            "pr_auc": float(average_precision_score(y_test, proba)),
            "f1": float(f1_score(y_test, pred, zero_division=0)),
            "confusion_matrix": {
                "tn": int(cm[0, 0]),
                "fp": int(cm[0, 1]),
                "fn": int(cm[1, 0]),
                "tp": int(cm[1, 1]),
            },
            "curves": {
                "roc": {"fpr": fpr.tolist(), "tpr": tpr.tolist()},
                "pr": {"precision": prec.tolist(), "recall": rec.tolist()},
            },
        }
        outp = os.path.join(args.models_dir, "evaluate_output.json")
        with open(outp, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2)
        print("Wrote", outp)


if __name__ == "__main__":
    main()

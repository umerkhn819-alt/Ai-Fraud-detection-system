"""
Train XGBoost on real Kaggle creditcard.csv dataset.
Saves XGBoost model as native JSON + isotonic calibration as numpy arrays.
These are loaded by the backend's model_loader.py without class dependency.

Usage:
    cd ml/src
    python train_on_real_data.py

Reads from:  ../data/raw/creditcard.csv
Saves to:    ../models/saved/
"""
from __future__ import annotations

import hashlib
import json
import os

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    roc_auc_score,
    roc_curve,
    precision_recall_curve,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(SCRIPT_DIR, "..", "data", "raw", "creditcard.csv")
MODELS_DIR = os.path.join(SCRIPT_DIR, "..", "models", "saved")

# Feature order MUST match backend/app/ml/preprocessor.py
FEATURE_ORDER = ["Time", "Amount"] + [f"V{i}" for i in range(1, 29)]
FEATURE_ORDER_HASH = hashlib.sha256(",".join(FEATURE_ORDER).encode()).hexdigest()


def load_data():
    print(f"[1/6] Loading {DATA_PATH} ...")
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"creditcard.csv not found at {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"      Shape: {df.shape}  |  Fraud: {df['Class'].sum()} ({df['Class'].mean()*100:.4f}%)")
    return df


def scale_features(X_train, X_val, X_test):
    scaler = StandardScaler()
    scaler.fit(X_train[:, :2])
    Xtr = X_train.copy(); Xv = X_val.copy(); Xte = X_test.copy()
    Xtr[:, :2] = scaler.transform(Xtr[:, :2])
    Xv[:, :2] = scaler.transform(Xv[:, :2])
    Xte[:, :2] = scaler.transform(Xte[:, :2])
    return Xtr, Xv, Xte, scaler


def best_threshold_f1(y_true, proba):
    best_t, best_f1 = 0.5, -1.0
    for t in np.linspace(0.01, 0.99, 200):
        pred = (proba >= t).astype(int)
        fs = f1_score(y_true, pred, zero_division=0)
        if fs > best_f1:
            best_f1 = float(fs)
            best_t = float(t)
    return best_t, best_f1


def conf_dict(cm):
    tn, fp, fn, tp = cm.ravel().tolist()
    return {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)}


def sample_curve(arr, n=30):
    arr = np.asarray(arr)
    if len(arr) <= n:
        return [round(float(x), 4) for x in arr]
    idx = np.round(np.linspace(0, len(arr) - 1, n)).astype(int)
    return [round(float(arr[i]), 4) for i in idx]


def main():
    os.makedirs(MODELS_DIR, exist_ok=True)

    # 1. Load
    df = pd.read_csv(DATA_PATH)
    print(f"[1/6] Loaded {len(df)} rows | Fraud: {df['Class'].sum()} ({df['Class'].mean()*100:.4f}%)")
    X = df[FEATURE_ORDER].values.astype(np.float64)
    y = df["Class"].values.astype(np.int32)

    # 2. Split
    print("[2/6] Splitting ...")
    X_tv, X_test, y_tv, y_test = train_test_split(X, y, test_size=0.15, stratify=y, random_state=42)
    X_train, X_val, y_train, y_val = train_test_split(X_tv, y_tv, test_size=0.15/0.85, stratify=y_tv, random_state=42)
    print(f"      Train={len(y_train)} fraud={y_train.sum()} | Val={len(y_val)} fraud={y_val.sum()} | Test={len(y_test)} fraud={y_test.sum()}")

    # 3. Scale
    print("[3/6] Scaling ...")
    X_train_s, X_val_s, X_test_s, scaler = scale_features(X_train, X_val, X_test)

    # 4. Train XGBoost
    n0, n1 = float((y_train == 0).sum()), float((y_train == 1).sum())
    spw = n0 / max(n1, 1.0)
    print(f"[4/6] Training XGBoost scale_pos_weight={spw:.1f} ...")
    clf = xgb.XGBClassifier(
        n_estimators=400, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        scale_pos_weight=spw, random_state=42, eval_metric="aucpr",
    )
    clf.fit(X_train_s, y_train, eval_set=[(X_val_s, y_val)], verbose=50)

    # 5. Calibrate (isotonic regression)
    print("[5/6] Calibrating ...")
    raw_val = clf.predict_proba(X_val_s)[:, 1]
    raw_test = clf.predict_proba(X_test_s)[:, 1]

    iso = IsotonicRegression(out_of_bounds="clip")
    iso.fit(raw_val, y_val)

    proba_val = iso.transform(raw_val).clip(0, 1)
    proba_test = iso.transform(raw_test).clip(0, 1)

    threshold, val_f1 = best_threshold_f1(y_val, proba_val)
    print(f"      Threshold={threshold:.4f}  F1={val_f1:.4f}")

    roc_val = roc_auc_score(y_val, proba_val)
    pr_val = average_precision_score(y_val, proba_val)
    roc_test = roc_auc_score(y_test, proba_test)
    pr_test = average_precision_score(y_test, proba_test)
    f1_test = f1_score(y_test, (proba_test >= threshold).astype(int), zero_division=0)
    cm_val = confusion_matrix(y_val, (proba_val >= threshold).astype(int), labels=[0, 1])
    cm_test = confusion_matrix(y_test, (proba_test >= threshold).astype(int), labels=[0, 1])

    print(f"      Val  ROC={roc_val:.4f} PR={pr_val:.4f}")
    print(f"      Test ROC={roc_test:.4f} PR={pr_test:.4f} F1={f1_test:.4f}")
    print(f"      Test {conf_dict(cm_test)}")

    # 6. Save
    print("[6/6] Saving ...")

    # Save XGBoost booster natively (no Python class dependency)
    booster_path = os.path.join(MODELS_DIR, "xgb_booster.json")
    clf.get_booster().save_model(booster_path)

    # Save isotonic calibration arrays
    iso_path = os.path.join(MODELS_DIR, "isotonic_calibrator.joblib")
    joblib.dump(iso, iso_path)

    # Save scaler
    scaler_path = os.path.join(MODELS_DIR, "scaler.joblib")
    joblib.dump(scaler, scaler_path)

    # Save a lightweight combined model as joblib (using sklearn Pipeline workaround)
    # Store as a dict so it's always picklable
    model_bundle = {
        "type": "xgb_isotonic",
        "booster_path": "xgb_booster.json",
        "isotonic_path": "isotonic_calibrator.joblib",
        "feature_importances": clf.feature_importances_.tolist(),
        "n_features": len(FEATURE_ORDER),
    }
    bundle_path = os.path.join(MODELS_DIR, "fraud_model.joblib")
    joblib.dump(model_bundle, bundle_path)

    # Curves
    fpr_v, tpr_v, _ = roc_curve(y_val, proba_val)
    p_v, r_v, _ = precision_recall_curve(y_val, proba_val)
    fpr_t, tpr_t, _ = roc_curve(y_test, proba_test)
    p_t, r_t, _ = precision_recall_curve(y_test, proba_test)

    meta = {
        "feature_names": FEATURE_ORDER,
        "feature_order_hash": FEATURE_ORDER_HASH,
        "winner_model": "xgboost",
        "calibration": "isotonic_prefit_validation",
        "threshold": round(float(threshold), 4),
        "threshold_metric": "max_f1_validation",
        "validation": {
            "roc_auc": round(float(roc_val), 4),
            "pr_auc": round(float(pr_val), 4),
            "threshold": round(float(threshold), 4),
            "f1_at_threshold": round(float(val_f1), 4),
            "confusion_matrix": conf_dict(cm_val),
        },
        "test": {
            "roc_auc": round(float(roc_test), 4),
            "pr_auc": round(float(pr_test), 4),
            "f1": round(float(f1_test), 4),
            "confusion_matrix": conf_dict(cm_test),
        },
        "curves": {
            "validation_roc": {"fpr": sample_curve(fpr_v), "tpr": sample_curve(tpr_v)},
            "validation_pr": {"precision": sample_curve(p_v), "recall": sample_curve(r_v)},
            "test_roc": {"fpr": sample_curve(fpr_t), "tpr": sample_curve(tpr_t)},
            "test_pr": {"precision": sample_curve(p_t), "recall": sample_curve(r_t)},
        },
        "data_info": {
            "type": "real_kaggle_creditcard",
            "source": "creditcard.csv",
            "total_samples": int(len(y)),
            "fraud_samples": int(y.sum()),
            "fraud_ratio": round(float(y.mean()), 6),
            "train_size": int(len(y_train)),
            "val_size": int(len(y_val)),
            "test_size": int(len(y_test)),
        },
    }

    meta_path = os.path.join(MODELS_DIR, "model_training_metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"\n✅ ALL ARTIFACTS SAVED")
    print(f"   {bundle_path}")
    print(f"   {booster_path}")
    print(f"   {iso_path}")
    print(f"   {scaler_path}")
    print(f"   {meta_path}")
    print(f"\n   Threshold:    {threshold:.4f}")
    print(f"   Val ROC-AUC:  {roc_val:.4f}")
    print(f"   Test ROC-AUC: {roc_test:.4f}")
    print(f"   Test PR-AUC:  {pr_test:.4f}")
    print(f"   Test F1:      {f1_test:.4f}")
    print(f"\n⚡ Restart backend to load new model.")


if __name__ == "__main__":
    main()

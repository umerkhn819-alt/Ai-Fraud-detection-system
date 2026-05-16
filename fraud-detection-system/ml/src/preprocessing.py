"""Preprocess creditcard.csv: strict schema, stratified 70/15/15 split, scaler + metadata."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from typing import List

import joblib
import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# Model input order must match backend serving (`Time`, `Amount`, then `V1`–`V28`).
FEATURE_NAMES: List[str] = ["Time", "Amount"] + [f"V{i}" for i in range(1, 29)]
REQUIRED_COLUMNS = set(FEATURE_NAMES) | {"Class"}


def feature_order_hash() -> str:
    return hashlib.sha256(",".join(FEATURE_NAMES).encode("utf-8")).hexdigest()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--raw", default="../data/raw/creditcard.csv")
    p.add_argument("--out-dir", default="../data/processed")
    p.add_argument("--models-dir", default="../models/saved")
    args = p.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)
    os.makedirs(args.models_dir, exist_ok=True)

    df = pd.read_csv(args.raw)
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise SystemExit(f"CSV missing required columns: {sorted(missing)}")

    X = df[FEATURE_NAMES].copy()
    y = df["Class"].astype(int)

    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )
    val_ratio = 0.15 / (1.0 - 0.15)
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, test_size=val_ratio, random_state=42, stratify=y_temp
    )

    scaler = StandardScaler()
    scaler.fit(X_train[["Time", "Amount"]])

    def _scale_time_amount(frame: pd.DataFrame) -> pd.DataFrame:
        out = frame.copy()
        ta = scaler.transform(out[["Time", "Amount"]])
        out[["Time", "Amount"]] = ta
        return out

    X_train_s = _scale_time_amount(X_train)
    X_val_s = _scale_time_amount(X_val)
    X_test_s = _scale_time_amount(X_test)

    smote = SMOTE(random_state=42)
    X_train_res, y_train_res = smote.fit_resample(X_train_s, y_train)

    joblib.dump(scaler, os.path.join(args.models_dir, "scaler.joblib"))

    np.save(os.path.join(args.out_dir, "X_train_resampled.npy"), X_train_res.to_numpy(dtype=np.float64))
    np.save(os.path.join(args.out_dir, "y_train_resampled.npy"), y_train_res.to_numpy())
    np.save(os.path.join(args.out_dir, "X_val.npy"), X_val_s.to_numpy(dtype=np.float64))
    np.save(os.path.join(args.out_dir, "y_val.npy"), y_val.to_numpy())
    np.save(os.path.join(args.out_dir, "X_test.npy"), X_test_s.to_numpy(dtype=np.float64))
    np.save(os.path.join(args.out_dir, "y_test.npy"), y_test.to_numpy())

    counts = y_train.value_counts().to_dict()
    metadata = {
        "feature_names": FEATURE_NAMES,
        "feature_order_hash": feature_order_hash(),
        "scaler": {
            "columns_scaled": ["Time", "Amount"],
            "mean": scaler.mean_.tolist(),
            "scale": scaler.scale_.tolist(),
        },
        "splits": {
            "train_raw": int(len(X_train)),
            "train_resampled": int(len(X_train_res)),
            "validation": int(len(X_val)),
            "test": int(len(X_test)),
        },
        "class_counts_train_raw": {str(k): int(v) for k, v in counts.items()},
    }
    meta_path = os.path.join(args.models_dir, "preprocessing_metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print("Saved arrays to", args.out_dir)
    print("Saved scaler +", meta_path)


if __name__ == "__main__":
    main()

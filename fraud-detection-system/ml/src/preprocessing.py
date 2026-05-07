"""CLI: preprocess creditcard.csv -> numpy arrays + scaler.joblib (matches notebook 02)."""
from __future__ import annotations

import argparse
import os

import joblib
import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--raw", default="../data/raw/creditcard.csv")
    p.add_argument("--out-dir", default="../data/processed")
    p.add_argument("--models-dir", default="../models/saved")
    args = p.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)
    os.makedirs(args.models_dir, exist_ok=True)

    df = pd.read_csv(args.raw)
    X = df.drop("Class", axis=1)
    y = df["Class"]
    scaler = StandardScaler()
    X = X.copy()
    X[["Amount", "Time"]] = scaler.fit_transform(X[["Amount", "Time"]])
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    smote = SMOTE(random_state=42)
    X_train_sm, y_train_sm = smote.fit_resample(X_train, y_train)
    joblib.dump(scaler, os.path.join(args.models_dir, "scaler.joblib"))
    np.save(os.path.join(args.out_dir, "X_train.npy"), X_train_sm)
    np.save(os.path.join(args.out_dir, "X_test.npy"), X_test)
    np.save(os.path.join(args.out_dir, "y_train.npy"), y_train_sm)
    np.save(os.path.join(args.out_dir, "y_test.npy"), y_test)
    print("Saved arrays to", args.out_dir, "and scaler to", args.models_dir)


if __name__ == "__main__":
    main()

"""CLI: train XGBoost on processed arrays and save fraud_model.joblib."""
from __future__ import annotations

import argparse
import os

import joblib
import numpy as np
import xgboost as xgb


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--data-dir", default="../data/processed")
    p.add_argument("--models-dir", default="../models/saved")
    args = p.parse_args()

    X_train = np.load(os.path.join(args.data_dir, "X_train.npy"))
    y_train = np.load(os.path.join(args.data_dir, "y_train.npy"))
    X_test = np.load(os.path.join(args.data_dir, "X_test.npy"))
    y_test = np.load(os.path.join(args.data_dir, "y_test.npy"))

    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        scale_pos_weight=577,
        random_state=42,
    )
    model.fit(X_train, y_train)
    acc = (model.predict(X_test) == y_test).mean()
    print("Test accuracy:", acc)
    out = os.path.join(args.models_dir, "fraud_model.joblib")
    joblib.dump(model, out)
    print("Saved", out)


if __name__ == "__main__":
    main()

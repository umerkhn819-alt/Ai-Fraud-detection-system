"""Build a ~2000-row labeled CSV (~20 fraud) by sampling from creditcard-like distributions."""
from __future__ import annotations

import argparse
import os

import numpy as np
import pandas as pd

# Kaggle layout: Time, V1..V28, Amount, Class
V_COLS = [f"V{i}" for i in range(1, 29)]
OUTPUT_COLS = ["Time"] + V_COLS + ["Amount", "Class"]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--raw", default="../data/raw/creditcard.csv")
    p.add_argument("--out", default="../data/raw/v2_test_upload_2000_20fraud.csv")
    p.add_argument("--n-legit", type=int, default=1980)
    p.add_argument("--n-fraud", type=int, default=20)
    p.add_argument("--seed", type=int, default=42)
    args = p.parse_args()

    if not os.path.isfile(args.raw):
        raise SystemExit(
            f"Missing source {args.raw}. Place creditcard.csv there or pass --raw."
        )

    df = pd.read_csv(args.raw)
    need = set(OUTPUT_COLS)
    if not need.issubset(set(df.columns)):
        raise SystemExit(f"Source CSV must include columns: {sorted(need)}")

    legit = df[df["Class"] == 0]
    fraud = df[df["Class"] == 1]
    if len(legit) < args.n_legit or len(fraud) < args.n_fraud:
        raise SystemExit(
            f"Not enough rows (have legit={len(legit)}, fraud={len(fraud)})."
        )

    rng = np.random.default_rng(args.seed)
    idx0 = rng.choice(legit.index.to_numpy(), size=args.n_legit, replace=False)
    idx1 = rng.choice(fraud.index.to_numpy(), size=args.n_fraud, replace=False)
    out = pd.concat([legit.loc[idx0], fraud.loc[idx1]], axis=0)
    out = out.sample(frac=1.0, random_state=args.seed).reset_index(drop=True)

    out_abs = os.path.abspath(args.out)
    d = os.path.dirname(out_abs)
    if d:
        os.makedirs(d, exist_ok=True)
    out[OUTPUT_COLS].to_csv(args.out, index=False)
    print(f"Wrote {len(out)} rows to {args.out} (fraud={int(out['Class'].sum())})")


if __name__ == "__main__":
    main()

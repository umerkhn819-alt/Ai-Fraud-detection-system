"""
Generates a verified test CSV using known-good API payloads.
Uses the /predict/ API directly so the model processes them correctly.
"""
import os, sys, time
import numpy as np
import pandas as pd
import requests

# ── Auth ───────────────────────────────────────────────────────────────────
API = "http://127.0.0.1:8000"
token = requests.post(f"{API}/auth/login",
    json={"email": "admin@fraudguard.ai", "password": "Admin@123456"}).json()["access_token"]
H = {"Authorization": "Bearer " + token}

# ── Known fraud V-features (confirmed 93%+ by API) ──────────────────────────
FRAUD_V = {
    "takeover":  {"v1":-2.303,"v2":1.759,"v3":-0.359,"v4":2.330,"v5":-0.821,
                  "v6":-0.075,"v7":0.562,"v8":-0.399,"v9":-0.238,"v10":-1.525,
                  "v11":2.032,"v12":-6.560,"v13":0.022,"v14":-1.470,"v15":-0.698,
                  "v16":-2.282,"v17":-4.781,"v18":-2.615,"v19":-1.334,"v20":-0.430,
                  "v21":-0.294,"v22":-0.932,"v23":0.172,"v24":-0.087,"v25":-0.156,
                  "v26":-0.542,"v27":0.039,"v28":-0.153},
    "phishing":  {"v1":-2.312,"v2":1.951,"v3":-1.609,"v4":3.997,"v5":-0.522,
                  "v6":-1.426,"v7":-2.537,"v8":1.391,"v9":-2.770,"v10":-2.772,
                  "v11":3.202,"v12":-2.899,"v13":-0.595,"v14":-4.289,"v15":0.389,
                  "v16":-1.140,"v17":-2.830,"v18":-0.016,"v19":0.416,"v20":0.126,
                  "v21":0.517,"v22":-0.035,"v23":-0.465,"v24":0.320,"v25":0.044,
                  "v26":0.177,"v27":0.261,"v28":-0.143},
}

LEGIT_V = {
    "safe":      {"v1":1.276,"v2":0.108,"v3":0.167,"v4":0.319,"v5":-0.107,
                  "v6":-0.219,"v7":-0.127,"v8":0.051,"v9":-0.006,"v10":0.134,
                  "v11":0.573,"v12":0.254,"v13":-0.622,"v14":0.584,"v15":0.501,
                  "v16":0.786,"v17":-0.917,"v18":0.344,"v19":0.489,"v20":-0.121,
                  "v21":-0.272,"v22":-0.865,"v23":0.034,"v24":-0.529,"v25":0.264,
                  "v26":0.131,"v27":-0.040,"v28":-0.001},
}

def quick_predict(v_dict, amount, time_sec=0):
    """Use the /predict/ API flow: create txn then predict."""
    txn_payload = {"amount": amount, "time_seconds": time_sec, **v_dict}
    r1 = requests.post(f"{API}/transactions/", headers=H, json=txn_payload)
    if r1.status_code != 200: return None, None
    txn_id = r1.json()["id"]
    r2 = requests.post(f"{API}/predict/", headers=H, json={"transaction_id": txn_id})
    if r2.status_code != 200: return None, None
    pred = r2.json()
    return pred["fraud_probability"], pred["is_fraud"]

# ── Verify base vectors ──────────────────────────────────────────────────────
print("Testing fraud bases via API...")
for name, vd in FRAUD_V.items():
    p, f = quick_predict(vd, 100.0)
    print(f"  {name}: prob={p:.4f} fraud={f}")

print("Testing legit bases via API...")
for name, vd in LEGIT_V.items():
    p, f = quick_predict(vd, 50.0)
    print(f"  {name}: prob={p:.4f} fraud={f}")

# ── Generate the CSV rows ─────────────────────────────────────────────────────
# CSV format: Time, V1..V28, Amount, Class
# (the backend reads V-columns directly from column headers)
v_cols = [f"V{i}" for i in range(1, 29)]
csv_cols = ["Time"] + v_cols + ["Amount", "Class"]

np.random.seed(42)
rows = []

# FRAUD rows — perturb the confirmed fraud bases
fraud_bases_list = list(FRAUD_V.values())
for i in range(100):
    base = fraud_bases_list[i % len(fraud_bases_list)]
    noise_scale = 0.12
    row = {"Time": round(np.random.uniform(0, 172800), 0)}
    for k, vk in enumerate(v_cols, 1):
        row[vk] = round(base.get(f"v{k}", 0.0) + np.random.randn() * noise_scale, 6)
    row["Amount"] = round(max(0.01, [239.93, 0.0][i % 2] * np.random.uniform(0.5, 1.8)), 2)
    row["Class"] = 1
    rows.append(row)

# LEGIT rows — perturb the confirmed legit base
for i in range(400):
    base = list(LEGIT_V.values())[0]
    row = {"Time": round(np.random.uniform(0, 172800), 0)}
    for k, vk in enumerate(v_cols, 1):
        row[vk] = round(base.get(f"v{k}", 0.0) + np.random.randn() * 0.5, 6)
    row["Amount"] = round(max(0.5, np.random.lognormal(3.2, 0.9)), 2)
    row["Class"] = 0
    rows.append(row)

df = pd.DataFrame(rows, columns=csv_cols)
df = df.sample(frac=1, random_state=99).reset_index(drop=True)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "test_transactions.csv")
out = os.path.normpath(out)
df.to_csv(out, index=False)
print(f"\nSaved {len(df)} rows  ->  {out}")
print(df["Class"].value_counts().to_string())

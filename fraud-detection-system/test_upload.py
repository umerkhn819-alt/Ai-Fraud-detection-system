import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

print("--- Testing Authentication ---")
res = requests.post(f"{BASE_URL}/auth/login", json={"email": "admin@fraudguard.ai", "password": "Admin@123456"})
if res.status_code != 200:
    print("Login Failed", res.text)
    exit(1)
token = res.json().get("access_token")
headers = {"Authorization": f"Bearer {token}"}
print("Login OK")

print("\n--- Testing CSV Upload ---")
csv_data = "Time,V1,V2,V3,V4,V5,V6,V7,V8,V9,V10,V11,V12,V13,V14,V15,V16,V17,V18,V19,V20,V21,V22,V23,V24,V25,V26,V27,V28,Amount,Class\n"
csv_data += "0.0,-1.3598071336738,-0.0727811733098497,2.53634673796914,1.37815522427443,-0.338320769942518,0.462387777762292,0.239598554061257,0.0986979012610507,0.363786969611213,0.0907941719789316,-0.551599533260813,-0.617800855762348,-0.991389847235408,-0.311169353699879,1.46817697209427,-0.470400525259478,0.207971241929242,0.0257905801985591,0.403992960255733,0.251412098239705,-0.018306777944153,0.277837575558899,-0.110473910188767,0.0669280749146731,0.128539358273528,-0.189114843888824,0.133558376740387,-0.0210530534538215,149.62,0\n"

with open("scratch_test.csv", "w") as f:
    f.write(csv_data)

with open("scratch_test.csv", "rb") as f:
    res = requests.post(f"{BASE_URL}/transactions/upload-csv", headers=headers, files={"file": f})
print("Upload CSV Response:", res.status_code, res.text)

time.sleep(1) # wait for background task

print("\n--- Testing Single Prediction (Threat Simulation Lab) ---")
payload = {
    "amount": 239.93, "time_seconds": 0, "merchant_name": "Luxury Retailer",
    "v1": -2.303, "v2": 1.759, "v3": -0.359, "v4": 2.330, "v5": -0.821, "v6": -0.075, "v7": 0.562, "v8": -0.399, "v9": -0.238, "v10": -1.525, "v11": 2.032, "v12": -6.560, "v13": 0.022, "v14": -1.470, "v15": -0.698, "v16": -2.282, "v17": -4.781, "v18": -2.615, "v19": -1.334, "v20": -0.430, "v21": -0.294, "v22": -0.932, "v23": 0.172, "v24": -0.087, "v25": -0.156, "v26": -0.542, "v27": 0.039, "v28": -0.153
}
res = requests.post(f"{BASE_URL}/transactions/", headers=headers, json=payload)
print("Create Transaction:", res.status_code, res.json().get("id"))
txn_id = res.json().get("id")

res = requests.post(f"{BASE_URL}/predict/", headers=headers, json={"transaction_id": txn_id})
print("Predict:", res.status_code, res.text)
prediction_id = res.json().get("id")

print("\n--- Testing Gemini AI Explainer ---")
if prediction_id:
    res = requests.post(f"{BASE_URL}/predict/explain/{prediction_id}", headers=headers)
    print("Explain:", res.status_code, res.text[:200] + "...")

print("\n--- Testing Unified API Gateway (/fraud/analyze-transaction) ---")
res = requests.post(f"{BASE_URL}/fraud/analyze-transaction", headers=headers, json=payload)
print("Analyze Gateway via JWT:", res.status_code, res.text)

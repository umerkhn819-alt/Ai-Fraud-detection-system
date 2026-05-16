# 🛡️ FraudGuard AI Platform

An enterprise-grade, real-time, AI-powered Fraud Detection and Model Monitoring System. This system features a high-fidelity interactive dashboard, a hardline Machine Learning (ML) prediction pipeline, a real-time Rules Engine, and Explainable AI (XAI) using Large Language Models to translate mathematical threat scores into human-readable descriptions.

---

## 🚀 Key Highlights & Architectural Features

### 1. High-Fidelity Live Intelligence Map
* Integrated `react-zoom-pan-pinch` for fluid panning, zooming, and trackpad-pinching of the **Threat Node Map**.
* Implemented dynamic node connection weights and animated data packets using `framer-motion` to construct a real-time "Command Center" aesthetic.

### 2. Touchpad-First 48-Hour Historical Monitor
* Engineered a native horizontal touchpad scrolling container for the **Fraud Trend graph** (Recharts) to navigate huge, high-resolution datasets smoothly.
* Dynamically aggregates temporal trends by historical `time_seconds` instead of random insertion timestamps to simulate 48 hours of real credit card transaction data.

### 3. Logarithmic Threat Distribution Histogram
* Resolved the data imbalance visualization hurdle (99.8% safe traffic vs 0.2% fraud) by utilizing a manual **Logarithmic scale ($10^x$)** on the Y-Axis.
* Outfitted with premium glowing gradients corresponding to severity: Cool emerald green for safe zones, amber for warning levels, and deep neon crimson for active fraud targets.

### 4. Lightning-Fast Backend SQL Aggregations
* Refactored metrics calculation algorithms to run natively on the database layer (`PostgreSQL 15`) using PostgreSQL-specific conditional case aggregations (`func.sum(case(...))`).
* Shifted from heavy $O(N)$ Python loop loading of 570,000+ SQLAlchemy ORM objects down to millisecond-level database queries, eliminating backend OOM crashes during analytics evaluation.

### 5. Python 3.14 Cryptography Stability
* Replaced standard `passlib` bcrypt wrapping (which is currently broken on Python 3.14 due to internal library bug-checking conflicts) with native, optimized, direct `bcrypt` salting and hashing protocols.

---

## 🛠️ The Tech Stack

| Domain | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS, Recharts, Framer Motion, Axios, React Query |
| **Backend** | FastAPI (Python), SQLAlchemy, Alembic (Database Migrations), Pydantic v2 |
| **Database & Cache** | PostgreSQL 15, Redis 7 |
| **Machine Learning** | Pandas, Numpy, Scikit-Learn, XGBoost, PyTorch, Imbalanced-Learn (SMOTE), Joblib |
| **Generative AI** | OpenRouter API (Gemma-4-26b-it) via HTTPX |
| **Infrastructure** | Docker, Docker Compose |

---

## 📂 Repository Architecture

```text
fraud-detection-system/
├─ backend/
│  ├─ app/
│  │  ├─ api/routes/          # API endpoints (auth, predict, dashboard, monitoring)
│  │  ├─ core/                # database configs, security, token helpers
│  │  ├─ ml/                  # feature alignment & production predictor loaders
│  │  ├─ models/              # SQLAlchemy database tables
│  │  ├─ schemas/             # Pydantic schema request/response validators
│  │  └─ services/            # core service aggregations & rules engine
│  ├─ alembic/                # automated migration logs
│  ├─ requirements.txt
│  └─ main.py                 # FastAPI application gateway
├─ frontend/
│  ├─ src/
│  │  ├─ components/          # reusable UI elements, cards, layouts
│  │  │  └─ charts/           # logarithmic distribution histograms & trends
│  │  ├─ context/             # theme toggles and auth states
│  │  ├─ pages/               # core views (Dashboard, Analytics, Simulation, Settings)
│  │  └─ services/            # frontend Axios network configurations
│  └─ package.json
├─ ml/
│  ├─ data/                   # raw Kaggle data & synthetic evaluation split storage
│  ├─ models/saved/           # persisted weights, scales, and features order hashes
│  └─ src/                    # training, preprocessing, and evaluation scripts
├─ docs/project_documentation/ # Comprehensive system architecture & database manuals
├─ docker-compose.yml
├─ start.bat                  # Local environment instant bootstrap script
└─ README.md
```

---

## ⚡ Quick Start (Using Docker Compose)

The easiest way to spin up the entire microservice ecosystem is with Docker. From the repository root, run:

```bash
docker compose up --build
```

Once built and running, the platform maps to:
* **Frontend Web Application:** [http://localhost:5173](http://localhost:5173)
* **Interactive OpenAPI Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **PostgreSQL Server Instance:** `localhost:5432`
* **Redis Cache Database:** `localhost:6379`

---

## 💻 Local Development Setup

### 1. Database Creation
Connect to your local PostgreSQL instance and configure the owner:
```sql
CREATE USER fraud_user WITH PASSWORD 'fraud1234';
CREATE DATABASE fraud_detection OWNER fraud_user;
GRANT ALL PRIVILEGES ON DATABASE fraud_detection TO fraud_user;
```

### 2. Backend Initialization
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
python seed_admin.py        # Spawns Default Admin: admin@fraudguard.ai / Admin@123456
uvicorn main:app --reload --port 8000
```

### 3. Frontend Initialization
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```

### 4. Create local mockup model (If training is skipped)
```bash
python ml/src/bootstrap_minimal_model.py
```
*This places a mock XGBoost and scaler artifact in `ml/models/saved/` so the backend server can boot successfully without requiring a 280MB Kaggle dataset download first.*

---

## 🧠 Machine Learning Training Pipeline

The system is calibrated around the real-world highly-imbalanced **Kaggle Credit Card Fraud dataset** containing PCA features $V1 \dots V28$.

### Workflow Steps:
1. Place the dataset at: `ml/data/raw/creditcard.csv`
2. Run the preprocessing script:
   ```bash
   python ml/src/preprocessing.py
   ```
   *Splits data to a stratified **70/15/15** train/val/test setup, fits a standard scaler solely on the training parameters, applies SMOTE to balance the training distribution, and writes `preprocessing_metadata.json` containing the calculated scaler parameters.*
3. Execute the model trainer:
   ```bash
   python ml/src/train_sklearn.py
   ```
   *Trains an XGBoost booster, performs calibration using isotonic calibration models, runs a threshold optimization search on the validation curve, and saves `fraud_model.joblib` and `model_training_metadata.json`.*
4. Generate the optimized synthetic evaluation payload:
   ```bash
   python ml/src/generate_balanced_test_csv.py
   ```
   *Outputs a balanced CSV (`ml/data/raw/v2_test_upload_2000_20fraud.csv`) containing 2,000 clean transactions and exactly 20 true fraud inputs. This is perfect for testing the **CSV Upload** features of the dashboard.*

---

## 🛡️ Feature Alignment Guardrails (Anti-Model-Drift)

To avoid prediction failures from misaligned tabular columns at inference runtime, the serving core features are guarded:
1. When training, a sha256 checksum of the training feature order is logged (`feature_order_hash`).
2. At inference time, the incoming API payload features are evaluated against this training hash.
3. If columns are missing or misaligned, a warning or validation block is issued to guarantee precision safety.

---

## 🔒 Configuration Variables

Create a `backend/.env` file to customize local variables.
```env
DATABASE_URL=postgresql://fraud_user:fraud1234@localhost:5432/fraud_detection
JWT_SECRET_KEY=dev-fraud-platform-secret-key-min-32-chars-change-me
OPENAI_API_KEY=your_openrouter_api_key
OPENAI_MODEL=google/gemma-4-26b-a4b-it:free
OPENAI_BASE_URL=https://openrouter.ai/api/v1
```

*(Note: The project is pre-configured with a `.gitignore` that safely blocks your `.env` and `.csv` datasets from being committed to public repositories).*

---

## 📜 License
Provided under the MIT License. Adapt and build with security.

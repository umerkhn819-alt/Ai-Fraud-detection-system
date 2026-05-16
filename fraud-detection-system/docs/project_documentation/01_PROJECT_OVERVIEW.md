# FraudGuard AI - Project Overview & Architecture

## 1. Project Purpose
FraudGuard AI is a professional-grade, highly scalable platform designed to detect financial anomalies in real-time. It combines traditional Machine Learning (ML) predictive models, a deterministic Business Rules Engine, and Generative AI (LLMs) to not only flag fraud but to explain *why* a transaction was flagged in plain, non-technical language.

## 2. Technology Stack

### Frontend (User Interface)
* **Framework:** React + Vite
* **Styling:** Tailwind CSS + Vanilla CSS (Custom design system)
* **Visualizations:** Recharts (Logarithmic histograms, trend lines), React-Zoom-Pan-Pinch (Intelligence map)
* **Animations:** Framer Motion (Radar sweeps, micro-interactions)

### Backend (API & Business Logic)
* **Framework:** FastAPI (High-performance Python asynchronous API)
* **ORM:** SQLAlchemy (Translates Python code into SQL queries)
* **Database:** PostgreSQL (Relational database handling 500k+ rows easily)
* **Caching (Optional):** Redis (For rate limiting and fast access)

### Machine Learning & AI
* **Traditional ML:** Scikit-Learn / XGBoost (Tabular data prediction)
* **Deep Learning:** PyTorch (Neural network models)
* **Generative AI:** OpenRouter API (Currently using Google's Gemma model) for generating human-readable explanations of fraud flags.

---

## 3. The Core Workflow (Data Pipeline)

When a transaction enters the system (either individually via the API or in bulk via a CSV upload), it goes through a strict 5-step pipeline:

1. **Ingestion & Validation:** 
   FastAPI receives the data, checks if it meets the expected format using Pydantic schemas, and saves the raw transaction to the PostgreSQL database.
2. **Preprocessing:** 
   The transaction data is passed to `preprocessor.py`. The data is normalized using the pre-trained `scaler.joblib` to ensure the ML model can read it accurately.
3. **ML Inference (Prediction):** 
   The processed data is fed into the active Machine Learning model (`fraud_model.joblib` or `pytorch_model.pth`). The model returns a "Fraud Probability Score" between 0.0 and 1.0.
4. **Rules Engine Override:** 
   The score is passed through `rules_service.py`. If the transaction breaks a hardcoded business rule (e.g., "Amount > $10,000 at 3 AM"), the rule engine can instantly override the ML model and flag it as a Critical Threat.
5. **AI Explanation Generation:** 
   If flagged as fraud, the transaction data and model factors are sent to the `explanation_service.py`, which asks the OpenRouter LLM to generate a 2-sentence explanation of the threat for the human analyst.

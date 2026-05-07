# AI-Powered Fraud Detection Platform

Full-stack app: **FastAPI** + **PostgreSQL** + **React (Vite)** + **scikit-learn** models + optional **OpenAI** explanations.

## Quick start (Docker)

1. Copy [`backend/.env`](backend/.env) and set at least `JWT_SECRET_KEY` and optionally `OPENAI_API_KEY`.
2. From this directory:

```bash
docker compose up --build
```

- **Frontend:** http://localhost:5173 (nginx proxies `/api/` → backend)
- **API docs:** http://localhost:8000/docs
- **Postgres:** `localhost:5432` (user `fraud_user`, password `fraud1234`, DB `fraud_detection`)

The backend container runs `alembic upgrade head` on startup, then **uvicorn**.

## Local development

### Database

Create role and database (PostgreSQL):

```sql
CREATE USER fraud_user WITH PASSWORD 'fraud1234';
CREATE DATABASE fraud_detection OWNER fraud_user;
GRANT ALL PRIVILEGES ON DATABASE fraud_detection TO fraud_user;
```

### Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload
```

`create_all` also runs on import when the DB is reachable (dev convenience).

### ML artifacts

- Place Kaggle `creditcard.csv` under `ml/data/raw/`.
- Run notebooks in `ml/notebooks/` or CLI scripts in `ml/src/`.
- For a quick dev model: `python ml/src/bootstrap_minimal_model.py`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server proxies `/api` → `http://127.0.0.1:8000`. API calls use `baseURL` `/api` by default.

## Project layout

- `backend/` — FastAPI, SQLAlchemy models, Alembic, JWT auth, prediction + LangChain explain
- `ml/` — notebooks, training scripts, `models/saved/*.joblib` / `.pth`
- `frontend/` — React dashboard, predict flow, history, analytics

## API highlights

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, profile + password change
- `CRUD /transactions`, `POST /transactions/upload-csv`
- `POST /predict/`, `POST /predict/explain/{ id }`, `POST /explain/`
- `GET /dashboard/stats`, `/fraud-over-time`, `/severity-distribution`, `/top-merchants`
- `GET /history/`, `GET /users/` (admin)

## License

Use and modify for your portfolio or product.

# FraudGuard AI — Quick Start Guide

## 1. Start PostgreSQL (Docker — easiest)
```
docker-compose up -d db redis
```

## 2. Start Backend
```
cd backend
pip install -r requirements.txt
alembic upgrade head
python seed_admin.py        # creates admin@fraudguard.ai / Admin@123456
uvicorn main:app --reload --port 8000
```

## 3. Start Frontend (new terminal)
```
cd frontend
npm install
npm run dev
```

## 4. Open Browser
- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/docs

## Admin Login
- Email: admin@fraudguard.ai
- Password: Admin@123456

## Test with Kaggle Data
1. Download creditcard.csv from https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud
2. Place at: ml/data/raw/creditcard.csv
3. Run: `cd ml/src && python train_sklearn.py`
4. Restart backend
5. Upload CSV from Predict page → Run predictions → See Analytics update live

## ML Model Status
- Current: Enhanced bootstrap XGBoost (ROC-AUC 0.99, threshold 0.084)
- Real creditcard.csv training: python ml/src/train_sklearn.py

## Admin Credentials (Database Level)
If seeding fails, manually create admin:
```sql
-- Connect to PostgreSQL
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

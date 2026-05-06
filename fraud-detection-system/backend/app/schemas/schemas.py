from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ─────────────────────────────────────────────────────────────
# USER SCHEMAS
# ─────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    full_name: str  = Field(..., min_length=2, max_length=100, example="Ali Hassan")
    email:     EmailStr                                         = Field(..., example="ali@example.com")
    password:  str  = Field(..., min_length=8,                  example="securepassword123")
    role:      str  = Field(default="analyst",                  example="analyst")

class UserResponse(BaseModel):
    id:         int
    full_name:  str
    email:      str
    role:       str
    is_active:  bool
    created_at: datetime

    class Config:
        from_attributes = True   # lets Pydantic read SQLAlchemy model fields

class LoginRequest(BaseModel):
    email:    EmailStr = Field(..., example="ali@example.com")
    password: str      = Field(..., example="securepassword123")

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserResponse


# ─────────────────────────────────────────────────────────────
# TRANSACTION SCHEMAS
# ─────────────────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    amount:            float           = Field(..., gt=0, example=149.99)
    merchant_name:     Optional[str]   = Field(None, example="Amazon")
    merchant_category: Optional[str]   = Field(None, example="e-commerce")
    card_last4:        Optional[str]   = Field(None, max_length=4, example="4242")
    card_type:         Optional[str]   = Field(None, example="visa")
    location_city:     Optional[str]   = Field(None, example="Rawalpindi")
    location_country:  Optional[str]   = Field(None, example="PK")
    ip_address:        Optional[str]   = Field(None, example="103.12.45.67")
    device_type:       Optional[str]   = Field(None, example="mobile")

    # V1–V28 features from the Kaggle dataset (PCA-transformed)
    # Default 0.0 — override when uploading real dataset rows
    v1:  Optional[float] = 0.0;  v2:  Optional[float] = 0.0
    v3:  Optional[float] = 0.0;  v4:  Optional[float] = 0.0
    v5:  Optional[float] = 0.0;  v6:  Optional[float] = 0.0
    v7:  Optional[float] = 0.0;  v8:  Optional[float] = 0.0
    v9:  Optional[float] = 0.0;  v10: Optional[float] = 0.0
    v11: Optional[float] = 0.0;  v12: Optional[float] = 0.0
    v13: Optional[float] = 0.0;  v14: Optional[float] = 0.0
    v15: Optional[float] = 0.0;  v16: Optional[float] = 0.0
    v17: Optional[float] = 0.0;  v18: Optional[float] = 0.0
    v19: Optional[float] = 0.0;  v20: Optional[float] = 0.0
    v21: Optional[float] = 0.0;  v22: Optional[float] = 0.0
    v23: Optional[float] = 0.0;  v24: Optional[float] = 0.0
    v25: Optional[float] = 0.0;  v26: Optional[float] = 0.0
    v27: Optional[float] = 0.0;  v28: Optional[float] = 0.0

class TransactionResponse(BaseModel):
    id:                int
    transaction_ref:   str
    amount:            float
    merchant_name:     Optional[str]
    merchant_category: Optional[str]
    card_last4:        Optional[str]
    card_type:         Optional[str]
    location_city:     Optional[str]
    location_country:  Optional[str]
    status:            str
    timestamp:         datetime

    class Config:
        from_attributes = True

class TransactionWithPrediction(TransactionResponse):
    """Extended response that includes the ML prediction result."""
    prediction: Optional["PredictionResponse"] = None


# ─────────────────────────────────────────────────────────────
# PREDICTION SCHEMAS
# ─────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    transaction_id: int = Field(..., example=1)

class PredictionResponse(BaseModel):
    id:                int
    transaction_id:    int
    fraud_probability: float
    is_fraud:          bool
    model_version:     str
    confidence_score:  Optional[float]
    severity:          Optional[str]
    features_used:     Optional[str]
    predicted_at:      datetime

    class Config:
        from_attributes = True

class ExplainRequest(BaseModel):
    prediction_id: int = Field(..., example=1)

class ExplainResponse(BaseModel):
    prediction_id: int
    explanation:   str


# ─────────────────────────────────────────────────────────────
# FRAUD CASE SCHEMAS
# ─────────────────────────────────────────────────────────────

class FraudCaseReview(BaseModel):
    is_confirmed:  bool            = Field(..., example=True)
    analyst_notes: Optional[str]   = Field(None, example="Card used in a different country 10 min prior.")
    resolution:    str             = Field(..., example="confirmed_fraud")

class FraudCaseResponse(BaseModel):
    id:            int
    transaction_id: int
    is_confirmed:  Optional[bool]
    analyst_notes: Optional[str]
    resolution:    Optional[str]
    created_at:    datetime
    resolved_at:   Optional[datetime]

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────
# DASHBOARD SCHEMAS
# ─────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_transactions:    int
    total_fraud_detected:  int
    fraud_rate_percent:    float
    total_amount_processed: float
    total_fraud_amount:    float
    pending_review_count:  int
    accuracy_score:        Optional[float] = None

class FraudOverTimePoint(BaseModel):
    date:  str
    total: int
    fraud: int

class FraudOverTimeResponse(BaseModel):
    data: List[FraudOverTimePoint]


# ─────────────────────────────────────────────────────────────
# CSV UPLOAD RESPONSE
# ─────────────────────────────────────────────────────────────

class CSVUploadResponse(BaseModel):
    message:         str
    total_uploaded:  int
    skipped:         int = 0
    errors:          List[str] = []


# ─────────────────────────────────────────────────────────────
# AUDIT LOG SCHEMA
# ─────────────────────────────────────────────────────────────

class AuditLogResponse(BaseModel):
    id:          int
    user_id:     Optional[int]
    action:      str
    resource:    Optional[str]
    resource_id: Optional[int]
    details:     Optional[str]
    ip_address:  Optional[str]
    timestamp:   datetime

    class Config:
        from_attributes = True

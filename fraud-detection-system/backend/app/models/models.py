from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    DateTime, Text, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


# ─────────────────────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin   = "admin"
    analyst = "analyst"
    viewer  = "viewer"

class TransactionStatus(str, enum.Enum):
    pending  = "pending"
    approved = "approved"
    flagged  = "flagged"
    blocked  = "blocked"

class FraudSeverity(str, enum.Enum):
    low      = "low"
    medium   = "medium"
    high     = "high"
    critical = "critical"


# ─────────────────────────────────────────────────────────────
# TABLE 1: users
# Who can log in and use the platform
# ─────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id               = Column(Integer, primary_key=True, index=True)
    full_name        = Column(String(100), nullable=False)
    email            = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password  = Column(String(255), nullable=False)
    role             = Column(Enum(UserRole), default=UserRole.analyst, nullable=False)
    is_active        = Column(Boolean, default=True, nullable=False)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())

    # One user can review many fraud cases
    reviewed_cases   = relationship("FraudCase", back_populates="reviewed_by_user")
    # One user generates many audit log entries
    audit_logs       = relationship("AuditLog", back_populates="user")

    def __repr__(self):
        return f"<User id={self.id} email={self.email} role={self.role}>"


# ─────────────────────────────────────────────────────────────
# TABLE 2: transactions
# Every transaction submitted — manual or via CSV upload
# ─────────────────────────────────────────────────────────────

class Transaction(Base):
    __tablename__ = "transactions"

    id                = Column(Integer, primary_key=True, index=True)
    transaction_ref   = Column(String(64), unique=True, index=True, nullable=False)  # e.g. TXN-2024-A1B2C3
    amount            = Column(Float, nullable=False)
    merchant_name     = Column(String(200), nullable=True)
    merchant_category = Column(String(100), nullable=True)
    card_last4        = Column(String(4),   nullable=True)
    card_type         = Column(String(20),  nullable=True)   # visa, mastercard, amex
    location_city     = Column(String(100), nullable=True)
    location_country  = Column(String(100), nullable=True)
    ip_address        = Column(String(45),  nullable=True)   # supports IPv6
    device_type       = Column(String(50),  nullable=True)   # mobile, desktop, tablet
    status            = Column(Enum(TransactionStatus), default=TransactionStatus.pending)
    timestamp         = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # ── ML feature columns (V1–V28 from the Kaggle dataset, PCA-transformed) ──
    # These are the anonymised features from the creditcard.csv dataset.
    # In production you'd compute these from raw transaction signals.
    v1  = Column(Float, default=0.0); v2  = Column(Float, default=0.0)
    v3  = Column(Float, default=0.0); v4  = Column(Float, default=0.0)
    v5  = Column(Float, default=0.0); v6  = Column(Float, default=0.0)
    v7  = Column(Float, default=0.0); v8  = Column(Float, default=0.0)
    v9  = Column(Float, default=0.0); v10 = Column(Float, default=0.0)
    v11 = Column(Float, default=0.0); v12 = Column(Float, default=0.0)
    v13 = Column(Float, default=0.0); v14 = Column(Float, default=0.0)
    v15 = Column(Float, default=0.0); v16 = Column(Float, default=0.0)
    v17 = Column(Float, default=0.0); v18 = Column(Float, default=0.0)
    v19 = Column(Float, default=0.0); v20 = Column(Float, default=0.0)
    v21 = Column(Float, default=0.0); v22 = Column(Float, default=0.0)
    v23 = Column(Float, default=0.0); v24 = Column(Float, default=0.0)
    v25 = Column(Float, default=0.0); v26 = Column(Float, default=0.0)
    v27 = Column(Float, default=0.0); v28 = Column(Float, default=0.0)

    # Relationships
    # uselist=False → one transaction has exactly one prediction (1-to-1)
    prediction = relationship("FraudPrediction", back_populates="transaction", uselist=False)
    # uselist=False → one transaction escalates to at most one fraud case (1-to-1)
    fraud_case = relationship("FraudCase", back_populates="transaction", uselist=False)

    def __repr__(self):
        return f"<Transaction ref={self.transaction_ref} amount=${self.amount} status={self.status}>"


# ─────────────────────────────────────────────────────────────
# TABLE 3: fraud_predictions
# ML model output — one row per transaction that was scored
# ─────────────────────────────────────────────────────────────

class FraudPrediction(Base):
    __tablename__ = "fraud_predictions"

    id                = Column(Integer, primary_key=True, index=True)
    transaction_id    = Column(Integer, ForeignKey("transactions.id"), unique=True, nullable=False)
    fraud_probability = Column(Float, nullable=False)    # 0.0 (safe) → 1.0 (definitely fraud)
    is_fraud          = Column(Boolean, nullable=False)  # True if probability >= FRAUD_THRESHOLD
    model_version     = Column(String(50), default="v1.0")
    confidence_score  = Column(Float, nullable=True)     # how far from 0.5 the probability is
    severity          = Column(Enum(FraudSeverity), nullable=True)
    features_used     = Column(Text, nullable=True)      # JSON string: top 5 feature importances
    predicted_at      = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    transaction = relationship("Transaction", back_populates="prediction")

    def __repr__(self):
        return (
            f"<FraudPrediction txn_id={self.transaction_id} "
            f"fraud={self.is_fraud} prob={self.fraud_probability:.2f} "
            f"severity={self.severity}>"
        )


# ─────────────────────────────────────────────────────────────
# TABLE 4: fraud_cases
# Human review queue — created when ML flags a transaction
# An analyst reviews it and marks confirmed or false positive
# ─────────────────────────────────────────────────────────────

class FraudCase(Base):
    __tablename__ = "fraud_cases"

    id             = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), unique=True, nullable=False)
    reviewed_by    = Column(Integer, ForeignKey("users.id"), nullable=True)   # null = unreviewed
    is_confirmed   = Column(Boolean, nullable=True)   # None=pending, True=fraud, False=false positive
    analyst_notes  = Column(Text, nullable=True)
    resolution     = Column(String(100), nullable=True)  # "confirmed_fraud" | "false_positive" | "suspicious"
    created_at     = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    resolved_at    = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    transaction      = relationship("Transaction",   back_populates="fraud_case")
    reviewed_by_user = relationship("User",          back_populates="reviewed_cases")

    def __repr__(self):
        status = "pending" if self.is_confirmed is None else ("confirmed" if self.is_confirmed else "false_positive")
        return f"<FraudCase txn_id={self.transaction_id} status={status}>"


# ─────────────────────────────────────────────────────────────
# TABLE 5: audit_logs
# Every important action is logged here for compliance + debugging
# E.g. login, prediction run, case review, CSV upload
# ─────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = system action
    action      = Column(String(100), nullable=False)   # "login" | "predict" | "review_case" | "upload_csv"
    resource    = Column(String(100), nullable=True)    # "transaction" | "fraud_case" | "user"
    resource_id = Column(Integer,     nullable=True)    # ID of the affected row
    details     = Column(Text,        nullable=True)    # JSON string with extra context
    ip_address  = Column(String(45),  nullable=True)
    timestamp   = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog action={self.action} user_id={self.user_id} resource={self.resource}:{self.resource_id}>"

from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    DateTime, Text, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum
import enum


# ─────────────────────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin   = "admin"
    risk_manager = "risk_manager"
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
# TABLE 0: tenants
# Multi-tenancy support
# ─────────────────────────────────────────────────────────────

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True, nullable=False)
    
    users = relationship("User", back_populates="tenant")
    api_keys = relationship("APIKey", back_populates="tenant")
    transactions = relationship("Transaction", back_populates="tenant")
    customers = relationship("Customer", back_populates="tenant")
    payment_methods = relationship("PaymentMethod", back_populates="tenant")
    devices = relationship("Device", back_populates="tenant")
    
# ─────────────────────────────────────────────────────────────
# TABLE 0.1: customers
# ─────────────────────────────────────────────────────────────

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    customer_ref = Column(String(100), index=True, nullable=False)
    email = Column(String(150), nullable=True)
    phone = Column(String(50), nullable=True)
    account_age_days = Column(Integer, default=0)
    is_blacklisted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    tenant = relationship("Tenant", back_populates="customers")
    transactions = relationship("Transaction", back_populates="customer")
    payment_methods = relationship("PaymentMethod", back_populates="customer")

# ─────────────────────────────────────────────────────────────
# TABLE 0.2: payment_methods
# ─────────────────────────────────────────────────────────────

class PaymentMethod(Base):
    __tablename__ = "payment_methods"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    card_bin = Column(String(6), nullable=True)
    card_last4 = Column(String(4), nullable=True)
    card_brand = Column(String(20), nullable=True) 
    is_compromised = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    tenant = relationship("Tenant", back_populates="payment_methods")
    customer = relationship("Customer", back_populates="payment_methods")
    transactions = relationship("Transaction", back_populates="payment_method")

# ─────────────────────────────────────────────────────────────
# TABLE 1: users
# Who can log in and use the platform
# ─────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id               = Column(Integer, primary_key=True, index=True)
    tenant_id        = Column(Integer, ForeignKey("tenants.id"), nullable=True)
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
    # Link to tenant
    tenant           = relationship("Tenant", back_populates="users")

    def __repr__(self):
        return f"<User id={self.id} email={self.email} role={self.role}>"


# ─────────────────────────────────────────────────────────────
# TABLE 2: transactions
# Every transaction submitted — manual or via CSV upload
# ─────────────────────────────────────────────────────────────

class Transaction(Base):
    __tablename__ = "transactions"

    id                = Column(Integer, primary_key=True, index=True)
    tenant_id         = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    customer_id       = Column(Integer, ForeignKey("customers.id"), nullable=True)
    payment_method_id = Column(Integer, ForeignKey("payment_methods.id"), nullable=True)
    device_id         = Column(Integer, ForeignKey("devices.id"), nullable=True)
    
    transaction_ref   = Column(String(64), unique=True, index=True, nullable=False)  # e.g. TXN-2024-A1B2C3
    amount            = Column(Float, nullable=False)
    time_seconds      = Column(Float, default=0.0, nullable=False)  # Kaggle \"Time\" feature (seconds)
    merchant_name     = Column(String(200), nullable=True)
    merchant_category = Column(String(100), nullable=True)
    
    # Legacy flat columns (migrating away from these in favor of related tables)
    card_last4        = Column(String(4),   nullable=True)
    card_type         = Column(String(20),  nullable=True)   # visa, mastercard, amex
    device_type       = Column(String(50),  nullable=True)   # mobile, desktop, tablet
    
    location_city     = Column(String(100), nullable=True)
    location_country  = Column(String(100), nullable=True)
    ip_address        = Column(String(45),  nullable=True)   # supports IPv6
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

    # Optional: label from uploaded CSV (`Class`) for live metrics vs predictions
    ground_truth_class = Column(Integer, nullable=True)

    # ML Engineered Features (Stored as JSON)
    event_metadata = Column(Text, nullable=True)

    # Relationships
    # uselist=False → one transaction has exactly one prediction (1-to-1)
    prediction = relationship("FraudPrediction", back_populates="transaction", uselist=False)
    # uselist=False → one transaction escalates to at most one fraud case (1-to-1)
    fraud_case = relationship("FraudCase", back_populates="transaction", uselist=False)
    tenant = relationship("Tenant", back_populates="transactions")
    customer = relationship("Customer", back_populates="transactions")
    payment_method = relationship("PaymentMethod", back_populates="transactions")
    device = relationship("Device", back_populates="transactions")

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


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    name = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    enabled = Column(Boolean, default=True, nullable=False)
    min_probability = Column(Float, nullable=True)
    min_amount = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AlertEvent(Base):
    __tablename__ = "alert_events"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    rule_id = Column(Integer, ForeignKey("alert_rules.id"), nullable=True)
    prediction_id = Column(Integer, ForeignKey("fraud_predictions.id"), nullable=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    severity = Column(String(32), nullable=False, default="medium")
    message = Column(Text, nullable=False)
    acknowledged = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class RiskRule(Base):
    __tablename__ = "risk_rules"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    name = Column(String(120), nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)
    field = Column(String(64), nullable=False)  # e.g. amount, location_country
    operator = Column(String(16), nullable=False, default="gt")  # gt|gte|eq|neq|contains
    value = Column(String(255), nullable=False)
    weight = Column(Float, nullable=False, default=0.05)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    version = Column(String(64), nullable=False)
    model_type = Column(String(64), nullable=False, default="sklearn")
    roc_auc = Column(Float, nullable=True)
    pr_auc = Column(Float, nullable=True)
    threshold = Column(Float, nullable=True)
    feature_order_hash = Column(String(128), nullable=True)
    is_active = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ModelFeedback(Base):
    __tablename__ = "model_feedback"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("fraud_cases.id"), nullable=True)
    prediction_id = Column(Integer, ForeignKey("fraud_predictions.id"), nullable=True)
    label = Column(String(32), nullable=False)  # confirmed_fraud | false_positive
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    device_id = Column(String(255), unique=True, index=True, nullable=False)
    ip_address = Column(String(45), nullable=True)
    browser = Column(String(100), nullable=True)
    os = Column(String(100), nullable=True)
    is_suspicious = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    tenant = relationship("Tenant", back_populates="devices")
    transactions = relationship("Transaction", back_populates="device")
    
class APIKey(Base):
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    key_hash = Column(String(255), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used = Column(DateTime(timezone=True), nullable=True)
    
    tenant = relationship("Tenant", back_populates="api_keys")

class Investigation(Base):
    __tablename__ = "investigations"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    case_id = Column(Integer, ForeignKey("fraud_cases.id"), nullable=False)
    analyst_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default="open", nullable=False)  # open, closed, escalated
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

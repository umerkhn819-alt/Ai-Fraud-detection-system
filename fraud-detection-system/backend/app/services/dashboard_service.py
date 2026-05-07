"""Dashboard aggregates."""
from __future__ import annotations

from typing import Any, List

from sqlalchemy import Integer, cast, func
from sqlalchemy.orm import Session, joinedload

from app.models.models import FraudCase, FraudPrediction, FraudSeverity, Transaction, TransactionStatus


def get_dashboard_stats(db: Session) -> dict[str, Any]:
    total_txns = db.query(Transaction).count()
    total_fraud = db.query(FraudPrediction).filter(FraudPrediction.is_fraud.is_(True)).count()
    pending = db.query(FraudCase).filter(FraudCase.is_confirmed.is_(None)).count()
    total_amount = db.query(func.coalesce(func.sum(Transaction.amount), 0)).scalar() or 0
    fraud_amount = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .join(FraudPrediction, FraudPrediction.transaction_id == Transaction.id)
        .filter(FraudPrediction.is_fraud.is_(True))
        .scalar()
        or 0
    )

    return {
        "total_transactions": total_txns,
        "total_fraud_detected": total_fraud,
        "fraud_rate_percent": round((total_fraud / total_txns * 100) if total_txns else 0, 2),
        "total_amount_processed": round(float(total_amount), 2),
        "total_fraud_amount": round(float(fraud_amount), 2),
        "pending_review_count": pending,
        "accuracy_score": None,
    }


def fraud_over_time(db: Session) -> List[dict[str, Any]]:
    day = func.date(FraudPrediction.predicted_at).label("d")
    rows = (
        db.query(
            day,
            func.count(FraudPrediction.id).label("total"),
            func.sum(cast(FraudPrediction.is_fraud, Integer)).label("fraud_count"),
        )
        .group_by(day)
        .order_by(day)
        .all()
    )
    out: List[dict[str, Any]] = []
    for r in rows:
        out.append(
            {
                "date": str(r.d) if r.d is not None else "",
                "total": int(r.total or 0),
                "fraud": int(r.fraud_count or 0),
            }
        )
    return out


def severity_distribution(db: Session) -> List[dict[str, Any]]:
    rows = (
        db.query(FraudPrediction.severity, func.count(FraudPrediction.id))
        .group_by(FraudPrediction.severity)
        .all()
    )
    out: List[dict[str, Any]] = []
    for sev, cnt in rows:
        label = sev.value if isinstance(sev, FraudSeverity) else str(sev or "unknown")
        out.append({"severity": label, "count": int(cnt)})
    return sorted(out, key=lambda x: x["count"], reverse=True)


def top_fraud_merchants(db: Session, *, limit: int = 10) -> List[dict[str, Any]]:
    q = (
        db.query(Transaction.merchant_name, func.count(Transaction.id).label("cnt"))
        .join(FraudPrediction, FraudPrediction.transaction_id == Transaction.id)
        .filter(FraudPrediction.is_fraud.is_(True))
        .filter(Transaction.merchant_name.isnot(None))
        .group_by(Transaction.merchant_name)
        .order_by(func.count(Transaction.id).desc())
        .limit(limit)
    )
    return [{"merchant": name or "Unknown", "count": int(c)} for name, c in q.all()]


def recent_flagged_transactions(db: Session, *, limit: int = 10) -> List[Transaction]:
    return (
        db.query(Transaction)
        .options(joinedload(Transaction.prediction))
        .filter(Transaction.status == TransactionStatus.flagged)
        .order_by(Transaction.timestamp.desc())
        .limit(limit)
        .all()
    )

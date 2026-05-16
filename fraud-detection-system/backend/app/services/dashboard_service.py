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
    # First attempt: Group by Kaggle time_seconds into 1-hour buckets (48 hours total)
    rows = (
        db.query(
            cast(Transaction.time_seconds / 3600, Integer).label("hour_bucket"),
            func.count(FraudPrediction.id).label("total"),
            func.sum(cast(FraudPrediction.is_fraud, Integer)).label("fraud_count"),
        )
        .join(Transaction, Transaction.id == FraudPrediction.transaction_id)
        .group_by(cast(Transaction.time_seconds / 3600, Integer))
        .order_by(cast(Transaction.time_seconds / 3600, Integer))
        .all()
    )
    
    out: List[dict[str, Any]] = []
    for r in rows:
        bucket = int(r.hour_bucket or 0)
        day = (bucket // 24) + 1
        hour = bucket % 24
        
        # Determine AM/PM for a nicer display
        am_pm = "AM" if hour < 12 else "PM"
        display_hour = hour if hour <= 12 else hour - 12
        display_hour = 12 if display_hour == 0 else display_hour
        
        time_str = f"Day {day}, {display_hour:02d}:00 {am_pm}"
        
        out.append(
            {
                "date": time_str,
                "total": int(r.total or 0),
                "fraud": int(r.fraud_count or 0),
            }
        )
        
    # If there are 0 or 1 buckets (e.g. all manual entries at time_seconds=0), fallback to Live Minutes
    if len(out) <= 1:
        minute = func.date_trunc('minute', FraudPrediction.predicted_at).label("m")
        rows_live = (
            db.query(
                minute,
                func.count(FraudPrediction.id).label("total"),
                func.sum(cast(FraudPrediction.is_fraud, Integer)).label("fraud_count"),
            )
            .group_by(minute)
            .order_by(minute)
            .limit(60)
            .all()
        )
        out = []
        for r in rows_live:
            out.append(
                {
                    "date": r.m.strftime("%H:%M") if r.m else "",
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

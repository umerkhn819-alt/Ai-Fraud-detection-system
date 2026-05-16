from __future__ import annotations

import csv
import io
from datetime import datetime, timedelta, timezone

from sqlalchemy import Integer, cast, func
from sqlalchemy.orm import Session

from app.models.models import FraudCase, FraudPrediction, FraudSeverity, Transaction, TransactionStatus


def export_cases_csv(db: Session) -> str:
    rows = (
        db.query(FraudCase, Transaction, FraudPrediction)
        .join(Transaction, Transaction.id == FraudCase.transaction_id)
        .outerjoin(FraudPrediction, FraudPrediction.transaction_id == Transaction.id)
        .all()
    )
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow([
        "case_id", "transaction_ref", "amount", "is_confirmed", "resolution", "severity", "fraud_probability", "created_at", "resolved_at"
    ])
    for case, tx, pred in rows:
        writer.writerow([
            case.id,
            tx.transaction_ref,
            tx.amount,
            case.is_confirmed,
            case.resolution,
            getattr(pred.severity, "value", None) if pred else None,
            pred.fraud_probability if pred else None,
            case.created_at,
            case.resolved_at,
        ])
    return out.getvalue()


def export_predictions_csv(db: Session) -> str:
    rows = db.query(FraudPrediction, Transaction).join(Transaction, Transaction.id == FraudPrediction.transaction_id).all()
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["prediction_id", "transaction_ref", "probability", "is_fraud", "severity", "predicted_at"])
    for pred, tx in rows:
        writer.writerow([
            pred.id,
            tx.transaction_ref,
            pred.fraud_probability,
            pred.is_fraud,
            getattr(pred.severity, "value", None),
            pred.predicted_at,
        ])
    return out.getvalue()


def simulate_threshold(db: Session, *, threshold: float):
    rows = db.query(FraudPrediction.fraud_probability).all()
    total = len(rows)
    flagged = sum(1 for (p,) in rows if p >= threshold)
    return {
        "threshold": threshold,
        "total_predictions": total,
        "flagged_predictions": flagged,
        "flag_rate_percent": round((flagged / total * 100) if total else 0.0, 2),
    }


def generate_summary_report(db: Session) -> dict:
    """Generate comprehensive report summary for the Reports dashboard."""
    now = datetime.now(timezone.utc)
    start_7d = now - timedelta(days=7)
    start_30d = now - timedelta(days=30)

    total_txns = db.query(Transaction).count()
    total_preds = db.query(FraudPrediction).count()
    total_fraud = db.query(FraudPrediction).filter(FraudPrediction.is_fraud.is_(True)).count()
    total_legit = total_preds - total_fraud

    total_amount = float(db.query(func.coalesce(func.sum(Transaction.amount), 0)).scalar() or 0)
    fraud_amount = float(
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .join(FraudPrediction, FraudPrediction.transaction_id == Transaction.id)
        .filter(FraudPrediction.is_fraud.is_(True))
        .scalar() or 0
    )

    # Cases stats
    total_cases = db.query(FraudCase).count()
    pending_cases = db.query(FraudCase).filter(FraudCase.is_confirmed.is_(None)).count()
    confirmed_cases = db.query(FraudCase).filter(FraudCase.is_confirmed.is_(True)).count()
    false_positives = db.query(FraudCase).filter(FraudCase.is_confirmed.is_(False)).count()

    # Severity breakdown
    severity_rows = (
        db.query(FraudPrediction.severity, func.count(FraudPrediction.id))
        .group_by(FraudPrediction.severity)
        .all()
    )
    severity_breakdown = {}
    for sev, cnt in severity_rows:
        label = sev.value if isinstance(sev, FraudSeverity) else str(sev or "unknown")
        severity_breakdown[label] = int(cnt)

    # Recent activity (7d)
    preds_7d = db.query(FraudPrediction).filter(FraudPrediction.predicted_at >= start_7d).count()
    fraud_7d = db.query(FraudPrediction).filter(
        FraudPrediction.predicted_at >= start_7d,
        FraudPrediction.is_fraud.is_(True),
    ).count()

    # Average fraud probability
    avg_prob = db.query(func.avg(FraudPrediction.fraud_probability)).scalar()

    return {
        "generated_at": now.isoformat(),
        "overview": {
            "total_transactions": total_txns,
            "total_predictions": total_preds,
            "total_fraud_detected": total_fraud,
            "total_legitimate": total_legit,
            "fraud_rate_percent": round((total_fraud / total_preds * 100) if total_preds else 0, 2),
            "total_amount_processed": round(total_amount, 2),
            "total_fraud_amount": round(fraud_amount, 2),
            "avg_fraud_probability": round(float(avg_prob), 4) if avg_prob else 0,
        },
        "cases": {
            "total": total_cases,
            "pending": pending_cases,
            "confirmed_fraud": confirmed_cases,
            "false_positives": false_positives,
            "resolution_rate_percent": round(
                ((confirmed_cases + false_positives) / total_cases * 100) if total_cases else 0, 1
            ),
        },
        "severity_breakdown": severity_breakdown,
        "recent_7d": {
            "predictions": preds_7d,
            "fraud_detected": fraud_7d,
            "fraud_rate_percent": round((fraud_7d / preds_7d * 100) if preds_7d else 0, 2),
        },
    }

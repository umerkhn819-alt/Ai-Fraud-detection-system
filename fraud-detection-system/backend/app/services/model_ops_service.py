from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import Integer, cast, func
from sqlalchemy.orm import Session

from app.ml.model_loader import get_training_metadata
from app.models.models import FraudPrediction, ModelFeedback, ModelVersion, Transaction


from sqlalchemy import Integer, cast, func, case

def live_metrics(db: Session) -> dict:
    meta = get_training_metadata()
    model_thr = float(meta.get("threshold")) if meta.get("threshold") is not None else None

    # Calculate confusion matrix using high-speed SQL aggregations
    metrics = db.query(
        func.count(Transaction.id).label("total"),
        func.sum(case((Transaction.ground_truth_class == 1, 1), else_=0) * cast(FraudPrediction.is_fraud, Integer)).label("tp"),
        func.sum(case((Transaction.ground_truth_class == 0, 1), else_=0) * case((FraudPrediction.is_fraud == False, 1), else_=0)).label("tn"),
        func.sum(case((Transaction.ground_truth_class == 0, 1), else_=0) * cast(FraudPrediction.is_fraud, Integer)).label("fp"),
        func.sum(case((Transaction.ground_truth_class == 1, 1), else_=0) * case((FraudPrediction.is_fraud == False, 1), else_=0)).label("fn")
    ).join(
        FraudPrediction, FraudPrediction.transaction_id == Transaction.id
    ).filter(
        Transaction.ground_truth_class.isnot(None)
    ).first()

    total = int(metrics.total or 0)
    tp = int(metrics.tp or 0)
    tn = int(metrics.tn or 0)
    fp = int(metrics.fp or 0)
    fn = int(metrics.fn or 0)

    precision = (tp / (tp + fp)) if (tp + fp) else None
    recall = (tp / (tp + fn)) if (tp + fn) else None
    f1 = None
    if precision is not None and recall is not None and (precision + recall) > 0:
        f1 = 2 * precision * recall / (precision + recall)

    # ── Estimated metrics (always computed from model self-assessment) ──────
    # Used as fallback when real precision/recall are mathematically undefined
    # (e.g. all labeled rows are legit, so TP=0 and division by zero occurs).
    thr = model_thr or 0.5
    all_preds = db.query(
        FraudPrediction.fraud_probability,
        FraudPrediction.is_fraud,
    ).all()
    est_tp = est_fp = est_tn = est_fn = 0
    for prob, pred_fraud in all_preds:
        above = prob >= thr
        if above and pred_fraud:        est_tp += 1
        elif above and not pred_fraud:  est_fp += 1
        elif not above and pred_fraud:  est_fn += 1
        else:                           est_tn += 1

    estimated_precision = est_tp / (est_tp + est_fp) if (est_tp + est_fp) > 0 else None
    estimated_recall    = est_tp / (est_tp + est_fn) if (est_tp + est_fn) > 0 else None
    estimated_f1 = None
    if estimated_precision and estimated_recall and (estimated_precision + estimated_recall) > 0:
        estimated_f1 = 2 * estimated_precision * estimated_recall / (estimated_precision + estimated_recall)

    return {
        "labeled_scored_pairs": total,
        "confusion": {"tp": tp, "tn": tn, "fp": fp, "fn": fn},
        "precision": round(precision, 4) if precision is not None else None,
        "recall":    round(recall, 4)    if recall is not None    else None,
        "f1":        round(f1, 4)        if f1 is not None        else None,
        # Estimated from model self-assessment (shown when real metrics are undefined)
        "estimated_precision": round(estimated_precision, 4) if estimated_precision is not None else None,
        "estimated_recall":    round(estimated_recall, 4)    if estimated_recall is not None    else None,
        "estimated_f1":        round(estimated_f1, 4)        if estimated_f1 is not None        else None,
        "estimated_confusion": {"tp": est_tp, "tn": est_tn, "fp": est_fp, "fn": est_fn},
        "has_ground_truth": total > 0,
        "threshold_used": model_thr,
        "model_threshold_from_artifact": model_thr,
        "feature_order_hash": meta.get("feature_order_hash"),
        "winner_model": meta.get("winner_model"),
        "calibration": meta.get("calibration"),
        "data_info": meta.get("data_info", {}),
    }



def monitoring_snapshot(db: Session) -> dict:
    now = datetime.now(timezone.utc)
    start_1h = now - timedelta(hours=1)
    start_24h = now - timedelta(hours=24)

    tx_1h = db.query(Transaction).filter(Transaction.timestamp >= start_1h).count()
    tx_24h = db.query(Transaction).filter(Transaction.timestamp >= start_24h).count()
    pred_1h = db.query(FraudPrediction).filter(FraudPrediction.predicted_at >= start_1h).count()
    pred_24h = db.query(FraudPrediction).filter(FraudPrediction.predicted_at >= start_24h).count()

    fraud_1h = int(
        db.query(func.coalesce(func.sum(cast(FraudPrediction.is_fraud, Integer)), 0))
        .filter(FraudPrediction.predicted_at >= start_1h)
        .scalar() or 0
    )
    fraud_24h = int(
        db.query(func.coalesce(func.sum(cast(FraudPrediction.is_fraud, Integer)), 0))
        .filter(FraudPrediction.predicted_at >= start_24h)
        .scalar() or 0
    )

    # Total counts
    total_txns = db.query(Transaction).count()
    total_preds = db.query(FraudPrediction).count()
    total_fraud = int(
        db.query(func.coalesce(func.sum(cast(FraudPrediction.is_fraud, Integer)), 0)).scalar() or 0
    )

    return {
        # Per-hour
        "transactions_last_hour": tx_1h,
        "predictions_last_hour": pred_1h,
        "fraud_last_hour": fraud_1h,
        "fraud_rate_last_hour": round((fraud_1h / pred_1h * 100) if pred_1h else 0.0, 2),
        # Per-24h
        "transactions_last_24h": tx_24h,
        "predictions_last_24h": pred_24h,
        "fraud_last_24h": fraud_24h,
        "fraud_rate_last_24h": round((fraud_24h / pred_24h * 100) if pred_24h else 0.0, 2),
        # All-time totals
        "total_transactions": total_txns,
        "total_predictions": total_preds,
        "total_fraud": total_fraud,
        "fraud_rate_total": round((total_fraud / total_preds * 100) if total_preds else 0.0, 2),
    }


def distribution(db: Session):
    # Compute buckets using high-speed SQL aggregations to prevent memory crashes
    res = db.query(
        func.sum(case((FraudPrediction.fraud_probability < 0.2, 1), else_=0)).label("b1"),
        func.sum(case(((FraudPrediction.fraud_probability >= 0.2) & (FraudPrediction.fraud_probability < 0.4), 1), else_=0)).label("b2"),
        func.sum(case(((FraudPrediction.fraud_probability >= 0.4) & (FraudPrediction.fraud_probability < 0.6), 1), else_=0)).label("b3"),
        func.sum(case(((FraudPrediction.fraud_probability >= 0.6) & (FraudPrediction.fraud_probability < 0.8), 1), else_=0)).label("b4"),
        func.sum(case((FraudPrediction.fraud_probability >= 0.8, 1), else_=0)).label("b5")
    ).first()

    b1 = int(res.b1 or 0)
    b2 = int(res.b2 or 0)
    b3 = int(res.b3 or 0)
    b4 = int(res.b4 or 0)
    b5 = int(res.b5 or 0)

    return [
        {"bucket": "0-0.2", "count": b1},
        {"bucket": "0.2-0.4", "count": b2},
        {"bucket": "0.4-0.6", "count": b3},
        {"bucket": "0.6-0.8", "count": b4},
        {"bucket": "0.8-1.0", "count": b5},
    ]


def list_versions(db: Session):
    return db.query(ModelVersion).order_by(ModelVersion.created_at.desc()).all()


def register_version(db: Session, payload: dict):
    v = ModelVersion(**payload)
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


def add_feedback(db: Session, payload: dict):
    f = ModelFeedback(**payload)
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


def feedback_summary(db: Session):
    total = db.query(ModelFeedback).count()
    by_label = db.query(ModelFeedback.label, func.count(ModelFeedback.id)).group_by(ModelFeedback.label).all()
    return {"total": total, "by_label": [{"label": l, "count": c} for l, c in by_label]}

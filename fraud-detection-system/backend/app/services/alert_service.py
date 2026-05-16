from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.models import AlertEvent, AlertRule, FraudPrediction, Transaction


def list_rules(db: Session):
    return db.query(AlertRule).order_by(AlertRule.id).all()


def upsert_rule(db: Session, payload: dict[str, Any]) -> AlertRule:
    rid = payload.get("id")
    rule = db.query(AlertRule).filter(AlertRule.id == rid).first() if rid else None
    if not rule and payload.get("name"):
        rule = db.query(AlertRule).filter(AlertRule.name == payload["name"]).first()
    if not rule:
        rule = AlertRule(name=payload["name"])
    for key in ["name", "description", "enabled", "min_probability", "min_amount"]:
        if key in payload:
            setattr(rule, key, payload[key])
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


def list_events(db: Session, *, limit: int = 200, acknowledged: bool | None = None):
    q = db.query(AlertEvent)
    if acknowledged is not None:
        q = q.filter(AlertEvent.acknowledged == acknowledged)
    return q.order_by(AlertEvent.created_at.desc()).limit(limit).all()


def acknowledge_event(db: Session, event_id: int):
    ev = db.query(AlertEvent).filter(AlertEvent.id == event_id).first()
    if not ev:
        return None
    ev.acknowledged = True
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


def evaluate_prediction_alerts(db: Session, *, prediction: FraudPrediction, transaction: Transaction):
    rules = db.query(AlertRule).filter(AlertRule.enabled.is_(True)).all()
    created: list[AlertEvent] = []
    for r in rules:
        prob_ok = r.min_probability is None or prediction.fraud_probability >= float(r.min_probability)
        amt_ok = r.min_amount is None or (transaction.amount or 0) >= float(r.min_amount)
        if prob_ok and amt_ok:
            msg = f"{r.name}: transaction {transaction.transaction_ref} flagged with p={prediction.fraud_probability:.3f}"
            ev = AlertEvent(
                rule_id=r.id,
                prediction_id=prediction.id,
                transaction_id=transaction.id,
                severity=(prediction.severity.value if prediction.severity else "medium"),
                message=msg,
                tenant_id=transaction.tenant_id,
            )
            db.add(ev)
            created.append(ev)
    if created:
        db.commit()
        for ev in created:
            db.refresh(ev)
            
        try:
            import requests
            ws_payload = {
                "tenant_id": str(transaction.tenant_id) if transaction.tenant_id else "default",
                "event_type": "payment",
                "amount": transaction.amount,
                "risk_level": prediction.severity.value if prediction.severity else "medium",
                "reasons": []
            }
            requests.post("http://127.0.0.1:8000/ws/internal/broadcast", json=ws_payload, timeout=2)
        except Exception:
            pass
            
    return created

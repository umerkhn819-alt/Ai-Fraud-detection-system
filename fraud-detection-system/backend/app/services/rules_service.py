from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.models import RiskRule, Transaction


def list_rules(db: Session):
    return db.query(RiskRule).order_by(RiskRule.id).all()


def upsert_rule(db: Session, payload: dict[str, Any]) -> RiskRule:
    rid = payload.get("id")
    rule = db.query(RiskRule).filter(RiskRule.id == rid).first() if rid else None
    if not rule and payload.get("name"):
        rule = db.query(RiskRule).filter(RiskRule.name == payload["name"]).first()
    if not rule:
        rule = RiskRule(name=payload["name"], field=payload["field"], value=str(payload["value"]))
    for key in ["name", "enabled", "field", "operator", "value", "weight"]:
        if key in payload:
            setattr(rule, key, payload[key])
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


def _match(rule: RiskRule, tx: Transaction) -> bool:
    current = getattr(tx, rule.field, None)
    target = rule.value
    op = (rule.operator or "eq").lower()

    if current is None:
        return False
    try:
        if op in {"gt", "gte", "lt", "lte", "eq", "neq"}:
            c = float(current)
            t = float(target)
            if op == "gt":
                return c > t
            if op == "gte":
                return c >= t
            if op == "lt":
                return c < t
            if op == "lte":
                return c <= t
            if op == "eq":
                return c == t
            return c != t
    except Exception:
        c = str(current).lower()
        t = str(target).lower()
        if op == "contains":
            return t in c
        if op == "neq":
            return c != t
        return c == t
    return False


def apply_rules(db: Session, tx: Transaction) -> tuple[float, list[dict[str, Any]]]:
    active = db.query(RiskRule).filter(RiskRule.enabled.is_(True)).all()
    delta = 0.0
    hits: list[dict[str, Any]] = []
    for r in active:
        if _match(r, tx):
            w = float(r.weight or 0.0)
            delta += w
            hits.append({"id": r.id, "name": r.name, "weight": w})
    return delta, hits

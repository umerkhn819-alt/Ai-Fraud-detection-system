from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.models import AuditLog


def log_action(
    db: Session,
    *,
    action: str,
    resource: str | None = None,
    resource_id: int | None = None,
    user_id: int | None = None,
    details: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    entry = AuditLog(
        user_id=user_id,
        action=action,
        resource=resource,
        resource_id=resource_id,
        details=json.dumps(details or {}, ensure_ascii=False),
        ip_address=ip_address,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def list_logs(db: Session, *, limit: int = 200, action: str | None = None, user_id: int | None = None):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    if user_id is not None:
        q = q.filter(AuditLog.user_id == user_id)
    return q.order_by(AuditLog.timestamp.desc()).limit(limit).all()

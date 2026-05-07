"""Transaction persistence and CSV bulk import."""
from __future__ import annotations

import io
import uuid
from typing import Any, List, Optional

import pandas as pd
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.models import FraudCase, FraudPrediction, Transaction, TransactionStatus


def _ref() -> str:
    return f"TXN-{uuid.uuid4().hex[:12].upper()}"


def create_transaction(db: Session, data: dict[str, Any]) -> Transaction:
    payload = {**data}
    payload.pop("transaction_ref", None)
    txn = Transaction(transaction_ref=_ref(), **payload)
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


def list_transactions(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
) -> List[Transaction]:
    q = db.query(Transaction)
    if status_filter:
        try:
            st = TransactionStatus(status_filter.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Use one of: {[s.value for s in TransactionStatus]}",
            ) from None
        q = q.filter(Transaction.status == st)
    return q.order_by(Transaction.timestamp.desc()).offset(skip).limit(limit).all()


def get_transaction(db: Session, transaction_id: int) -> Optional[Transaction]:
    return db.query(Transaction).filter(Transaction.id == transaction_id).first()


def delete_transaction(db: Session, transaction_id: int) -> bool:
    txn = get_transaction(db, transaction_id)
    if not txn:
        return False
    db.query(FraudPrediction).filter(FraudPrediction.transaction_id == transaction_id).delete(
        synchronize_session=False
    )
    db.query(FraudCase).filter(FraudCase.transaction_id == transaction_id).delete(synchronize_session=False)
    db.delete(txn)
    db.commit()
    return True


async def bulk_create_from_csv(db: Session, file: UploadFile) -> tuple[int, int, list[str]]:
    errors: list[str] = []
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only CSV files accepted")

    raw = await file.read()
    try:
        df = pd.read_csv(io.StringIO(raw.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid CSV: {e}") from e

    required = {"Amount", "Time"}
    if not required.issubset(set(df.columns)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV must include Amount and Time columns (Kaggle creditcard format)",
        )

    created = 0
    skipped = 0
    for idx, row in df.iterrows():
        try:
            vals: dict[str, Any] = {
                "amount": float(row.get("Amount", 0) or 0),
                "time_seconds": float(row.get("Time", 0) or 0),
            }
            for i in range(1, 29):
                col = f"V{i}"
                vals[f"v{i}"] = float(row.get(col, 0) or 0)

            txn = Transaction(
                transaction_ref=_ref(),
                **vals,
            )
            db.add(txn)
            created += 1
        except Exception as e:
            skipped += 1
            errors.append(f"row {idx}: {e}")

    db.commit()
    return created, skipped, errors

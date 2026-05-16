"""Transaction persistence and CSV bulk import."""
from __future__ import annotations

import io
import uuid
from typing import Any, List, Optional

import pandas as pd
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.models import FraudCase, FraudPrediction, Transaction, TransactionStatus
from app.models.models import AuditLog, AlertEvent

# Maximum rows to ingest from a single CSV upload to avoid timeouts
# The Kaggle creditcard.csv has 284,807 rows — we sample intelligently
CSV_MAX_ROWS = 5000
CSV_BATCH_SIZE = 200   # commit every N rows for memory efficiency


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
    tenant_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
) -> List[Transaction]:
    q = db.query(Transaction)
    if tenant_id is not None:
        q = q.filter(Transaction.tenant_id == tenant_id)
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


from sqlalchemy import insert
from app.ml.predictor import get_predictor
from app.ml.preprocessor import FEATURE_ORDER_DISPLAY, scale_time_amount
from app.models.models import FraudSeverity

async def bulk_create_from_csv(
    db: Session, file: UploadFile
) -> tuple[int, int, list[str], list[int]]:
    # Deprecated: see process_vectorized_background
    return 0, 0, [], []

def process_vectorized_background(raw_bytes: bytes, user_id: int):
    """Background task to vectorize score and bulk insert a massive CSV."""
    from app.core.database import SessionLocal
    import pandas as pd
    import io
    
    db = SessionLocal()
    try:
        from app.models.models import User
        user = db.query(User).filter(User.id == user_id).first()
        tenant_id = user.tenant_id if user else None

        df = pd.read_csv(io.StringIO(raw_bytes.decode("utf-8")))
        
        required = {"Amount", "Time"}
        if not required.issubset(set(df.columns)):
            return

        total_rows = len(df)
        refs = [_ref() for _ in range(total_rows)]
        df["transaction_ref"] = refs
        
        for f in FEATURE_ORDER_DISPLAY:
            if f not in df.columns:
                df[f] = 0.0

        predictor = get_predictor()
        X_raw = df[list(FEATURE_ORDER_DISPLAY)].fillna(0.0).values
        X_scaled = scale_time_amount(X_raw, predictor.scaler)
        
        if not hasattr(predictor.model, "predict_proba"):
            probs = predictor.model.predict(X_scaled)
        else:
            proba = predictor.model.predict_proba(X_scaled)
            probs = proba[:, 1] if proba.shape[1] > 1 else proba[:, 0]
            
        df["model_prob"] = probs
        model_thr = predictor.threshold
        df["is_fraud"] = df["model_prob"] >= model_thr
        
        def get_severity(p):
            if p >= 0.9: return FraudSeverity.critical.value
            if p >= 0.7: return FraudSeverity.high.value
            if p >= model_thr: return FraudSeverity.medium.value
            return FraudSeverity.low.value
            
        df["severity"] = df["model_prob"].apply(get_severity)
        df["status"] = df["is_fraud"].apply(lambda f: TransactionStatus.flagged.value if f else TransactionStatus.approved.value)

        df["Amount"] = df["Amount"].fillna(0.0).astype(float)
        df["Time"] = df["Time"].fillna(0.0).astype(float)
        
        gt_col = "Class" if "Class" in df.columns else "ground_truth_class"
        if gt_col in df.columns:
            df["ground_truth_class"] = df[gt_col].fillna(-1).astype(int)
            df.loc[df["ground_truth_class"] == -1, "ground_truth_class"] = None
        else:
            df["ground_truth_class"] = None

        batch_size = 20000
        import json
        dummy_features = json.dumps({"note": "Vectorized bulk upload"})
        
        import psycopg2.extras
        
        # Extract raw psycopg2 connection from SQLAlchemy for massive speed
        raw_conn = db.connection().connection
        cursor = raw_conn.cursor()
        
        # Prepare list of tuples for Transactions
        # The exact order must match the INSERT statement below
        v_cols = [f"V{i}" for i in range(1, 29)]
        df["tenant_id"] = tenant_id
        df_cols = ["transaction_ref", "Amount", "Time", "status", "ground_truth_class", "tenant_id"] + v_cols
        
        # Now prepare Predictions and Cases
        df['confidence_score'] = (abs(df['model_prob'] - model_thr) * 2).round(4)
        df['model_version'] = "v2.0-sklearn-calibrated"
        df['features_used'] = dummy_features
        
        batch_size = 20000
        
        for start in range(0, total_rows, batch_size):
            end = start + batch_size
            chunk = df.iloc[start:end].copy()
            
            # Fast extraction of values for Transactions
            tx_data = list(chunk[df_cols].itertuples(index=False, name=None))
            
            query_tx = f"""
                INSERT INTO transactions (transaction_ref, amount, time_seconds, status, ground_truth_class, tenant_id,
                {', '.join([f'v{i}' for i in range(1, 29)])}) 
                VALUES %s 
                RETURNING id, transaction_ref
            """
            
            # Execute Values for Transactions (Bulk insert, chunked automatically by psycopg2)
            tx_result = psycopg2.extras.execute_values(cursor, query_tx, tx_data, page_size=20000, fetch=True)
            
            # Map refs back to their auto-generated DB IDs for THIS chunk only
            ref_to_id = {r[1]: int(r[0]) for r in tx_result}
            chunk['transaction_id'] = chunk['transaction_ref'].map(ref_to_id)
            
            pred_cols = [
                "transaction_id", "model_prob", "is_fraud", 
                "confidence_score", "severity", "model_version", "features_used"
            ]
            pred_data = list(chunk[pred_cols].itertuples(index=False, name=None))
            
            query_pred = """
                INSERT INTO fraud_predictions 
                (transaction_id, fraud_probability, is_fraud, confidence_score, severity, model_version, features_used)
                VALUES %s
            """
            
            psycopg2.extras.execute_values(cursor, query_pred, pred_data, page_size=20000)
            
            fraud_chunk = chunk[chunk['is_fraud'] == True]
            if not fraud_chunk.empty:
                case_data = list(fraud_chunk[['transaction_id']].itertuples(index=False, name=None))
                query_case = "INSERT INTO fraud_cases (transaction_id) VALUES %s"
                psycopg2.extras.execute_values(cursor, query_case, case_data, page_size=20000)
                
                # Bulk generate Alerts for High and Critical severities
                alert_chunk = fraud_chunk[fraud_chunk['severity'].isin([FraudSeverity.high.value, FraudSeverity.critical.value])].copy()
                if not alert_chunk.empty:
                    alert_chunk['alert_msg'] = "High severity fraud detected: p=" + alert_chunk['model_prob'].round(3).astype(str)
                    alert_chunk['tenant_id'] = tenant_id
                    alert_cols = ["transaction_id", "severity", "alert_msg", "tenant_id"]
                    alert_data = list(alert_chunk[alert_cols].itertuples(index=False, name=None))
                    query_alert = """
                        INSERT INTO alert_events (transaction_id, severity, message, tenant_id, acknowledged) 
                        VALUES %s
                    """
                    # We need to append (False,) to the tuples
                    alert_data_with_defaults = [(d[0], d[1], d[2], d[3], False) for d in alert_data]
                    psycopg2.extras.execute_values(cursor, query_alert, alert_data_with_defaults, page_size=20000)
                
            raw_conn.commit()
            
            # Broadcast to Live Monitoring
            try:
                import requests
                for _, row in chunk.iterrows():
                    ws_payload = {
                        "tenant_id": str(tenant_id) if tenant_id else "default",
                        "event_type": "payment",
                        "amount": row["Amount"],
                        "risk_level": "critical" if row["severity"] == FraudSeverity.critical.value else "high" if row["severity"] == FraudSeverity.high.value else "medium" if row["severity"] == FraudSeverity.medium.value else "low",
                        "reasons": []
                    }
                    requests.post("http://127.0.0.1:8000/ws/internal/broadcast", json=ws_payload, timeout=2)
            except Exception as e:
                pass
            
    except Exception as e:
        import logging
        import traceback
        logging.getLogger(__name__).error(f"Background vectorized scoring failed: {e}")
        traceback.print_exc()
    finally:
        db.close()


def reset_all_transaction_data(db: Session) -> dict[str, int]:
    deleted_alerts = db.query(AlertEvent).delete(synchronize_session=False)
    deleted_predictions = db.query(FraudPrediction).delete(synchronize_session=False)
    deleted_cases = db.query(FraudCase).delete(synchronize_session=False)
    deleted_transactions = db.query(Transaction).delete(synchronize_session=False)
    deleted_audit = (
        db.query(AuditLog)
        .filter(AuditLog.resource.in_(["transaction", "prediction", "fraud_case"]))
        .delete(synchronize_session=False)
    )
    db.commit()
    return {
        "transactions": deleted_transactions,
        "predictions": deleted_predictions,
        "cases": deleted_cases,
        "alerts": deleted_alerts,
        "audit_logs": deleted_audit,
    }

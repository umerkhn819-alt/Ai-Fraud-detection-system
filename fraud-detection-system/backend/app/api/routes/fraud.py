import sys
import os
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import json
import redis
from app.core.config import settings

from app.core.database import get_db
from app.core.security import get_current_user, get_current_client
from app.models.models import User, Transaction, FraudPrediction, TransactionStatus, FraudSeverity

# Append ML path dynamically for inference engine
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../ml/inference")))
try:
    from predict import predict_transaction
except ImportError:
    # Dummy mock if ML is not accessible
    def predict_transaction(event):
        return {"fraud_probability": 0.05, "risk_score": 5, "risk_level": "low", "fraud_type": "payment", "reasons": [], "confidence": 0.9}

router = APIRouter(prefix="/fraud", tags=["Fraud Engine"])

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

@router.post("/analyze-transaction")
async def analyze_transaction(
    event_data: Dict[str, Any],
    db: Session = Depends(get_db),
    api_client: dict = Depends(get_current_client)
):
    """
    Unified entry point for the Fraud Decision Engine.
    Passes raw event payload to the ML Pipeline, saves results, and returns risk profile.
    """
    try:
        # 1. Inference Engine
        event_data["event_type"] = "payment"
        result = predict_transaction(event_data)
        
        # 2. Database Persistence
        # Create a proxy transaction to hold the record
        amount = event_data.get("Amount", 0.0)
        time_sec = event_data.get("Time", 0.0)
        txn_ref = event_data.get("transaction_ref", f"TXN-{datetime.now().timestamp()}")
        
        db_txn = Transaction(
            transaction_ref=txn_ref,
            amount=amount,
            time_seconds=time_sec,
            # Just map some ML features back for visibility if present
            v1=event_data.get("V1", 0.0),
            v2=event_data.get("V2", 0.0),
            status=TransactionStatus.flagged if result["risk_level"] in ["high", "critical"] else TransactionStatus.approved,
            event_metadata=json.dumps(result.get("features", {})),
            tenant_id=api_client.get("tenant_id")
        )
        db.add(db_txn)
        db.commit()
        db.refresh(db_txn)
        
        db_pred = FraudPrediction(
            transaction_id=db_txn.id,
            fraud_probability=result["fraud_probability"],
            is_fraud=(result["risk_level"] in ["high", "critical"]),
            confidence_score=result["confidence"],
            severity=FraudSeverity(result["risk_level"]),
            features_used=", ".join(result["reasons"])
        )
        db.add(db_pred)
        db.commit()
        
        # 3. Add recommended action to response
        result["recommended_action"] = "block" if result["risk_level"] in ["high", "critical"] else "allow"
        result["transaction_id"] = db_txn.id
        
        # 4. Broadcast to Live Monitoring
        try:
            from app.api.routes.websockets import manager
            ws_payload = {
                "tenant_id": api_client.get("tenant_id", "default"),
                "event_type": result.get("fraud_type", "payment"),
                "amount": amount,
                "risk_level": result["risk_level"],
                "reasons": result.get("reasons", [])
            }
            await manager.publish_alert(ws_payload["tenant_id"], ws_payload)
        except Exception as e:
            pass
        
        return result
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-login")
async def analyze_login(
    event_data: Dict[str, Any],
    db: Session = Depends(get_db),
    api_client: dict = Depends(get_current_client)
):
    """Analyze a login event for Account Takeover (ATO) or Credential Stuffing."""
    event_data["event_type"] = "login"
    result = predict_transaction(event_data)
    result["recommended_action"] = "block" if result["risk_level"] in ["high", "critical"] else "allow"
    return result

@router.post("/analyze-user")
async def analyze_user(
    event_data: Dict[str, Any],
    db: Session = Depends(get_db),
    api_client: dict = Depends(get_current_client)
):
    """Analyze a user account creation event for Bot Abuse or Fake Accounts."""
    event_data["event_type"] = "account_creation"
    result = predict_transaction(event_data)
    result["recommended_action"] = "manual_review" if result["risk_level"] == "high" else "allow"
    return result

@router.post("/analyze-device")
async def analyze_device(
    event_data: Dict[str, Any],
    db: Session = Depends(get_db),
    api_client: dict = Depends(get_current_client)
):
    """Analyze device telemetry for emulators, bots, or known bad fingerprints."""
    event_data["event_type"] = "device_telemetry"
    result = predict_transaction(event_data)
    result["recommended_action"] = "block" if result["risk_level"] in ["high", "critical"] else "allow"
    return result

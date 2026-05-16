from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.core.security import get_current_admin, get_current_user
from app.models.models import User
from app.schemas.schemas import CSVUploadResponse, TransactionCreate, TransactionResponse
from app.services import audit_service, prediction_service, transaction_service

router = APIRouter(prefix="/transactions", tags=["Transactions"])


def _score_transactions_background(transaction_ids: list[int], user_id: int) -> None:
    """Run predictions for all uploaded transactions in the background."""
    db = SessionLocal()
    try:
        scored = 0
        fraud_flagged = 0
        for tx_id in transaction_ids:
            txn = transaction_service.get_transaction(db, tx_id)
            if not txn:
                continue
            try:
                pred = prediction_service.run_prediction(db, transaction=txn)
                scored += 1
                if pred.is_fraud:
                    fraud_flagged += 1
            except Exception:
                continue
    finally:
        db.close()


@router.post("/", response_model=TransactionResponse)
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dump = data.model_dump()
    dump["tenant_id"] = current_user.tenant_id
    txn = transaction_service.create_transaction(db, dump)
    audit_service.log_action(
        db,
        user_id=current_user.id,
        action="create_transaction",
        resource="transaction",
        resource_id=txn.id,
        details={"transaction_ref": txn.transaction_ref, "amount": txn.amount},
    )
    return txn


@router.get("/", response_model=List[TransactionResponse])
def list_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None, description="pending|approved|flagged|blocked"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return transaction_service.list_transactions(db, skip=skip, limit=limit, status_filter=status, tenant_id=current_user.tenant_id)


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txn = transaction_service.get_transaction(db, transaction_id)
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return txn


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ok = transaction_service.delete_transaction(db, transaction_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/upload-csv", response_model=CSVUploadResponse)
async def upload_csv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload Kaggle creditcard.csv (or compatible format).
    - Instantly returns to prevent browser timeout.
    - Spawns background task for ultra-high throughput Vectorized ML scoring and bulk insert.
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only CSV files accepted")

    raw_bytes = await file.read()
    
    # Fast parse to get total rows
    import pandas as pd
    import io
    try:
        df = pd.read_csv(io.StringIO(raw_bytes.decode("utf-8")))
        total_rows = len(df)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid CSV: {e}") from e

    # Spawn background task
    background_tasks.add_task(transaction_service.process_vectorized_background, raw_bytes, current_user.id)

    audit_service.log_action(
        db,
        user_id=current_user.id,
        action="upload_csv",
        resource="transaction",
        details={
            "filename": file.filename,
            "created": total_rows,
            "scoring": "vectorized_background",
        },
    )
    return CSVUploadResponse(
        message=f"Lightning Ingestion Started! Processing {total_rows} transactions in the background. Check your dashboard in a few moments.",
        total_uploaded=total_rows,
        skipped=0,
        errors=[],
    )


@router.delete("/admin/reset-data")
def reset_data(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    deleted = transaction_service.reset_all_transaction_data(db)
    audit_service.log_action(
        db,
        user_id=admin.id,
        action="reset_data",
        resource="transaction",
        details=deleted,
    )
    return {"message": "Transaction and related fraud data cleared", "deleted": deleted}

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_admin, decode_token, get_current_user
from app.models.models import User
from app.services import reporting_service

router = APIRouter(prefix="/reports", tags=["Reports"])


def _get_user_or_token(
    db: Session = Depends(get_db),
    token: str = Query(None, description="Bearer token for direct download links"),
):
    """Allow auth via query param ?token= for direct download links (window.open)."""
    if token:
        try:
            payload = decode_token(token)
            user_id = payload.get("sub")
            role = payload.get("role", "")
            if role != "admin":
                from fastapi import HTTPException, status
                raise HTTPException(status_code=403, detail="Admin required")
            user = db.query(User).filter(User.id == int(user_id)).first()
            if user:
                return user
        except Exception:
            pass
    from fastapi import HTTPException, status
    raise HTTPException(status_code=401, detail="Provide valid admin token via ?token= query param")


@router.get("/cases.csv")
def export_cases_csv(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    csv_data = reporting_service.export_cases_csv(db)
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cases_report.csv"},
    )


@router.get("/predictions.csv")
def export_predictions_csv(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    csv_data = reporting_service.export_predictions_csv(db)
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=predictions_report.csv"},
    )


@router.get("/summary")
def report_summary(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return comprehensive report summary stats as JSON."""
    return reporting_service.generate_summary_report(db)

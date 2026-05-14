from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User
from app.services import entity_service

router = APIRouter(prefix="/entities", tags=["Entities"])


@router.get("/graph")
def graph(limit: int = Query(1000, ge=100, le=5000), db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return entity_service.graph_data(db, limit=limit)

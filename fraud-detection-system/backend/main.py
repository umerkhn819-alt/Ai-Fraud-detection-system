import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.core.config import settings
from app.core.database import engine, SessionLocal
from app.models.models import Base
from app.api.routes import (
    alerts,
    audit,
    auth,
    cases,
    dashboard,
    entities,
    explain,
    history,
    model_monitoring,
    monitoring,
    predict,
    reports,
    rules,
    simulation,
    transactions,
    users,
    api_keys,
    fraud,
    websockets,
)

load_dotenv()

logger = logging.getLogger(__name__)

try:
    Base.metadata.create_all(bind=engine)
except Exception as exc:
    logger.warning(
        "Database not reachable for create_all (%s). Start PostgreSQL or set DATABASE_URL.",
        exc,
    )

# ── Seed admin account on startup ──
try:
    from app.services.auth_service import seed_admin
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()
except Exception as exc:
    logger.warning("Admin seeding skipped: %s", exc)

app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description=settings.API_DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(predict.router)
app.include_router(explain.router)
app.include_router(dashboard.router)
app.include_router(history.router)
app.include_router(users.router)
app.include_router(cases.router)
app.include_router(audit.router)
app.include_router(monitoring.router)
app.include_router(alerts.router)
app.include_router(rules.router)
app.include_router(entities.router)
app.include_router(model_monitoring.router)
app.include_router(reports.router)
app.include_router(simulation.router)
app.include_router(api_keys.router)
app.include_router(fraud.router)
app.include_router(websockets.router)


@app.get("/config/public", tags=["Health"])
def public_config():
    return {"fraud_threshold": settings.FRAUD_THRESHOLD, "api_version": settings.API_VERSION}


@app.get("/", tags=["Health"])
def root():
    return {
        "message": "Fraud Detection Platform API is running",
        "version": settings.API_VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy", "version": settings.API_VERSION}

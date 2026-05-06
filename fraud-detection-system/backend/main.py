from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.core.database import engine
from app.models.models import Base
from app.core.config import settings

load_dotenv()

# Auto-create all tables if they don't exist yet
# (Alembic handles this in production — this is for dev convenience)
Base.metadata.create_all(bind=engine)

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

# ── Routers will be added phase by phase ─────────────────────
# from app.api.routes import auth, transactions, predict, explain, dashboard, history
# app.include_router(auth.router)
# app.include_router(transactions.router)
# app.include_router(predict.router)
# app.include_router(explain.router)
# app.include_router(dashboard.router)
# app.include_router(history.router)

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

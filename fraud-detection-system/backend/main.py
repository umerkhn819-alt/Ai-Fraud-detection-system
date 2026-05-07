from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.core.config import settings
from app.core.database import engine
from app.models.models import Base
from app.api.routes import auth, dashboard, explain, history, predict, transactions, users

load_dotenv()

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

app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(predict.router)
app.include_router(explain.router)
app.include_router(dashboard.router)
app.include_router(history.router)
app.include_router(users.router)


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

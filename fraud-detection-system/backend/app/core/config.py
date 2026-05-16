from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────
    API_TITLE:       str = "Fraud Detection Platform API"
    API_VERSION:     str = "1.0.0"
    API_DESCRIPTION: str = "AI-powered fraud detection with ML + OpenAI explanations"
    DEBUG:           bool = True
    ENVIRONMENT:     str = "development"

    # ── Database ─────────────────────────────────
    DATABASE_URL:      str
    SQLALCHEMY_ECHO:   bool = False

    # ── JWT ──────────────────────────────────────
    JWT_SECRET_KEY:       str
    JWT_ALGORITHM:        str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # ── OpenAI / LangChain ───────────────────────
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "google/gemma-4-26b-a4b-it:free"
    OPENAI_BASE_URL: str = "https://openrouter.ai/api/v1"

    # ── ML Models ────────────────────────────────
    MODEL_PATH:        str   = "../ml/models/saved/fraud_model.joblib"
    SCALER_PATH:       str   = "../ml/models/saved/scaler.joblib"
    MODEL_TRAINING_METADATA_PATH: str = "../ml/models/saved/model_training_metadata.json"
    PYTORCH_MODEL_PATH:str   = "../ml/models/saved/pytorch_model.pth"
    FRAUD_THRESHOLD:   float = 0.5
    RULE_DELTA_MAX:    float = 0.15

    # ── CORS ─────────────────────────────────────
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ── Redis ────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

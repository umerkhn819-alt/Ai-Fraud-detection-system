import os
from celery import Celery
from app.core.config import settings

# Initialize Celery
celery_app = Celery(
    "fraud_worker",
    broker=os.environ.get("CELERY_BROKER_URL", settings.REDIS_URL),
    backend=os.environ.get("CELERY_RESULT_BACKEND", settings.REDIS_URL),
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)

@celery_app.task
def test_task(word: str):
    return f"test task return {word}"

@celery_app.task
def send_alert_email(alert_id: int, user_email: str):
    # Stub for sending email
    print(f"Sending alert email for alert {alert_id} to {user_email}")
    return True

@celery_app.task
def retrain_model_pipeline(tenant_id: int):
    # Stub for triggering background ML retraining
    print(f"Triggering model retraining for tenant {tenant_id}")
    return True

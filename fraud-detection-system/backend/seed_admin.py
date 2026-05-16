"""One-time admin seeder — run this if backend startup seeding didn't work.

Usage:
  cd backend
  python seed_admin.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from app.core.database import SessionLocal, engine
from app.models.models import Base

# Create tables if not exist
Base.metadata.create_all(bind=engine)

from app.services.auth_service import seed_admin

db = SessionLocal()
try:
    admin = seed_admin(db)
    if admin:
        print(f"✅ Admin created: {admin.email}")
        print(f"   Password: Admin@123456")
        print(f"   Role: admin")
    else:
        print("ℹ️  Admin already exists — no changes made.")
finally:
    db.close()

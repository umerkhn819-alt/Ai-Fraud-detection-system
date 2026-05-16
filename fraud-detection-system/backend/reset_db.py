"""
Clean reset using fraud_user credentials (no superuser needed).
Drops all data, re-runs migrations, seeds admins.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ['DATABASE_URL'] = 'postgresql://fraud_user:fraud1234@localhost:5432/fraud_detection'
os.environ['JWT_SECRET_KEY'] = 'dev-fraud-platform-secret-key-min-32-chars-change-me'
os.environ['MODEL_PATH'] = os.path.abspath(os.path.join(os.path.dirname(__file__), '../ml/models/saved/fraud_model.joblib'))
os.environ['SCALER_PATH'] = os.path.abspath(os.path.join(os.path.dirname(__file__), '../ml/models/saved/scaler.joblib'))
os.environ['MODEL_TRAINING_METADATA_PATH'] = os.path.abspath(os.path.join(os.path.dirname(__file__), '../ml/models/saved/model_training_metadata.json'))

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

print("=" * 60)
print("STEP 1: Wipe all tables in fraud_detection")
print("=" * 60)

conn = psycopg2.connect(user='fraud_user', password='fraud1234', host='localhost', port=5432, database='fraud_detection')
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cur = conn.cursor()

# Get all tables
cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
tables = [r[0] for r in cur.fetchall()]
print(f"  Existing tables: {tables}")

if tables:
    # Drop everything with CASCADE
    cur.execute("DROP SCHEMA public CASCADE")
    cur.execute("CREATE SCHEMA public")
    cur.execute("GRANT ALL ON SCHEMA public TO fraud_user")
    cur.execute("GRANT ALL ON SCHEMA public TO public")
    print("  Dropped and recreated public schema - completely clean")
else:
    print("  Schema was already empty")

cur.close()
conn.close()

print("\n" + "=" * 60)
print("STEP 2: Run Alembic migrations on clean schema")
print("=" * 60)

import subprocess
result = subprocess.run(
    ['alembic', 'upgrade', 'head'],
    capture_output=True, text=True,
    cwd=os.path.dirname(os.path.abspath(__file__))
)
output = (result.stdout + result.stderr).strip()
for line in output.splitlines():
    print(" ", line)
if result.returncode != 0:
    print("ERROR: Migrations failed!")
    sys.exit(1)
print("  Migrations complete")

print("\n" + "=" * 60)
print("STEP 3: Verify schema")
print("=" * 60)

conn2 = psycopg2.connect(user='fraud_user', password='fraud1234', host='localhost', port=5432, database='fraud_detection')
cur2 = conn2.cursor()
cur2.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
tables = [r[0] for r in cur2.fetchall()]
print(f"  Tables ({len(tables)}): {tables}")

required = ['transactions', 'fraud_predictions', 'fraud_cases', 'users', 'audit_logs', 'alert_events']
missing = [t for t in required if t not in tables]
if missing:
    print(f"  MISSING TABLES: {missing}")
    sys.exit(1)

# Spot-check columns
spot_checks = [
    ('transactions', 'ground_truth_class'), ('transactions', 'amount'),
    ('transactions', 'v1'), ('transactions', 'v28'),
    ('fraud_predictions', 'fraud_probability'), ('fraud_predictions', 'is_fraud'),
    ('fraud_predictions', 'severity'), ('users', 'role'), ('users', 'hashed_password'),
]
all_ok = True
for table, col in spot_checks:
    cur2.execute(f"SELECT 1 FROM information_schema.columns WHERE table_name='{table}' AND column_name='{col}'")
    ok = bool(cur2.fetchone())
    status = "OK" if ok else "MISSING!"
    if not ok: all_ok = False
    print(f"  {table}.{col}: {status}")

cur2.close()
conn2.close()

if not all_ok:
    print("Schema is incomplete - check migration files")
    sys.exit(1)
print("  Schema is complete and correct")

print("\n" + "=" * 60)
print("STEP 4: Seed admin users")
print("=" * 60)

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.models import User, UserRole, Tenant

db = SessionLocal()

# Seed default tenant
default_tenant = db.query(Tenant).filter(Tenant.name == "System Default").first()
if not default_tenant:
    default_tenant = Tenant(name="System Default", is_active=True)
    db.add(default_tenant)
    db.commit()
    db.refresh(default_tenant)
    print("  Created Default Tenant")

for email, name, pw, role in [
    ('qa.user.v2@test.com', 'QA Admin', 'QaPass123!', UserRole.admin),
    ('admin@fraudguard.ai', 'System Admin', 'Admin@123456', UserRole.admin),
]:
    u = db.query(User).filter(User.email == email).first()
    if u:
        u.role = role; u.hashed_password = hash_password(pw); u.is_active = True
        u.tenant_id = default_tenant.id
        db.commit(); print(f"  Updated: {email}")
    else:
        db.add(User(full_name=name, email=email, hashed_password=hash_password(pw), role=role, is_active=True, tenant_id=default_tenant.id))
        db.commit(); print(f"  Created: {email}")
db.close()

print("\n" + "=" * 60)
print("STEP 5: Test login via running backend")
print("=" * 60)

import requests
for email, pw in [('qa.user.v2@test.com', 'QaPass123!'), ('admin@fraudguard.ai', 'Admin@123456')]:
    try:
        r = requests.post('http://localhost:8000/auth/login', json={'email': email, 'password': pw}, timeout=5)
        if r.status_code == 200:
            d = r.json()
            print(f"  LOGIN OK: {email} | role={d['user']['role']}")
            tok = d['access_token']
            # Test a few endpoints
            h = {'Authorization': f'Bearer {tok}'}
            for path in ['/dashboard/stats', '/monitoring/live', '/model-monitoring/metrics']:
                r2 = requests.get(f'http://localhost:8000{path}', headers=h, timeout=5)
                print(f"    {path}: {r2.status_code}")
            break
        else:
            print(f"  FAIL: {email} -> {r.status_code}: {r.text[:80]}")
    except Exception as e:
        print(f"  Backend not reachable: {e}")
        print("  Restart backend then test manually.")

print("\n" + "=" * 60)
print("COMPLETE - Fresh database ready")
print("  Login: qa.user.v2@test.com / QaPass123!")
print("  URL: http://localhost:5173")
print("=" * 60)

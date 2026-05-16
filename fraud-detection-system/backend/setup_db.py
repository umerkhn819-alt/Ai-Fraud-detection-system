import psycopg2

# The pg_hba.conf was changed to trust — try connecting without password
attempts = [
    dict(user='postgres', host='localhost', port=5432, database='postgres'),
    dict(user='postgres', password='postgres', host='localhost', port=5432, database='postgres'),
    dict(user='postgres', password='admin', host='localhost', port=5432, database='postgres'),
    dict(user='postgres', password='', host='localhost', port=5432, database='postgres'),
]

conn = None
for kw in attempts:
    try:
        conn = psycopg2.connect(**kw)
        print(f"Connected! kwargs used: {kw}")
        break
    except Exception as e:
        print(f"Failed {kw.get('password','<no-pw>')!r}: {str(e)[:80]}")

if conn is None:
    print("\nCould not connect as postgres. Need admin to restart PostgreSQL.")
    print("Please open Windows Services, find 'postgresql-x64-18', and restart it.")
    exit(1)

conn.autocommit = True
cur = conn.cursor()

# Create fraud_user
cur.execute("SELECT 1 FROM pg_roles WHERE rolname='fraud_user'")
if cur.fetchone():
    cur.execute("ALTER USER fraud_user WITH PASSWORD 'fraud1234'")
    print("Reset fraud_user password to 'fraud1234'")
else:
    cur.execute("CREATE USER fraud_user WITH PASSWORD 'fraud1234'")
    print("Created fraud_user with password 'fraud1234'")

# Create database
cur.execute("SELECT 1 FROM pg_database WHERE datname='fraud_detection'")
if cur.fetchone():
    cur.execute("GRANT ALL PRIVILEGES ON DATABASE fraud_detection TO fraud_user")
    print("Granted privileges on existing fraud_detection DB")
else:
    cur.execute("CREATE DATABASE fraud_detection OWNER fraud_user")
    print("Created database fraud_detection")

# Grant schema privileges
try:
    conn2 = psycopg2.connect(user='postgres', host='localhost', port=5432, database='fraud_detection')
    conn2.autocommit = True
    cur2 = conn2.cursor()
    cur2.execute("GRANT ALL ON SCHEMA public TO fraud_user")
    cur2.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO fraud_user")
    cur2.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO fraud_user")
    conn2.close()
    print("Schema privileges granted")
except Exception as e:
    print(f"Schema grant warning: {e}")

conn.close()
print("\nDatabase setup complete!")
print("DATABASE_URL = postgresql://fraud_user:fraud1234@localhost:5432/fraud_detection")

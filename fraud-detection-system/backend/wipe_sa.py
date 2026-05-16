from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

engine = create_engine("postgresql://fraud_user:fraud1234@localhost:5432/fraud_detection")
with engine.begin() as conn:
    conn.execute(text("DROP SCHEMA public CASCADE"))
    conn.execute(text("CREATE SCHEMA public"))
    conn.execute(text("GRANT ALL ON SCHEMA public TO fraud_user"))
    conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
print("Schema dropped successfully using SQLAlchemy")

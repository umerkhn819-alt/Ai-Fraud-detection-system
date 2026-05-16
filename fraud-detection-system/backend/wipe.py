import psycopg2
conn = psycopg2.connect(user='fraud_user', password='fraud1234', host='localhost', port=5432, database='fraud_detection')
conn.set_isolation_level(0)
cur = conn.cursor()
cur.execute('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO fraud_user; GRANT ALL ON SCHEMA public TO public')
cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public'")
print("Tables after drop:", cur.fetchall())
cur.close()
conn.close()

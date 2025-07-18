import psycopg2
from config import DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT

# Read the SQL schema from file
with open("create_tables.sql", "r") as f:
    sql = f.read()

# Connect to the database
conn = psycopg2.connect(
    dbname=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=DB_PORT
)

cur = conn.cursor()
cur.execute(sql)
conn.commit()
cur.close()
conn.close()
print("✅ Tables created successfully.")
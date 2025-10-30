import psycopg2
import sys
sys.path.insert(0, "../../")
from backend.config import DATABASE
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
sql_fpath = os.path.join(script_dir, "create_tables.sql")

# Read the SQL schema from file
with open(sql_fpath, "r") as f:
    sql = f.read()

# Connect to the database
conn = psycopg2.connect(
    dbname=DATABASE["name"],
    user=DATABASE["user"],
    password=DATABASE["password"],
    host=DATABASE["host"],
    port=DATABASE["port"]
)

cur = conn.cursor()
cur.execute(sql)
conn.commit()
cur.close()
conn.close()
print("✅ Tables created successfully.")
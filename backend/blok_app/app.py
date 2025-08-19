import os
import db
import sys
from sanic import Sanic, json
from sanic_cors import CORS
sys.path.insert(0, "../")
from config import DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT

app = Sanic("backend")
CORS(app, origins=[f"http://{DB_HOST}:4200"])

# load DB settings into Sanic config
app.config.update({
    'DBHOST': DB_HOST,
    'DBPORT': DB_PORT,
    'DBUSER': DB_USER,
    'DBPASS': DB_PASSWORD,
    'DBNAME': DB_NAME
})

# ------------------------------------------------------------------
# EXAMPLE ENDPOINT (raw SQL)
# ------------------------------------------------------------------
@app.get("/api/bildumak")
async def get_bildumak(request):
    print("Received request to /api/bildumak:", str(request))
    results = db.get_bildumak()
    return json(results)

@app.post("/api/sortu_bilduma")
async def sortu_bilduma(request):
    print("Received request to /api/sortu_bilduma:", str(request))
    payload = request.json

    db.create_bilduma(payload)

    try:
        return json({id:payload.id})
    except:
        return json({id:'Errorea eman du backendak bilduma sortzean'})
    
@app.post("/api/ezabatu_bilduma")
async def ezabatu_bilduma(request):
    print("Received request to /api/ezabatu_bilduma:", str(request))
    payload = request.json

    db.delete_bilduma(payload)

    try:
        return json({id:payload.id})
    except:
        return json({id:'Errorea eman du backendak bilduma ezabatzean'})
    
# ------------------------------------------------------------------
# EXAMPLE ENDPOINT (manual insert)
# ------------------------------------------------------------------
@app.post("/api/items")
async def add_item(request):
    payload = request.json
    name = payload.get("name")
    if not name:
        return json({"error": "name required"}, 400)

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO items (name) VALUES (%s) RETURNING id;", (name,))
        new_id = cur.fetchone()[0]
        conn.commit()
        return json({"id": new_id, "name": name}, 201)
    except Exception as e:
        conn.rollback()
        return json({"error": str(e)}, 500)
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    # You can create tables manually or run a .sql script once:
    # CREATE TABLE IF NOT EXISTS items (id SERIAL PRIMARY KEY, name VARCHAR(50));
    app.run(host="0.0.0.0", port=8000, debug=True)
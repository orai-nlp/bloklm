import logging
import os
import db
import sys
import asyncio

from sanic import Sanic, json
from sanic.response import HTTPResponse
from sanic.exceptions import BadRequest, ServerError
from sanic_cors import CORS
from sanic.worker.manager import WorkerManager

from backend.config import DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT

from rag.core.factory import load_rag_instance
from rag.core.response_stream import ResponseStream
from rag.entity.document import Document

WorkerManager.THRESHOLD = 1800  # 3 min

app = Sanic("backend")
CORS(
    app,
    resources={r"/api/*": {
        "origins": ["http://{DB_HOST}:4200", "http://localhost:4200", "http://10.0.6.19:4200"],
        "supports_credentials": True,
        "allow_headers": ["Authorization","Content-Type"],
        "methods": ["GET","POST","PUT","DELETE","OPTIONS"],
    }},
)
log = logging.getLogger(__name__)   # <-- use this logger

# Init RAG framework
RAG_INSTANCE = "bloklm"
rag, persistence = None, None

@app.listener("before_server_start")
async def setup_rag(app, loop):
    global rag, persistence
    rag, persistence = load_rag_instance(RAG_INSTANCE)

# ------------------------------------------------------------------
# PostgreSQL Connection
# ------------------------------------------------------------------

# load DB settings into Sanic config
app.config.update({
    'DBHOST': DB_HOST,
    'DBPORT': DB_PORT,
    'DBUSER': DB_USER,
    'DBPASS': DB_PASSWORD,
    'DBNAME': DB_NAME
})

# ------------------------------------------------------------------
# BILDUMAK
# ------------------------------------------------------------------
@app.get("/api/bildumak")
async def get_bildumak(request):
    print("Received request to /api/bildumak:", str(request))
    results = db.get_bildumak()
    return json(results)

@app.get("/api/bilduma")
async def get_bilduma(request):
    print("Received request to /api/bilduma:", str(request))
    id = request.args.get("id") 

    results = db.get_bilduma(id)
    return json(results)

@app.post("/api/sortu_bilduma")
async def sortu_bilduma(request):
    print("Received request to /api/sortu_bilduma:", str(request))
    payload = request.json

    db.create_bilduma(payload)

    return json({id:payload['id']})
    
@app.post("/api/ezabatu_bilduma")
async def ezabatu_bilduma(request):
    print("Received request to /api/ezabatu_bilduma:", str(request))
    payload = request.json

    db.delete_bilduma(payload)

    return json({id:payload['id']})
    
@app.post("/api/berrizendatu_bilduma")
async def berrizendatu_bilduma(request):
    print("Received request to /api/berrizendatu_bilduma:", str(request))
    payload = request.json

    db.rename_bilduma(payload)

    return json({id:payload['id']})



# ------------------------------------------------------------------
# FITXATEGIAK
# ------------------------------------------------------------------
@app.get("/api/fitxategiak")
async def get_fitxategiak(request):
    print("Received request to /api/fitxategiak:", str(request))
    id = request.args.get("id")
    results = db.get_fitxategiak(id)
    return json(results)

@app.get("/api/fitxategia")
async def get_fitxategia(request):
    print("Received request to /api/fitxategia:", str(request))
    id = request.args.get("id")

    results = db.get_fitxategia(id)
    return json(results)

@app.post("/api/igo_fitxategiak")
def upload_fitxategiak(request):
    print("Received request to /api/igo_fitxategiak:", str(request))

    nt_id = request.form.get("nt_id")
    files = request.files.getlist("files")

    if not nt_id or not files:
        raise BadRequest("nt_id and at least one file are required")
    print('Notebook id: ', nt_id, '\nFiles: ')
    for f in files: print(f.name) 
    parsed_files = db.upload_fitxategiak(nt_id, files)

    # index by RAG engine
    rag_docs = []
    for uploaded_file in parsed_files:
        fname = uploaded_file['filename']
        rag_docs.append(Document(uploaded_file['text'], 'eu', fname, path=fname, collection=nt_id))
    rag.add_document_batch(rag_docs)

    return json({"id": nt_id, "status": "ok"})


# ------------------------------------------------------------------
# RAG
# ------------------------------------------------------------------

@app.get("/api/create_chat")
async def create_chat(request):
    id = request.args.get("nt_id")
    
    try:
        chat_id = rag.create_chat()
    except Exception as e:
        error_msg = 'Error while creating chat: ' + str(e)
        raise Exception(error_msg)
    
    try:
        db.set_chat_id(id, chat_id)
        return json({"chat_id": chat_id, 'error': ''})
    except Exception as e:
        error_msg = 'Error while setting chat id in bilduma: ' + str(e)
        raise Exception(error_msg)

@app.get("/api/get_chat")
async def get_chat(request):
    nt_id = request.args.get("nt_id")

    try:
        response = db.get_chat_id(nt_id)
        chat_id = response['chat_id']
    except Exception as e:
        error_msg = 'Error while getting chat_id from database: ' + str(e)
        raise Exception(error_msg)
    
    try:
        chat_hist = rag.chat_history(chat_id)
        return json({"chat_id": chat_id, "chat_history": chat_hist, 'error': ''})
    except Exception as e:
        error_msg = 'Error while getting chat history from RAG: ' + str(e)
        raise Exception(error_msg)
     
@app.post("/api/query")
async def rag_query(request):
    resp = ResponseStream(rag.query(request.json.get("query"), request.json.get("chat_id"), "eu", collection=request.json.get("collection")))

    response = await request.respond(content_type="text/plain")
    for token in resp:
        await response.send(str(token))
        await asyncio.sleep(0)
    await response.eof()

    return response
        

# ------------------------------------------------------------------
# NOTAK
# ------------------------------------------------------------------
@app.get("/api/notak")
async def get_notak(request):
    print("Received request to /api/notak:", str(request))
    results = db.get_notak()
    return json(results)

@app.get("/api/nota")
async def get_nota(request):
    print("Received request to /api/nota:", str(request))
    id = request.args.get("id")

    results = db.get_nota(id)
    return json(results)

# ------------------------------------------------------------------
# MAIN
# ------------------------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True, workers=1)
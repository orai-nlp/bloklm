import logging
import db
import asyncio
import os
from concurrent.futures import ThreadPoolExecutor
from pydantic import BaseModel
from typing import List

from sanic import Sanic, json
from sanic.exceptions import BadRequest
from sanic_cors import CORS
from sanic.worker.manager import WorkerManager
from sanic_ext import Extend, validate

from backend.config import DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
from backend.blok_app.document_parser_backend import extract_text_from_document
import backend.blok_app.tasks as tasks
import backend.blok_app.customization_config as custom
from backend.blok_app.customization_config import CustomizationConfig

from rag.core.factory import load_rag_instance
from rag.core.response_stream import ResponseStream
from rag.entity.document import Document

from backend.blok_app.llm_factory import build_hf_llm

WorkerManager.THRESHOLD = 1800  # 3 min

app = Sanic("backend")
Extend(app)
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

# Shared asyncio queue: avoid concurrent tasks of note/podcast generation
task_queue = asyncio.Queue()
# Thread pool for blocking tasks
executor = ThreadPoolExecutor(max_workers=1)  # 1 to serialize tasks

# Worker coroutine: runs tasks (notes/podcasts) from the queue one by one
async def worker():
    loop = asyncio.get_running_loop()
    while True:
        func, args = await task_queue.get()
        try:
            # Run the blocking function in a thread
            await loop.run_in_executor(executor, func, *args)
        finally:
            task_queue.task_done()

@app.listener("before_server_start")
async def setup_rag(app, loop):
    global rag, persistence
    rag, persistence = None, None
    #rag, persistence = load_rag_instance(RAG_INSTANCE)

@app.listener("before_server_start")
async def start_worker(app, _):
    asyncio.create_task(worker())

# Load local LLM

LLM_DEVICE="cuda:2"
LLM_MODEL_ID = "HiTZ/Latxa-Llama-3.1-8B-Instruct"

from langchain_huggingface import HuggingFacePipeline

class CustomHuggingFacePipeline(HuggingFacePipeline):
    def get_token_ids(self, text: str) -> list[int]:
        return self.pipeline.tokenizer.encode(text)
    
@app.listener("before_server_start")
async def load_hf_llm(app, _):
    global llm
    hf_llm = build_hf_llm(LLM_MODEL_ID, device=LLM_DEVICE)
    llm = CustomHuggingFacePipeline(pipeline=hf_llm)

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
# OHARRAK
# ------------------------------------------------------------------

# Motak: laburpena, eskema, glosarioa, kronograma, FAQ, Kontzeptu-mapa

class BasicResourceModel(BaseModel):
    collection_id: int
    file_ids: List[int]

class SummaryModel(BasicResourceModel):
    formality: custom.Formality
    style: custom.Style
    detail: custom.Detail
    language_complexity: custom.LanguageComplexity

class FAQModel(BasicResourceModel):
    detail: custom.Detail
    language_complexity: custom.LanguageComplexity

class GlossaryModel(BasicResourceModel):
    detail: custom.Detail
    language_complexity: custom.LanguageComplexity

class OutlineModel(BasicResourceModel):
    detail: custom.Detail

class ChronogramModel(BasicResourceModel):
    detail: custom.Detail

class MindMapModel(BasicResourceModel):
    detail: custom.Detail

class PodcastModel(BasicResourceModel):
    formality: custom.Formality
    style: custom.Style
    detail: custom.Detail
    language_complexity: custom.LanguageComplexity
    podcast_type: custom.PodcastType

@app.get("/api/notes")
async def get_notes(request):
    results = db.get_notes()
    return json(results)

@app.get("/api/note")
async def get_note(request):
    id = request.args.get("id")
    results = db.get_note(id)
    return json(results)

@app.post("/api/summary")
@validate(json=SummaryModel)
async def create_summary(request, body: SummaryModel):
    await task_queue.put((tasks.generate_summary_task, (llm, db, body.collection_id, body.file_ids, CustomizationConfig.from_sanic_body(body))))
    return json({}, status=202)

@app.post("/api/faq")
@validate(json=FAQModel)
async def create_faq(request, body: FAQModel):
    await task_queue.put((tasks.generate_faq_task, (llm, db, body.collection_id, body.file_ids, CustomizationConfig.from_sanic_body(body))))
    return json({}, status=202)

@app.post("/api/outline")
@validate(json=OutlineModel)
async def create_outline(request, body: OutlineModel):
    await task_queue.put((tasks.generate_outline_task, (llm, db, body.collection_id, body.file_ids, CustomizationConfig.from_sanic_body(body))))
    return json({}, status=202)

@app.post("/api/mindmap")
@validate(json=MindMapModel)
async def create_mind_map(request, body: MindMapModel):
    await task_queue.put((tasks.generate_mind_map_task, (llm, db, body.collection_id, body.file_ids, CustomizationConfig.from_sanic_body(body))))
    return json({}, status=202)

@app.post("/api/glossary")
@validate(json=GlossaryModel)
async def create_glossary(request, body: GlossaryModel):
    await task_queue.put((tasks.generate_glossary_task, (llm, db, body.collection_id, body.file_ids, CustomizationConfig.from_sanic_body(body))))
    return json({}, status=202)

@app.post("/api/chronogram")
@validate(json=ChronogramModel)
async def create_chronogram(request, body: ChronogramModel):
    await task_queue.put((tasks.generate_chronogram_task, (llm, db, body.collection_id, body.file_ids, CustomizationConfig.from_sanic_body(body))))
    return json({}, status=202)

# ------------------------------------------------------------------
# PODCAST
# ------------------------------------------------------------------

@app.post("/api/podcast")
@validate(json=PodcastModel)
async def create_podcast(request, body: PodcastModel):
    await task_queue.put((tasks.generate_podcast_task, (llm, db, body.collection_id, body.file_ids, CustomizationConfig.from_sanic_body(body))))
    return json({}, status=202)

# ------------------------------------------------------------------
# MAIN
# ------------------------------------------------------------------
if __name__ == "__main__" and not os.environ.get("PYCHARM_HOSTED") and "DEBUGPY" not in os.environ:
    app.run(host="0.0.0.0", port=8002, debug=True, workers=1)
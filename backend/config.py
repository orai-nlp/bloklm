import os
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]

load_dotenv(BASE_DIR / ".env")

# Backend port (Sanic server)
PORT = os.getenv("PORT", "8000")

# Database (PostgreSQL) parameters
DATABASE = {
    "name": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
}

# LLM model used for RAG and note generation (summaries, outlines, podcast scripts...)
LLM = {
    "MODEL_ID": os.getenv("LLM_ID"),
    "DEVICE": int(os.getenv("LLM_DEVICE", "-1")),
}

# RAG parameters
RAG = {
    "VECTORIZER_ID": os.getenv("VECTORIZER_ID", "beademiguelperez/sentence-transformers-multilingual-e5-small"),
    "RERANKER_ID": os.getenv("RERANKER_ID", "cross-encoder/mmarco-mMiniLMv2-L12-H384-v1"),
    "DEVICE": int(os.getenv("RAG_DEVICE", "-1")),
}

# ASR parameters
ASR = {
    "EU": os.getenv("ASR_EU"),
    "ES": os.getenv("ASR_ES"),
    "LANG_ID": os.getenv("ASR_LANG_ID", "speechbrain/lang-id-voxlingua107-ecapa"),
    "DEVICE": int(os.getenv("ASR_DEVICE", "-1")),
}

# TTS parameters
TTS = {
    "PATH": os.getenv("TTS_PATH"),
    "AUDIO_PATH": os.getenv("AUDIO_PATH"),
}

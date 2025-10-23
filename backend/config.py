import os
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]

load_dotenv(BASE_DIR / ".env")

DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT")
BACKEND_PORT = os.getenv("BACKEND_PORT")
MODEL_ID = os.getenv("MODEL_ID", "")
TTS_PATH = os.getenv("TTS_PATH")
AUDIO_PATH = os.getenv("AUDIO_PATH")
ASR_EU_PATH = os.getenv("ASR_EU_PATH")
ASR_ES_PATH = os.getenv("ASR_ES_PATH")
ASR_DEVICE = os.getenv("ASR_DEVICE", "cpu")
VECTORIZER_DEVICE = os.getenv("VECTORIZER_DEVICE", "cpu")
VECTORIZER_MODEL_ID = os.getenv("VECTORIZER_MODEL_ID", "beademiguelperez/sentence-transformers-multilingual-e5-small")

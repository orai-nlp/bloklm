# Introduction

BlokLM is a smart Basque and Spanish tool that helps users organize, understand, and summarize documents. Acting as a virtual assistant, it generates Q&As, summaries, FAQs, concept maps, and podcasts, making it ideal for students, researchers, and communication or education professionals.

This is a demo application designed to showcase the underlying technology — including LLMs, ASR, and TTS models — built as part of the [ILENIA](https://proyectoilenia.es) project.

# Setup

- Clone the project:
  ```bash
  $ git clone git@github.com:zbeloki/bloklm.git
  $ cd bloklm
  ```

- Download the required models:
  - [projecte-aina/stt_ca-es_conformer_transducer_large](https://huggingface.co/projecte-aina/stt_ca-es_conformer_transducer_large/resolve/main/stt_ca-es_conformer_transducer_large.nemo?download=true)
  - [HiTZ/stt_eu_conformer_transducer_large](https://huggingface.co/HiTZ/stt_eu_conformer_transducer_large/resolve/main/stt_eu_conformer_transducer_large.nemo?download=true)
  - AhoTTS: ?
- Create the configuration file:
```bash
# Path: {PROJECT_ROOT}/.env
# Note: replace values like ${DB_NAME} with your actual values

# Service's host and port
API_HOST=localhost
PORT=8000

# Postgres parameters
DB_NAME={DB_NAME}
DB_USER={DB_USER}
DB_PASSWORD={DB_PWD}
DB_HOST=localhost
DB_PORT=5432

# LLM-related parameters
LLM_ID=HiTZ/Latxa-Llama-3.1-70B-Instruct
LLM_MAX_TOKENS=65536
LLM_DEVICE=0

# RAG-related parameters
VECTORIZER_ID=beademiguelperez/sentence-transformers-multilingual-e5-small
RERANKING_ID=cross-encoder/mmarco-mMiniLMv2-L12-H384-v1
RAG_DEVICE=0

# ASR-related parameters (paths of the .nemo files downloaded in the previous step)
ASR_EU={ASR_EU_PATH}
ASR_ES={ASR_ES_PATH}
ASR_DEVICE=0

# TTS-related parameters (audio files will be created into "/full/path/to/audios")
TTS_PATH={AHOTTS_PATH}
AUDIO_PATH=/full/path/to/audios
```

- Add the project's root dir to PYTHONPATH \
  ```bash
  $ export PYTHONPATH=.
  ```

- Create virtual environment
  ```bash
  $ virtualenv -p python3 venv
  ```

- Install requirements
  ```bash
  $ pip install backend/requirements.txt
  ```

- Install PostgreSQL

- Create a new database (suggested name: bloklm)
  ```bash
  $ psql (set your -U and -d arguments)
  > CREATE DATABASE bloklm;  
  ```

- Create database structure
  ```bash
  $ python3 backend/db_utils/create_tables.py
  ```

- Setup and run frontend
  ```bash
  $ cd frontend/
  $ npm install
  $ npm start
  ```

- Run backend service
  ```bash
  $ python3 backend/blok_app/app.py
  ```

**NOTE**: This platform has been only tested by running Latxa-70B on HuggingFace's Inference Endpoints platform. Environment variables HF_TOKEN and OPENAI_API_BASE must be set before running the backend service in order to access the LLM through that platform.

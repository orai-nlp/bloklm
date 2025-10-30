from backend.config import LLM

from langchain_openai.chat_models import ChatOpenAI
from langchain_huggingface import ChatHuggingFace, HuggingFacePipeline
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
import torch

import os
import logging
from typing import List, Dict
from pydantic import Field

logger = logging.getLogger(__name__)

TEMPERATURE = 0.7
MAX_OUTPUT_TOKENS = 8192

def load_llm():
    if "OPENAI_API_KEY" not in os.environ:
        logger.info("Loading local Huggingface LLM model")
        return load_hf_local_llm()
    elif "HF_TOKEN" in os.environ:
        logger.info("Loading Huggingface Inference API LLM model")
        return load_hf_inference_endpoint_llm()
    else: # OPENAI_API_KEY defined but HF_TOKEN not defined
        logger.info("Loading OpenAI LLM model")
        return load_openai_llm()

def load_openai_llm():
    if "OPENAI_API_KEY" not in os.environ:
        raise ValueError("OPENAI_API_KEY environment variable not set for OpenAI LLM")
    return ChatOpenAI(
        model_name=LLM["MODEL_ID"],
        temperature=TEMPERATURE,
        max_tokens=MAX_OUTPUT_TOKENS,
        openai_api_key=os.getenv("OPENAI_API_KEY"),
    )

def load_hf_inference_endpoint_llm():
    # It uses ChatOpenAI wrapper for HuggingFace Inference API
    if "HF_TOKEN" not in os.environ:
        raise ValueError("HF_TOKEN environment variable not set for HuggingFace Inference API")
    if "OPENAI_API_BASE" not in os.environ:
        raise ValueError("OPENAI_API_BASE environment variable not set for HuggingFace Inference API")
    return ChatOpenAI(
        model_name=LLM["MODEL_ID"],
        temperature=TEMPERATURE,
        max_tokens=MAX_OUTPUT_TOKENS,
        openai_api_key=os.getenv("HF_TOKEN"),
        openai_api_base=os.getenv("OPENAI_API_BASE"),
    )

def load_hf_local_llm():
    llm = HuggingFacePipeline.from_model_id(
        model_id=LLM["MODEL_ID"],
        task="text-generation",
        device=LLM["DEVICE"],
        model_kwargs=dict(
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        ),
        pipeline_kwargs=dict(
            max_length=128000,
            max_new_tokens=MAX_OUTPUT_TOKENS,
            do_sample=False,
            temperature=TEMPERATURE,
            repeat_penalty=1.1,
            return_full_text=False,
        ),
    )
    return ChatHuggingFace(llm=llm)

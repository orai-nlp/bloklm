from backend.config import LLM

from langchain_openai.chat_models import ChatOpenAI
from langchain_huggingface import ChatHuggingFace
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
    tokenizer = AutoTokenizer.from_pretrained(LLM["MODEL_ID"])
    model = AutoModelForCausalLM.from_pretrained(
        LLM["MODEL_ID"],
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
    )
    pipe = pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer,
        max_new_tokens=MAX_OUTPUT_TOKENS,
        temperature=TEMPERATURE,
        return_full_text=False,
        device=LLM["DEVICE"],
    )
    return ChatHuggingFace(pipe)


class HuggingFaceChat:
    def __init__(self, hf_pipeline, system_prompt=""):
        self.hf_pipeline = hf_pipeline
        self.system_prompt = system_prompt

    def format_messages(self, messages):
        formatted = []
        if self.system_prompt:
            formatted.append(f"System: {self.system_prompt}")
        for m in messages:
            formatted.append(f"{m.type.capitalize()}: {m.content}")
        formatted.append("Assistant:")
        return "\n".join(formatted)

    def invoke(self, messages):
        prompt = self.format_messages(messages)
        output = self.hf_pipeline(prompt)
        if isinstance(output, list):
            return output[0]["generated_text"].strip()
        return output.strip()

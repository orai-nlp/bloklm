from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
import torch

def build_hf_llm(
    model_id: str,
    device: str = "auto",
    quantization: str | None = None,
    max_new_tokens: int = 512,
    temperature: float = 0.7,
    top_p: float = 0.9,
):
    """
    Factory for creating HuggingFace LLM pipelines.
    
    Args:
        model_id: HuggingFace model hub ID (e.g. "HiTZ/Latxa-Llama-3.1-8B-Instruct")
        device: "auto", "cpu", or "cuda"
        quantization: None | "4bit" | "8bit"
        max_new_tokens: Maximum tokens in generation
        temperature: Sampling temperature
        top_p: Top-p nucleus sampling
    """
    kwargs = {"device_map": device}
    if quantization == "4bit":
        kwargs["load_in_4bit"] = True
    elif quantization == "8bit":
        kwargs["load_in_8bit"] = True
    
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        **kwargs
    )
    
    pipe = pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer,
        max_new_tokens=max_new_tokens,
        temperature=temperature,
        top_p=top_p,
        return_full_text=False,
    )
    return pipe
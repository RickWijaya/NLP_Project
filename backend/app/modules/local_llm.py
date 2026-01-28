"""
Local LLM module for running language models locally.
Uses Hugging Face transformers for CPU-based inference.
"""

import gc
from typing import List, Dict
from threading import Lock

from app.utils.logger import logger

# Available local models - lightweight models suitable for CPU
AVAILABLE_LOCAL_MODELS = {
    "tinyllama": {
        "name": "TinyLlama-1.1B",
        "model_id": "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
        "description": "Lightweight 1.1B model, good for simple Q&A",
        "size_gb": 2.2,
    },
    "phi2": {
        "name": "Phi-2",
        "model_id": "microsoft/phi-2",
        "description": "Microsoft's 2.7B model with strong reasoning",
        "size_gb": 5.5,
    },
    "qwen2": {
        "name": "Qwen2-1.5B",
        "model_id": "Qwen/Qwen2-1.5B-Instruct",
        "description": "Alibaba's 1.5B instruction-tuned model",
        "size_gb": 3.1,
    },
    "stablelm": {
        "name": "StableLM-2-1.6B",
        "model_id": "stabilityai/stablelm-2-zephyr-1_6b",
        "description": "Stability AI's 1.6B chat model",
        "size_gb": 3.3,
    },
}


class LocalLLMGenerator:
    """Local LLM generator using Hugging Face transformers."""
    
    def __init__(self):
        self._models = {}
        self._tokenizers = {}
        self._lock = Lock()
        self._transformers_available = False
        
        try:
            import transformers
            import torch
            self._transformers_available = True
            logger.info("Transformers library available for local LLM")
        except ImportError:
            logger.warning("Transformers not installed. Local LLM disabled.")
    
    @property
    def is_available(self) -> bool:
        return self._transformers_available
    
    def get_available_models(self) -> Dict:
        return AVAILABLE_LOCAL_MODELS
    
    def get_downloaded_models(self) -> List[str]:
        """Get list of downloaded model keys."""
        downloaded = []
        for key in AVAILABLE_LOCAL_MODELS:
            if self.is_model_downloaded(key):
                downloaded.append(key)
        return downloaded
    
    def is_model_downloaded(self, model_key: str) -> bool:
        if model_key not in AVAILABLE_LOCAL_MODELS:
            return False
        try:
            from transformers import AutoTokenizer
            model_id = AVAILABLE_LOCAL_MODELS[model_key]["model_id"]
            AutoTokenizer.from_pretrained(model_id, local_files_only=True)
            return True
        except Exception:
            return False
    
    def download_model(self, model_key: str) -> bool:
        if not self._transformers_available:
            return False
        
        if model_key not in AVAILABLE_LOCAL_MODELS:
            return False
        
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer
            
            model_id = AVAILABLE_LOCAL_MODELS[model_key]["model_id"]
            logger.info(f"Downloading model: {model_id}")
            
            AutoTokenizer.from_pretrained(model_id)
            AutoModelForCausalLM.from_pretrained(
                model_id,
                torch_dtype="auto",
                low_cpu_mem_usage=True
            )
            
            logger.info(f"Model {model_key} downloaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to download model {model_key}: {e}")
            return False
    
    def load_model(self, model_key: str):
        if not self._transformers_available:
            raise RuntimeError("Transformers not available")
        
        if model_key not in AVAILABLE_LOCAL_MODELS:
            raise ValueError(f"Unknown model: {model_key}")
        
        with self._lock:
            if model_key in self._models:
                return
            
            from transformers import AutoModelForCausalLM, AutoTokenizer
            import torch
            
            model_id = AVAILABLE_LOCAL_MODELS[model_key]["model_id"]
            logger.info(f"Loading model: {model_id}")
            
            tokenizer = AutoTokenizer.from_pretrained(model_id)
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token
            
            model = AutoModelForCausalLM.from_pretrained(
                model_id,
                torch_dtype=torch.float32,
                low_cpu_mem_usage=True,
                device_map="cpu"
            )
            model.eval()
            
            self._models[model_key] = model
            self._tokenizers[model_key] = tokenizer
            logger.info(f"Model {model_key} loaded")
    
    def unload_model(self, model_key: str):
        with self._lock:
            if model_key in self._models:
                del self._models[model_key]
                del self._tokenizers[model_key]
                gc.collect()
                logger.info(f"Model {model_key} unloaded")
    
    def generate(
        self,
        model_key: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_new_tokens: int = 512,
        top_p: float = 0.9,
        top_k: int = 50,
        repetition_penalty: float = 1.1,
        **kwargs
    ) -> str:
        if not self._transformers_available:
            raise RuntimeError("Transformers not available")
        
        if model_key not in self._models:
            self.load_model(model_key)
        
        model = self._models[model_key]
        tokenizer = self._tokenizers[model_key]
        
        import torch
        
        prompt = self._format_messages(model_key, messages, tokenizer)
        inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=2048)
        
        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                attention_mask=inputs.attention_mask,
                max_new_tokens=max_new_tokens,
                temperature=max(temperature, 0.01),
                top_p=top_p,
                top_k=top_k,
                repetition_penalty=repetition_penalty,
                do_sample=temperature > 0,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )
        
        response = tokenizer.decode(
            outputs[0][inputs.input_ids.shape[1]:],
            skip_special_tokens=True
        )
        
        return response.strip()
    
    def _format_messages(self, model_key: str, messages: List[Dict[str, str]], tokenizer) -> str:
        """Format messages into prompt. Uses tokenizer's chat template if available."""
        try:
            # Try using the tokenizer's built-in chat template
            return tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        except Exception:
            pass
        
        # Fallback to simple format
        prompt = ""
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            if role == "system":
                prompt += f"System: {content}\n\n"
            elif role == "user":
                prompt += f"User: {content}\n\n"
            elif role == "assistant":
                prompt += f"Assistant: {content}\n\n"
        
        prompt += "Assistant:"
        return prompt


# Global instance
local_llm_generator = LocalLLMGenerator()

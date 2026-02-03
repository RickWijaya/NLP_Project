"""
LLM integration module using Groq API.
Generates responses using llama-3.3-70b-versatile.
"""

from typing import List, Dict, Optional, AsyncGenerator
import time

from groq import Groq

from app.config import get_settings
from app.utils.logger import logger

settings = get_settings()


class LLMGenerator:
    """
    Groq LLM integration for response generation.
    
    Uses llama-3.3-70b-versatile with low temperature for factual,
    consistent customer service responses.
    """
    
    def __init__(
        self,
        api_key: str = None,
        model: str = None,
        temperature: float = None,
        max_tokens: int = None
    ):
        """
        Initialize the LLM generator.
        
        Args:
            api_key: Groq API key
            model: Model name to use
            temperature: Sampling temperature
            max_tokens: Maximum response tokens
        """
        self.api_key = api_key or settings.groq_api_key
        self.model = model or settings.llm_model
        self.temperature = temperature if temperature is not None else settings.llm_temperature
        self.max_tokens = max_tokens or settings.llm_max_tokens
        
        # Initialize Groq client
        self._client = Groq(api_key=self.api_key)
        
        logger.info(f"LLM Generator initialized with model: {self.model}")
    
    def generate(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        temperature: float = None,
        max_tokens: int = None
    ) -> Dict:
        """
        Generate a response from the LLM.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Optional model override
            temperature: Optional override for temperature
            max_tokens: Optional override for max tokens
            
        Returns:
            Dictionary with 'content', 'model', 'usage', and 'processing_time_ms'
        """
        active_model = model or self.model
        temp = temperature if temperature is not None else self.temperature
        tokens = max_tokens or self.max_tokens
        
        start_time = time.time()
        
        try:
            response = self._client.chat.completions.create(
                model=active_model,
                messages=messages,
                temperature=temp,
                max_tokens=tokens,
                top_p=0.95,
                stream=False
            )
            
            end_time = time.time()
            processing_time = (end_time - start_time) * 1000  # Convert to ms
            
            content = response.choices[0].message.content
            
            logger.info(
                f"LLM response generated in {processing_time:.2f}ms "
                f"(tokens: {response.usage.total_tokens})"
            )
            
            return {
                "content": content,
                "model": active_model,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                },
                "processing_time_ms": processing_time
            }
            
        except Exception as e:
            logger.error(f"LLM generation failed: {str(e)}")
            raise
    
    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = None,
        max_tokens: int = None
    ) -> AsyncGenerator[str, None]:
        """
        Generate a streaming response from the LLM.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Optional override for temperature
            max_tokens: Optional override for max tokens
            
        Yields:
            String chunks of the response
        """
        temp = temperature if temperature is not None else self.temperature
        tokens = max_tokens or self.max_tokens
        
        try:
            stream = self._client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temp,
                max_tokens=tokens,
                top_p=0.95,
                stream=True
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.error(f"LLM streaming failed: {str(e)}")
            raise


# Global instance
llm_generator = LLMGenerator()

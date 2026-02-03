"""
Configuration management using Pydantic Settings.
Loads environment variables from .env file.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    database_url: str = "postgresql+asyncpg://postgres:123456@localhost:5432/rag_service"
    
    # JWT Configuration
    jwt_secret: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 60
    
    # Groq API
    groq_api_key: str = "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"
    
    # Tavily API
    tavily_api_key: str = "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"
    
    # Embedding Model
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    
    # Storage Paths
    chroma_persist_dir: str = "./chroma_db"
    upload_dir: str = "./uploads"
    
    # Server
    port: int = 8000
    debug: bool = True
    
    # Chunking Configuration
    chunk_size: int = 300  # tokens (300-500 range)
    chunk_overlap: int = 50  # tokens (50-100 range)
    
    # Retrieval Configuration
    top_k: int = 5  # Number of chunks to retrieve
    relevance_threshold: float = 0.1  # Minimum similarity score
    use_query_expansion: bool = True
    expansion_count: int = 3
    
    # LLM Configuration
    llm_model: str = "llama-3.3-70b-versatile"
    llm_temperature: float = 0.1  # Low for factual responses
    llm_max_tokens: int = 1024
    top_p: float = 0.95  # Nucleus sampling parameter
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

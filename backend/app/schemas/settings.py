"""
Pydantic schemas for tenant settings.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class ModelTypeEnum(str, Enum):
    """Model type enumeration."""
    API = "api"
    LOCAL = "local"


class TenantSettingsBase(BaseModel):
    """Base schema for tenant settings."""
    # Model Selection
    model_type: ModelTypeEnum = ModelTypeEnum.API
    api_model: str = "llama-3.3-70b-versatile"
    local_model: str = "tinyllama"
    
    # Generation Parameters
    temperature: float = Field(0.7, ge=0.0, le=2.0)
    max_new_tokens: int = Field(512, ge=64, le=4096)
    top_p: float = Field(0.9, ge=0.0, le=1.0)
    top_k: int = Field(50, ge=1, le=100)
    min_p: float = Field(0.0, ge=0.0, le=1.0)
    repetition_penalty: float = Field(1.1, ge=1.0, le=2.0)
    
    # Prompt Customization
    system_prompt: Optional[str] = None
    no_context_prompt: Optional[str] = None
    
    # Retrieval Settings
    top_k_chunks: int = Field(5, ge=1, le=20)
    relevance_threshold: float = Field(0.1, ge=0.0, le=1.0)


class TenantSettingsUpdate(BaseModel):
    """Schema for updating tenant settings. All fields optional for partial updates."""
    # Model Selection
    model_type: Optional[ModelTypeEnum] = None
    api_model: Optional[str] = None
    local_model: Optional[str] = None
    
    # Generation Parameters
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_new_tokens: Optional[int] = Field(None, ge=64, le=4096)
    top_p: Optional[float] = Field(None, ge=0.0, le=1.0)
    top_k: Optional[int] = Field(None, ge=1, le=100)
    min_p: Optional[float] = Field(None, ge=0.0, le=1.0)
    repetition_penalty: Optional[float] = Field(None, ge=1.0, le=2.0)
    
    # Prompt Customization
    system_prompt: Optional[str] = None
    no_context_prompt: Optional[str] = None
    
    # Retrieval Settings
    top_k_chunks: Optional[int] = Field(None, ge=1, le=20)
    relevance_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)


class TenantSettingsResponse(TenantSettingsBase):
    """Schema for tenant settings response."""
    tenant_id: str
    
    class Config:
        from_attributes = True


class AvailableModel(BaseModel):
    """Schema for available model info."""
    key: str
    name: str
    description: str
    size_gb: Optional[float] = None
    is_downloaded: bool = False


class AvailableModelsResponse(BaseModel):
    """Schema for available models response."""
    api_models: List[AvailableModel]
    local_models: List[AvailableModel]
    local_llm_available: bool


class ModelDownloadRequest(BaseModel):
    """Schema for model download request."""
    model_key: str

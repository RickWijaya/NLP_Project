"""
Pydantic schemas for chat/query requests and responses.
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Schema for chat query request (authenticated)."""
    question: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None  # Optional session for history
    top_k: Optional[int] = Field(default=5, ge=1, le=20)
    use_hybrid_search: bool = False


class PublicChatRequest(BaseModel):
    """Schema for public chat query (unauthenticated)."""
    question: str = Field(..., min_length=1, max_length=2000)
    tenant_id: str = Field(..., min_length=1)
    session_id: Optional[str] = None  # Optional session for history
    user_identifier: Optional[str] = None  # Optional user tracking (IP, cookie, etc.)


class RetrievedChunk(BaseModel):
    """Schema for a retrieved document chunk."""
    content: str
    document_id: str
    document_version: int
    source_filename: str
    chunk_index: int
    relevance_score: float
    page_label: Optional[str] = "1"


class ChatResponse(BaseModel):
    """Schema for chat response."""
    answer: str
    session_id: str  # Session ID for continuing conversation
    retrieved_chunks: List[RetrievedChunk]
    model_used: str
    processing_time_ms: float
    suggestions: List[str] = []


class ChatStreamResponse(BaseModel):
    """Schema for streaming chat response chunk."""
    content: str
    is_final: bool = False
    session_id: Optional[str] = None
    retrieved_chunks: Optional[List[RetrievedChunk]] = None


# Chat Session Schemas

class ChatMessageSchema(BaseModel):
    """Schema for a chat message."""
    id: str
    role: str  # "user" or "assistant"
    content: str
    chunks_used: int = 0
    model_used: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ChatSessionSchema(BaseModel):
    """Schema for a chat session."""
    id: str
    tenant_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    
    class Config:
        from_attributes = True


class ChatSessionDetailSchema(ChatSessionSchema):
    """Schema for chat session with messages."""
    messages: List[ChatMessageSchema] = []


class ChatSessionListResponse(BaseModel):
    """Schema for list of chat sessions."""
    sessions: List[ChatSessionSchema]
    total: int


class CreateSessionRequest(BaseModel):
    """Schema for creating a new chat session."""
    tenant_id: str
    title: Optional[str] = "New Chat"
    user_identifier: Optional[str] = None


class UpdateSessionRequest(BaseModel):
    """Schema for updating a chat session."""
    title: str


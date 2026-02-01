"""
SQLAlchemy models for documents, admins, and processing logs.
"""

import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Enum, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class DocumentStatus(PyEnum):
    """Document processing status enum."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ModelType(PyEnum):
    """Model type enum for LLM selection."""
    API = "api"
    LOCAL = "local"


class Admin(Base):
    """Admin user model for authentication (business owner)."""
    __tablename__ = "admins"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    tenant_id = Column(String(100), unique=True, nullable=False, index=True)
    business_name = Column(String(255), nullable=True)  # Optional business name
    is_active = Column(Boolean, default=True)
    is_super_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    documents = relationship("Document", back_populates="uploaded_by_admin")
    
    def __repr__(self):
        return f"<Admin(username={self.username}, tenant_id={self.tenant_id})>"


class TenantSettings(Base):
    """Tenant-specific AI and model settings."""
    __tablename__ = "tenant_settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(100), unique=True, nullable=False, index=True)  # No FK to avoid migration issues
    
    # Model Selection (using String to avoid PostgreSQL enum migration issues)
    model_type = Column(String(20), default="api")  # "api" or "local"
    api_model = Column(String(100), default="llama-3.3-70b-versatile")
    local_model = Column(String(100), default="tinyllama")
    
    # Generation Parameters
    temperature = Column(Float, default=0.7)
    max_new_tokens = Column(Integer, default=512)
    top_p = Column(Float, default=0.9)
    top_k = Column(Integer, default=50)
    min_p = Column(Float, default=0.0)
    repetition_penalty = Column(Float, default=1.1)
    
    # Prompt Customization
    system_prompt = Column(Text, default="""You are a helpful AI assistant. Answer questions based on the provided context.
If the context doesn't contain relevant information, say so honestly.
Be concise and accurate in your responses.""")
    
    no_context_prompt = Column(Text, default="""I don't have specific information about that topic in my knowledge base.
Please try rephrasing your question or ask about something related to the documents I have access to.""")
    
    # Retrieval Settings
    top_k_chunks = Column(Integer, default=5)
    relevance_threshold = Column(Float, default=0.1)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<TenantSettings(tenant_id={self.tenant_id}, model_type={self.model_type})>"


class Document(Base):
    """Document model for storing uploaded document metadata."""
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(100), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)  # pdf, docx, txt, xlsx
    file_size = Column(Integer, nullable=False)
    file_path = Column(String(500), nullable=False)
    
    version = Column(Integer, default=1)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.PENDING)
    error_message = Column(Text, nullable=True)
    
    chunk_count = Column(Integer, default=0)
    
    uploaded_by_id = Column(UUID(as_uuid=True), ForeignKey("admins.id"), nullable=False)
    uploaded_by_admin = relationship("Admin", back_populates="documents")
    
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to processing logs
    processing_logs = relationship("ProcessingLog", back_populates="document", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Document(filename={self.filename}, status={self.status}, version={self.version})>"


class ProcessingLog(Base):
    """Processing log for tracking document ingestion steps."""
    __tablename__ = "processing_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    
    step = Column(String(100), nullable=False)  # extraction, preprocessing, chunking, embedding, storing
    status = Column(String(50), nullable=False)  # started, completed, failed
    message = Column(Text, nullable=True)
    
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    document = relationship("Document", back_populates="processing_logs")
    
    def __repr__(self):
        return f"<ProcessingLog(step={self.step}, status={self.status})>"


class ChatSession(Base):
    """Chat session for tracking conversations."""
    __tablename__ = "chat_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Optional user identifier (for tracking without auth)
    user_identifier = Column(String(255), nullable=True)  # Could be IP, session cookie, etc.
    
    title = Column(String(255), default="New Chat")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to messages
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")
    
    def __repr__(self):
        return f"<ChatSession(id={self.id}, tenant_id={self.tenant_id})>"


class ChatMessage(Base):
    """Individual chat message in a session."""
    __tablename__ = "chat_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id"), nullable=False)
    
    role = Column(String(20), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    
    # Metadata for RAG responses
    chunks_used = Column(Integer, default=0)  # Number of context chunks used
    model_used = Column(String(100), nullable=True)  # Which model generated this response
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    session = relationship("ChatSession", back_populates="messages")
    
    def __repr__(self):
        return f"<ChatMessage(role={self.role}, session_id={self.session_id})>"


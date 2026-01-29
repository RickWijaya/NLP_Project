"""
SQLAlchemy models for documents, admins, and processing logs.
"""

import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Enum, ForeignKey, Boolean, JSON
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
    is_super_admin = Column(Boolean, default=False)  # Super admin flag
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
    
    # Prompt Customization (empty = use defaults from app/modules/prompt.py)
    system_prompt = Column(Text, default="")
    no_context_prompt = Column(Text, default="")
    
    # Retrieval Settings
    top_k_chunks = Column(Integer, default=5)
    relevance_threshold = Column(Float, default=0.1)
    
    # Web Search Settings
    allow_web_search = Column(Boolean, default=True)  # Admin toggle
    
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


class User(Base):
    """Public user model for chat authentication (customers)."""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to chat sessions
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    
    # Composite unique constraint: email unique per tenant
    __table_args__ = (
        {"extend_existing": True},
    )
    
    def __repr__(self):
        return f"<User(email={self.email}, tenant_id={self.tenant_id})>"


class ChatSession(Base):
    """Chat session for tracking conversations."""
    __tablename__ = "chat_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(100), nullable=False, index=True)
    
    # Link to authenticated user (optional - null for anonymous)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    user = relationship("User", back_populates="chat_sessions")
    
    # Legacy field for anonymous tracking
    user_identifier = Column(String(255), nullable=True)
    
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
    
    # Source citations (JSON array of {doc_id, chunk_index, filename, excerpt})
    source_citations = Column(JSON, nullable=True)
    
    # Suggested follow-up questions (JSON array of strings)
    suggested_questions = Column(JSON, nullable=True)
    
    # User feedback (thumbs_up, thumbs_down, or null)
    feedback = Column(String(20), nullable=True)
    
    # Content moderation
    moderation_flagged = Column(Boolean, default=False)
    moderation_reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    attachments = relationship("ChatAttachment", back_populates="message", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ChatMessage(role={self.role}, session_id={self.session_id})>"


class AnalyticsEvent(Base):
    """Analytics event for tracking usage."""
    __tablename__ = "analytics_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(100), nullable=False, index=True)
    event_type = Column(String(50), nullable=False, index=True)  # chat, login, upload, etc.
    user_id = Column(UUID(as_uuid=True), nullable=True)  # Optional user reference
    event_data = Column(JSON, nullable=True)  # Additional event data (renamed from metadata)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f"<AnalyticsEvent(type={self.event_type}, tenant={self.tenant_id})>"


class ChatAttachment(Base):
    """File attachment in chat messages."""
    __tablename__ = "chat_attachments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("chat_messages.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)  # image, pdf, txt, etc.
    file_size = Column(Integer, nullable=False)  # bytes
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    message = relationship("ChatMessage", back_populates="attachments")
    
    def __repr__(self):
        return f"<ChatAttachment(filename={self.filename}, message_id={self.message_id})>"


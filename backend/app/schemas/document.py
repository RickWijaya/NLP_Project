"""
Pydantic schemas for document-related requests and responses.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field


class DocumentStatus(str, Enum):
    """Document processing status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentCreate(BaseModel):
    """Schema for document upload metadata."""
    tenant_id: Optional[str] = None  # Will be set from JWT if not provided


class DocumentUpdate(BaseModel):
    """Schema for document update."""
    pass  # File is updated via form upload


class DocumentResponse(BaseModel):
    """Schema for document response."""
    id: UUID
    tenant_id: str
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    version: int
    status: DocumentStatus
    error_message: Optional[str] = None
    chunk_count: int
    uploaded_by_id: UUID
    uploaded_at: datetime
    processed_at: Optional[datetime] = None
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """Schema for paginated document list."""
    documents: List[DocumentResponse]
    total: int
    page: int
    page_size: int


class ProcessingLogResponse(BaseModel):
    """Schema for processing log entry."""
    id: UUID
    step: str
    status: str
    message: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class DocumentDetailResponse(DocumentResponse):
    """Schema for document details with processing logs."""
    processing_logs: List[ProcessingLogResponse] = []

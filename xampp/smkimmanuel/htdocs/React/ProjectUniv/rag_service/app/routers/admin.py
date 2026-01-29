"""
Admin router for document management.
Handles document upload, update, delete, and status tracking.
"""

import os
import uuid
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.document import Document, Admin, DocumentStatus, ProcessingLog
from app.schemas.document import (
    DocumentResponse, 
    DocumentListResponse, 
    DocumentDetailResponse,
    ProcessingLogResponse
)
from app.auth.dependencies import get_current_admin
from app.config import get_settings
from app.utils.logger import logger, log_processing_step

# Import processing modules
from app.modules.extraction import text_extractor
from app.modules.preprocessing import text_preprocessor
from app.modules.chunking import text_chunker
from app.modules.embedding import embedding_generator
from app.modules.vector_store import vector_store

settings = get_settings()

router = APIRouter(prefix="/admin", tags=["Admin Document Management"])

# Supported file types
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".xlsx"}

# Ensure upload directory exists
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)


async def process_document(
    document_id: str,
    file_path: str,
    tenant_id: str,
    document_version: int,
    original_filename: str,
    db_url: str
):
    """
    Background task to process a document through the RAG pipeline.
    
    Steps:
    1. Text extraction
    2. Preprocessing
    3. Chunking
    4. Embedding generation
    5. Vector storage
    """
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    
    # Create new engine and session for background task
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        try:
            # Update status to processing
            result = await db.execute(
                select(Document).where(Document.id == document_id)
            )
            document = result.scalar_one()
            document.status = DocumentStatus.PROCESSING
            await db.commit()
            
            # Step 1: Text Extraction
            await _log_step(db, document_id, "extraction", "started")
            try:
                raw_text = text_extractor.extract(file_path, document_id)
                await _log_step(db, document_id, "extraction", "completed", f"Extracted {len(raw_text)} chars")
            except Exception as e:
                await _log_step(db, document_id, "extraction", "failed", str(e))
                raise
            
            # Step 2: Chunking (on RAW text to preserve sentence boundaries)
            # NOTE: Chunking happens BEFORE preprocessing to preserve sentence structure
            await _log_step(db, document_id, "chunking", "started")
            try:
                chunks = text_chunker.chunk(
                    raw_text,  # Use raw text, not preprocessed
                    document_id=document_id,
                    document_version=document_version,
                    source_filename=original_filename
                )
                await _log_step(db, document_id, "chunking", "completed", f"Created {len(chunks)} chunks")
            except Exception as e:
                await _log_step(db, document_id, "chunking", "failed", str(e))
                raise
            
            # Step 3: Preprocessing (on each chunk individually)
            await _log_step(db, document_id, "preprocessing", "started")
            try:
                for chunk in chunks:
                    chunk.content = text_preprocessor.preprocess(
                        chunk.content,
                        document_id=document_id,
                        apply_faq_normalization=True,
                        preserve_sentences=False  # Already chunked, no need to preserve
                    )
                await _log_step(db, document_id, "preprocessing", "completed", f"Preprocessed {len(chunks)} chunks")
            except Exception as e:
                await _log_step(db, document_id, "preprocessing", "failed", str(e))
                raise
            
            if not chunks:
                await _log_step(db, document_id, "processing", "completed", "No chunks generated (empty document)")
                document.status = DocumentStatus.COMPLETED
                document.chunk_count = 0
                document.processed_at = datetime.utcnow()
                await db.commit()
                return
            
            # Step 4: Embedding Generation
            await _log_step(db, document_id, "embedding", "started")
            try:
                chunk_texts = [chunk.content for chunk in chunks]
                embeddings = embedding_generator.embed(chunk_texts, document_id=document_id)
                await _log_step(db, document_id, "embedding", "completed", f"Generated {len(embeddings)} embeddings")
            except Exception as e:
                await _log_step(db, document_id, "embedding", "failed", str(e))
                raise
            
            # Step 5: Vector Storage
            await _log_step(db, document_id, "storing", "started")
            try:
                stored_count = vector_store.add_chunks(
                    tenant_id=tenant_id,
                    chunks=chunks,
                    embeddings=embeddings.tolist(),
                    document_id=document_id
                )
                await _log_step(db, document_id, "storing", "completed", f"Stored {stored_count} chunks")
            except Exception as e:
                await _log_step(db, document_id, "storing", "failed", str(e))
                raise
            
            # Update document status
            document.status = DocumentStatus.COMPLETED
            document.chunk_count = len(chunks)
            document.processed_at = datetime.utcnow()
            await db.commit()
            
            logger.info(f"Document {document_id} processed successfully")
            
        except Exception as e:
            logger.error(f"Document {document_id} processing failed: {str(e)}")
            
            # Update document status to failed
            result = await db.execute(
                select(Document).where(Document.id == document_id)
            )
            document = result.scalar_one_or_none()
            if document:
                document.status = DocumentStatus.FAILED
                document.error_message = str(e)
                await db.commit()
        
        finally:
            await engine.dispose()


async def _log_step(
    db: AsyncSession,
    document_id: str,
    step: str,
    status: str,
    message: str = ""
):
    """Log a processing step to the database."""
    log = ProcessingLog(
        document_id=document_id,
        step=step,
        status=status,
        message=message,
        completed_at=datetime.utcnow() if status in ["completed", "failed"] else None
    )
    db.add(log)
    await db.commit()


@router.post("/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """
    Upload a new document for processing.
    
    Supported formats: PDF, DOCX, TXT, XLSX
    
    The document will be processed in the background through:
    1. Text extraction
    2. Preprocessing
    3. Chunking
    4. Embedding generation
    5. Vector storage
    """
    # Validate file extension
    filename = file.filename
    file_ext = Path(filename).suffix.lower()
    
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_ext} not supported. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(settings.upload_dir, unique_filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Get file size
    file_size = os.path.getsize(file_path)
    
    # Create document record
    document = Document(
        tenant_id=admin.tenant_id,
        filename=unique_filename,
        original_filename=filename,
        file_type=file_ext[1:],  # Remove the dot
        file_size=file_size,
        file_path=file_path,
        uploaded_by_id=admin.id,
        status=DocumentStatus.PENDING
    )
    
    db.add(document)
    await db.commit()
    await db.refresh(document)
    
    # Start background processing
    background_tasks.add_task(
        process_document,
        str(document.id),
        file_path,
        admin.tenant_id,
        document.version,
        filename,
        settings.database_url
    )
    
    logger.info(f"Document {document.id} uploaded by {admin.username}, processing started")
    
    return document


@router.put("/documents/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """
    Update/replace an existing document.
    
    Creates a new version and re-processes the document.
    Old vectors are deleted before new ones are stored.
    """
    # Find existing document
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.tenant_id == admin.tenant_id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Validate file extension
    filename = file.filename
    file_ext = Path(filename).suffix.lower()
    
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_ext} not supported"
        )
    
    # Delete old vectors
    vector_store.delete_by_document(
        tenant_id=admin.tenant_id,
        document_id=str(document.id)
    )
    
    # Delete old file
    if os.path.exists(document.file_path):
        os.remove(document.file_path)
    
    # Save new file
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(settings.upload_dir, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update document record
    document.filename = unique_filename
    document.original_filename = filename
    document.file_type = file_ext[1:]
    document.file_size = os.path.getsize(file_path)
    document.file_path = file_path
    document.version += 1
    document.status = DocumentStatus.PENDING
    document.error_message = None
    document.chunk_count = 0
    document.processed_at = None
    
    await db.commit()
    await db.refresh(document)
    
    # Start background processing
    background_tasks.add_task(
        process_document,
        str(document.id),
        file_path,
        admin.tenant_id,
        document.version,
        filename,
        settings.database_url
    )
    
    logger.info(f"Document {document.id} updated to version {document.version}")
    
    return document


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """
    Delete a document and its associated vectors.
    """
    # Find document
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.tenant_id == admin.tenant_id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete vectors from ChromaDB
    try:
        vector_store.delete_by_document(
            tenant_id=admin.tenant_id,
            document_id=str(document.id)
        )
    except Exception as e:
        logger.error(f"Failed to delete vectors for document {document_id}: {str(e)}")
    
    # Delete file from disk
    if os.path.exists(document.file_path):
        os.remove(document.file_path)
    
    # Delete document record (cascades to processing logs)
    await db.delete(document)
    await db.commit()
    
    logger.info(f"Document {document_id} deleted by {admin.username}")


@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(
    page: int = 1,
    page_size: int = 20,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """
    List all documents for the admin's tenant.
    
    Supports pagination and status filtering.
    """
    # Build query
    query = select(Document).where(Document.tenant_id == admin.tenant_id)
    
    if status_filter:
        try:
            status_enum = DocumentStatus(status_filter)
            query = query.where(Document.status == status_enum)
        except ValueError:
            pass
    
    # Get total count
    count_query = select(func.count()).select_from(Document).where(
        Document.tenant_id == admin.tenant_id
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.order_by(Document.uploaded_at.desc()).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    documents = result.scalars().all()
    
    return DocumentListResponse(
        documents=documents,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/documents/{document_id}", response_model=DocumentDetailResponse)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """
    Get detailed information about a document including processing logs.
    """
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.tenant_id == admin.tenant_id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Get processing logs
    logs_result = await db.execute(
        select(ProcessingLog).where(
            ProcessingLog.document_id == document_id
        ).order_by(ProcessingLog.started_at)
    )
    logs = logs_result.scalars().all()
    
    return DocumentDetailResponse(
        **document.__dict__,
        processing_logs=logs
    )


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """
    Get statistics for the admin's tenant.
    """
    # Document counts by status
    status_counts = {}
    for status in DocumentStatus:
        count_result = await db.execute(
            select(func.count()).select_from(Document).where(
                Document.tenant_id == admin.tenant_id,
                Document.status == status
            )
        )
        status_counts[status.value] = count_result.scalar()
    
    # Total chunks
    chunks_result = await db.execute(
        select(func.sum(Document.chunk_count)).where(
            Document.tenant_id == admin.tenant_id
        )
    )
    total_chunks = chunks_result.scalar() or 0
    
    # Vector store stats
    try:
        vector_stats = vector_store.get_collection_stats(admin.tenant_id)
    except Exception:
        vector_stats = {"count": 0}
    
    return {
        "tenant_id": admin.tenant_id,
        "document_counts": status_counts,
        "total_chunks": total_chunks,
        "vector_store": vector_stats
    }


# ============================================================================
# Settings Management Endpoints
# ============================================================================

from app.models.document import TenantSettings
from app.schemas.settings import (
    TenantSettingsResponse,
    TenantSettingsUpdate,
    AvailableModelsResponse,
    AvailableModel,
    ModelDownloadRequest
)
from app.modules.local_llm import local_llm_generator, AVAILABLE_LOCAL_MODELS

# Available Groq API models
AVAILABLE_API_MODELS = [
    {"key": "llama-3.3-70b-versatile", "name": "Llama 3.3 70B", "description": "Most capable model"},
    {"key": "llama-3.1-8b-instant", "name": "Llama 3.1 8B", "description": "Fast and efficient"},
    {"key": "llama-3.2-3b-preview", "name": "Llama 3.2 3B", "description": "Lightweight model"},
    {"key": "mixtral-8x7b-32768", "name": "Mixtral 8x7B", "description": "Mixture of experts"},
    {"key": "gemma2-9b-it", "name": "Gemma 2 9B", "description": "Google's Gemma model"},
]


@router.get("/settings", response_model=TenantSettingsResponse)
async def get_tenant_settings(
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """Get AI settings for the current tenant."""
    result = await db.execute(
        select(TenantSettings).where(TenantSettings.tenant_id == admin.tenant_id)
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        # Create default settings
        settings = TenantSettings(tenant_id=admin.tenant_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    
    return settings


@router.put("/settings", response_model=TenantSettingsResponse)
async def update_tenant_settings(
    settings_update: TenantSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """Update AI settings for the current tenant."""
    result = await db.execute(
        select(TenantSettings).where(TenantSettings.tenant_id == admin.tenant_id)
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = TenantSettings(tenant_id=admin.tenant_id)
        db.add(settings)
    
    # Update fields
    update_data = settings_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(settings, key, value)
    
    await db.commit()
    await db.refresh(settings)
    
    logger.info(f"Settings updated for tenant {admin.tenant_id}")
    return settings


@router.get("/available-models", response_model=AvailableModelsResponse)
async def get_available_models(
    admin: Admin = Depends(get_current_admin)
):
    """Get list of available API and local models."""
    # API models
    api_models = [
        AvailableModel(
            key=m["key"],
            name=m["name"],
            description=m["description"],
            is_downloaded=True  # API models are always available
        )
        for m in AVAILABLE_API_MODELS
    ]
    
    # Local models
    local_models = [
        AvailableModel(
            key=key,
            name=info["name"],
            description=info["description"],
            size_gb=info["size_gb"],
            is_downloaded=local_llm_generator.is_model_downloaded(key)
        )
        for key, info in AVAILABLE_LOCAL_MODELS.items()
    ]
    
    return AvailableModelsResponse(
        api_models=api_models,
        local_models=local_models,
        local_llm_available=local_llm_generator.is_available
    )


@router.post("/models/download")
async def download_local_model(
    request: ModelDownloadRequest,
    background_tasks: BackgroundTasks,
    admin: Admin = Depends(get_current_admin)
):
    """Download a local model (runs in background)."""
    if not local_llm_generator.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Local LLM not available. Install transformers and torch."
        )
    
    if request.model_key not in AVAILABLE_LOCAL_MODELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown model: {request.model_key}"
        )
    
    if local_llm_generator.is_model_downloaded(request.model_key):
        return {"status": "already_downloaded", "model": request.model_key}
    
    # Download in background
    background_tasks.add_task(local_llm_generator.download_model, request.model_key)
    
    logger.info(f"Model download started: {request.model_key}")
    return {"status": "downloading", "model": request.model_key}


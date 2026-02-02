"""
Chat router for RAG query handling.
Handles user queries and returns AI-generated responses.
Supports public chat with tenant isolation and chat history.
"""

import time
import uuid
from typing import Optional, List

import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pathlib import Path

from app.database import get_db
from app.models.document import TenantSettings, ChatSession, ChatMessage, Admin
from app.schemas.chat import (
    ChatRequest, 
    ChatResponse, 
    RetrievedChunk,
    PublicChatRequest,
    ChatSessionSchema,
    ChatSessionDetailSchema,
    ChatSessionListResponse,
    ChatMessageSchema,
    CreateSessionRequest,
    UpdateSessionRequest
)
from app.modules.retrieval import retriever
from app.modules.prompt import prompt_assembler
from app.modules.llm import llm_generator
from app.modules.local_llm import local_llm_generator
from app.modules.suggestions import generate_suggestions
from app.utils.logger import logger
from app.auth.dependencies import get_current_admin
from app.config import get_settings

settings = get_settings()
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".xlsx"}

router = APIRouter(prefix="/chat", tags=["Chat"])


async def get_tenant_settings_db(tenant_id: str, db: AsyncSession) -> TenantSettings:
    """Get tenant settings from database, create defaults if not exist."""
    result = await db.execute(
        select(TenantSettings).where(TenantSettings.tenant_id == tenant_id)
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        # Check if tenant exists first
        admin_result = await db.execute(
            select(Admin).where(Admin.tenant_id == tenant_id)
        )
        admin = admin_result.scalar_one_or_none()
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant not found: {tenant_id}"
            )
        
        # Create default settings
        settings = TenantSettings(tenant_id=tenant_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    
    return settings


async def generate_response(
    question: str,
    tenant_id: str,
    settings: TenantSettings,
    top_k: int = 5,
    use_hybrid: bool = False,
    conversation_history: List[dict] = None
) -> tuple:
    """Generate a response using tenant's model settings."""
    
    # Step 1: Retrieve relevant chunks using tenant settings
    retrieved = retriever.retrieve(
        query=question,
        tenant_id=tenant_id,
        top_k=settings.top_k_chunks,
        use_hybrid=use_hybrid,
        relevance_threshold=settings.relevance_threshold
    )
    
    # Step 2: Assemble prompt with custom prompts
    prompt = prompt_assembler.assemble(
        query=question,
        retrieved_chunks=retrieved,
        system_prompt=settings.system_prompt,
        no_context_prompt=settings.no_context_prompt,
        conversation_history=conversation_history
    )
    
    # Step 3: Generate using appropriate model
    if settings.model_type == "local":
        # Use local model
        if not local_llm_generator.is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Local LLM not available"
            )
        
        messages = prompt_assembler.format_for_groq(prompt)  # Same format works
        response_text = local_llm_generator.generate(
            model_key=settings.local_model,
            messages=messages,
            temperature=settings.temperature,
            max_new_tokens=settings.max_new_tokens,
            top_p=settings.top_p,
            top_k=settings.top_k,
            repetition_penalty=settings.repetition_penalty
        )
        model_used = f"local:{settings.local_model}"
        
    else:
        # Use API model (Groq)
        messages = prompt_assembler.format_for_groq(prompt)
        llm_response = llm_generator.generate(
            messages,
            model=settings.api_model,
            temperature=settings.temperature,
            max_tokens=settings.max_new_tokens
        )
        response_text = llm_response["content"]
        model_used = llm_response["model"]
    
    return response_text, retrieved, model_used


async def generate_session_title(question: str, answer: str) -> str:
    """Generate a short, descriptive title for a chat session."""
    try:
        prompt = f"""Based on this first interaction, generate a very short title (max 4 words) for the conversation.
User: "{question}"
AI: "{answer[:200]}..."

Title:"""
        response = llm_generator.generate(
            messages=[
                {"role": "system", "content": "You are a concise title generator. Output ONLY the title."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=20
        )
        title = response["content"].strip().strip('"').strip("'")
        return title[:50]  # Limit length
    except Exception as e:
        logger.error(f"Failed to generate title: {e}")
        return question[:30] + "..." if len(question) > 30 else question


# ============================================================================
# Public Chat Endpoints (No Auth Required)
# ============================================================================

@router.post("/public", response_model=ChatResponse)
async def public_chat(
    request: PublicChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Public chat endpoint - no authentication required.
    Uses tenant_id to determine which documents and settings to use.
    """
    start_time = time.time()
    
    logger.info(f"Public chat for tenant {request.tenant_id}: {request.question[:50]}...")
    
    try:
        # Get tenant settings
        settings = await get_tenant_settings_db(request.tenant_id, db)
        
        # Get or create session
        session_id = request.session_id
        conversation_history = []
        
        if session_id:
            # Load existing session and history
            result = await db.execute(
                select(ChatSession).where(
                    ChatSession.id == session_id,
                    ChatSession.tenant_id == request.tenant_id
                )
            )
            session = result.scalar_one_or_none()
            
            if session:
                # Load conversation history
                msgs_result = await db.execute(
                    select(ChatMessage)
                    .where(ChatMessage.session_id == session_id)
                    .order_by(ChatMessage.created_at)
                    .limit(10)  # Last 10 messages for context
                )
                messages = msgs_result.scalars().all()
                conversation_history = [
                    {"role": m.role, "content": m.content}
                    for m in messages
                ]
        else:
            # Create new session
            session = ChatSession(
                tenant_id=request.tenant_id,
                user_identifier=request.user_identifier,
                title=request.question[:50] + "..." if len(request.question) > 50 else request.question
            )
            db.add(session)
            await db.commit()
            await db.refresh(session)
            session_id = str(session.id)
        
        # Generate response
        response_text, retrieved, model_used = await generate_response(
            question=request.question,
            tenant_id=request.tenant_id,
            settings=settings,
            use_hybrid=False,
            conversation_history=conversation_history
        )
        
        # Save messages to session
        user_msg = ChatMessage(
            session_id=session.id,
            role="user",
            content=request.question
        )
        assistant_msg = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=response_text,
            chunks_used=len(retrieved),
            model_used=model_used
        )
        db.add(user_msg)
        db.add(assistant_msg)
        
        # Auto-rename session if it has default title
        if session.title == "New Conversation" or session.title == "New Chat":
            new_title = await generate_session_title(request.question, response_text)
            session.title = new_title
            
        await db.commit()
        
        # Calculate processing time
        total_time = (time.time() - start_time) * 1000
        
        chunks_response = [
            RetrievedChunk(
                content=chunk.content[:500] + "..." if len(chunk.content) > 500 else chunk.content,
                document_id=chunk.document_id,
                document_version=chunk.document_version,
                source_filename=chunk.source_filename,
                chunk_index=chunk.chunk_index,
                relevance_score=round(chunk.relevance_score, 4),
                page_label=chunk.page_label
            )
            for chunk in retrieved
        ]
        
        # Step 4: Generate suggested follow-up questions
        suggestions = generate_suggestions(
            question=request.question,
            answer=response_text,
            context_snippets=[c.content for c in retrieved] if retrieved else []
        )
        
        return ChatResponse(
            answer=response_text,
            session_id=session_id,
            retrieved_chunks=chunks_response,
            model_used=model_used,
            processing_time_ms=round(total_time, 2),
            suggestions=suggestions
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Public chat error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate response: {str(e)}"
        )


@router.post("/upload")
async def public_upload_document(
    tenant_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Public upload endpoint for the chat page.
    Allows users to add documents to a bot's knowledge base.
    """
    from app.models.document import Document, DocumentStatus, Admin
    from app.routers.admin import process_document
    
    # Validate file extension
    filename = file.filename
    file_ext = Path(filename).suffix.lower()
    
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_ext} not supported. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Ensure tenant exists and find an admin to attribute this to
    admin_result = await db.execute(
        select(Admin).where(Admin.tenant_id == tenant_id)
    )
    admin = admin_result.scalar_one_or_none()
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant not found: {tenant_id}"
        )
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(settings.upload_dir, unique_filename)
    
    # Ensure upload directory exists
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Create document record
    document = Document(
        tenant_id=tenant_id,
        filename=unique_filename,
        original_filename=filename,
        file_type=file_ext[1:],
        file_size=os.path.getsize(file_path),
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
        tenant_id,
        document.version,
        filename,
        settings.database_url
    )
    
    logger.info(f"Public upload: Document {document.id} uploaded for tenant {tenant_id}")
    
    return {
        "id": str(document.id),
        "filename": filename,
        "status": "processing",
        "message": "File uploaded and processing started"
    }


@router.get("/view-doc/{document_id}")
async def view_document(
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Proxy endpoint to view a document by ID, mapping it to the UUID filename on disk."""
    from app.models.document import Document
    
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    file_path = document.file_path
    if not os.path.exists(file_path):
        logger.error(f"File not found on disk: {file_path}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk"
        )
        
    return FileResponse(
        path=file_path,
        media_type="application/pdf" if document.file_type == "pdf" else "application/octet-stream"
    )


# ============================================================================
# Session Management Endpoints
# ============================================================================

@router.get("/sessions", response_model=ChatSessionListResponse)
async def list_sessions(
    tenant_id: str,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """List chat sessions for a tenant."""
    # Count total
    count_result = await db.execute(
        select(func.count()).select_from(ChatSession).where(
            ChatSession.tenant_id == tenant_id
        )
    )
    total = count_result.scalar()
    
    # Get sessions with message count
    offset = (page - 1) * page_size
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.tenant_id == tenant_id)
        .order_by(ChatSession.updated_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    sessions = result.scalars().all()
    
    # Add message counts
    session_schemas = []
    for session in sessions:
        msg_count_result = await db.execute(
            select(func.count()).select_from(ChatMessage).where(
                ChatMessage.session_id == session.id
            )
        )
        msg_count = msg_count_result.scalar()
        
        session_schemas.append(ChatSessionSchema(
            id=str(session.id),
            tenant_id=session.tenant_id,
            title=session.title,
            created_at=session.created_at,
            updated_at=session.updated_at,
            message_count=msg_count
        ))
    
    return ChatSessionListResponse(sessions=session_schemas, total=total)


@router.get("/sessions/{session_id}", response_model=ChatSessionDetailSchema)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a chat session with all messages."""
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get messages
    msgs_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    messages = msgs_result.scalars().all()
    
    return ChatSessionDetailSchema(
        id=str(session.id),
        tenant_id=session.tenant_id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=len(messages),
        messages=[
            ChatMessageSchema(
                id=str(m.id),
                role=m.role,
                content=m.content,
                chunks_used=m.chunks_used or 0,
                model_used=m.model_used,
                created_at=m.created_at
            )
            for m in messages
        ]
    )


@router.post("/sessions", response_model=ChatSessionSchema)
async def create_session(
    request: CreateSessionRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new chat session."""
    session = ChatSession(
        tenant_id=request.tenant_id,
        title=request.title,
        user_identifier=request.user_identifier
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    return ChatSessionSchema(
        id=str(session.id),
        tenant_id=session.tenant_id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=0
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a chat session and all its messages."""
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    await db.delete(session)
    await db.commit()


# ============================================================================
# Health Check
# ============================================================================

@router.get("/health")
async def health_check():
    """Health check endpoint for the chat service."""
    return {
        "status": "healthy",
        "service": "RAG Chat",
        "api_model": llm_generator.model,
        "local_llm_available": local_llm_generator.is_available
    }

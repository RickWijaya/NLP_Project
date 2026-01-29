"""
Chat router for RAG query handling.
Handles user queries and returns AI-generated responses.
Supports public chat with tenant isolation and chat history.
"""

import time
import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.document import TenantSettings, ChatSession, ChatMessage, Admin
from app.schemas.chat import (
    ChatRequest, 
    ChatResponse, 
    RetrievedChunk,
    SourceCitation,
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
from app.modules.moderation import check_content
from app.modules.suggestions import generate_suggestions
from app.utils.logger import logger
from app.auth.dependencies import get_current_admin

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
    conversation_history: List[dict] = None,
    enable_web_search: bool = False
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
    
    # Step 1.5: Web search if enabled and allowed by admin
    web_results = []
    if enable_web_search and getattr(settings, 'allow_web_search', True):
        from app.modules.web_search import web_searcher
        web_results = await web_searcher.search_async(question, max_results=5)
    
    # Step 2: Assemble prompt with custom prompts (use prompt.py defaults if empty)
    # Only pass custom prompts if they're non-empty; otherwise let prompt.py use its defaults
    custom_system_prompt = settings.system_prompt.strip() if settings.system_prompt else None
    custom_no_context_prompt = settings.no_context_prompt.strip() if settings.no_context_prompt else None
    
    prompt = prompt_assembler.assemble(
        query=question,
        retrieved_chunks=retrieved,
        system_prompt=custom_system_prompt or None,  # Pass None if empty to use prompt.py defaults
        no_context_prompt=custom_no_context_prompt or None,
        conversation_history=conversation_history,
        web_results=web_results
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
    
    return response_text, retrieved, model_used, web_results


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
        
        # Check content moderation on user input
        moderation_flagged = False
        moderation_reason = None
        is_flagged, flag_reason = check_content(request.question, request.tenant_id)
        if is_flagged:
            moderation_flagged = True
            moderation_reason = flag_reason
            response_text = "I'm sorry, but I can't respond to that type of message. Please rephrase your question."
            retrieved = []
            model_used = "moderation"
            web_results = []
        else:
            # Generate response
            response_text, retrieved, model_used, web_results = await generate_response(
                question=request.question,
                tenant_id=request.tenant_id,
                settings=settings,
                use_hybrid=False,
                conversation_history=conversation_history,
                enable_web_search=request.enable_web_search
            )
        
        # Build source citations from retrieved chunks
        source_citations = [
            SourceCitation(
                document_id=chunk.document_id,
                chunk_index=chunk.chunk_index,
                filename=chunk.source_filename,
                excerpt=chunk.content[:150] + "..." if len(chunk.content) > 150 else chunk.content
            )
            for chunk in retrieved[:5]  # Limit to top 5 sources
        ] if retrieved else None
        
        # Generate suggested follow-up questions
        context_snippets = [chunk.content for chunk in retrieved[:3]] if retrieved else None
        suggested_questions = generate_suggestions(
            question=request.question,
            answer=response_text,
            context_snippets=context_snippets
        ) if not moderation_flagged else None
        
        # Save messages to session with enhanced metadata
        user_msg = ChatMessage(
            session_id=session.id,
            role="user",
            content=request.question,
            moderation_flagged=moderation_flagged,
            moderation_reason=moderation_reason
        )
        assistant_msg = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=response_text,
            chunks_used=len(retrieved),
            model_used=model_used,
            source_citations=[c.model_dump() for c in source_citations] if source_citations else None,
            suggested_questions=suggested_questions
        )
        db.add(user_msg)
        db.add(assistant_msg)
        await db.commit()
        
        # Calculate processing time
        total_time = (time.time() - start_time) * 1000
        
        # Format response
        chunks_response = [
            RetrievedChunk(
                content=chunk.content[:500] + "..." if len(chunk.content) > 500 else chunk.content,
                document_id=chunk.document_id,
                document_version=chunk.document_version,
                source_filename=chunk.source_filename,
                chunk_index=chunk.chunk_index,
                relevance_score=round(chunk.relevance_score, 4)
            )
            for chunk in retrieved
        ]
        
        return ChatResponse(
            answer=response_text,
            session_id=session_id,
            retrieved_chunks=chunks_response,
            model_used=model_used,
            processing_time_ms=round(total_time, 2),
            source_citations=source_citations,
            suggested_questions=suggested_questions,
            moderation_flagged=moderation_flagged
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Public chat error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate response: {str(e)}"
        )


@router.post("/public/stream")
async def public_chat_stream(
    request: PublicChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Streaming chat endpoint - returns Server-Sent Events.
    Real-time token delivery for better UX.
    """
    import json
    
    logger.info(f"Streaming chat for tenant {request.tenant_id}: {request.question[:50]}...")
    
    async def generate():
        try:
            # Get tenant settings
            settings = await get_tenant_settings_db(request.tenant_id, db)
            
            # Check moderation
            is_flagged, flag_reason = check_content(request.question, request.tenant_id)
            if is_flagged:
                moderation_msg = "I'm sorry, but I can't respond to that type of message."
                yield f"data: {json.dumps({'content': moderation_msg, 'done': True})}\n\n"
                return
            
            # Retrieve context
            top_k = settings.top_k_chunks or 5
            retrieved = retriever.retrieve(
                query=request.question,
                tenant_id=request.tenant_id,
                top_k=top_k,
                threshold=settings.relevance_threshold or 0.1
            )
            
            # Assemble prompt
            prompt = prompt_assembler.assemble(
                query=request.question,
                retrieved_chunks=retrieved
            )
            messages = prompt_assembler.format_for_groq(prompt)
            
            # Stream response
            full_response = ""
            async for chunk in llm_generator.generate_stream(
                messages,
                temperature=settings.temperature,
                max_tokens=settings.max_new_tokens
            ):
                full_response += chunk
                yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"
            
            # Send citations and suggestions with final message
            source_citations = [
                {
                    "document_id": c.document_id,
                    "filename": c.source_filename,
                    "excerpt": c.content[:100]
                }
                for c in retrieved[:5]
            ] if retrieved else []
            
            suggestions = generate_suggestions(
                question=request.question,
                answer=full_response,
                context_snippets=[c.content for c in retrieved[:3]] if retrieved else None
            )
            
            yield f"data: {json.dumps({'content': '', 'done': True, 'citations': source_citations, 'suggestions': suggestions})}\n\n"
            
        except Exception as e:
            logger.error(f"Streaming error: {str(e)}")
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
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

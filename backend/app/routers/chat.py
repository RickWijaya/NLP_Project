"""
Chat router for RAG query handling.
Handles user queries and returns AI-generated responses.
Supports public chat with tenant isolation and chat history.
"""

import time
import uuid
from typing import Optional, List
from pydantic import BaseModel

import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pathlib import Path

from app.database import get_db
from app.models.document import TenantSettings, ChatSession, ChatMessage, Admin, QARule
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
from app.auth.dependencies import get_current_admin, get_current_user, get_optional_current_user
from app.models.user import User
from app.config import get_settings
from app.modules.intelligence import intelligence  # Import Intelligence
from app.modules.web_search import web_search
import json

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
    conversation_history: List[dict] = None,
    context_summary: Optional[str] = None
) -> tuple:
    """Generate a response using tenant's model settings."""
    
    # Step 1: Retrieve relevant chunks using tenant settings
    retrieved = await retriever.retrieve(
        query=question,
        tenant_id=tenant_id,
        top_k=settings.top_k_chunks,
        use_hybrid=settings.use_hybrid,
        hybrid_alpha=settings.hybrid_alpha,
        relevance_threshold=settings.relevance_threshold
    )
    
    # Step 2: Assemble prompt with custom prompts
    prompt = prompt_assembler.assemble(
        query=question,
        retrieved_chunks=retrieved,
        system_prompt=settings.system_prompt,
        no_context_prompt=settings.no_context_prompt,
        conversation_history=conversation_history,
        context_summary=context_summary
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
        llm_response = await llm_generator.generate(
            messages,
            model=settings.api_model,
            temperature=settings.temperature,
            max_tokens=settings.max_new_tokens,
            top_p=settings.top_p
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
        response = await llm_generator.generate(
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

@router.get("/tenants")
async def list_public_tenants(
    db: AsyncSession = Depends(get_db)
):
    """
    List all active tenants (public endpoint for chat page).
    Returns tenant_id and business_name for each active admin.
    """
    result = await db.execute(
        select(Admin).where(Admin.is_active == True).order_by(Admin.created_at.desc())
    )
    admins = result.scalars().all()
    
    tenants = [
        {
            "tenant_id": admin.tenant_id,
            "business_name": admin.business_name or admin.tenant_id,
        }
        for admin in admins
        if not admin.is_super_admin  # Exclude super admin from public list
    ]
    
    return {"tenants": tenants}


@router.post("/public/stream")
async def public_chat_stream(
    request: PublicChatRequest,
    user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Public chat endpoint with streaming support and optional web search.
    Returns Server-Sent Events (SSE).
    """
    start_time = time.time()
    user_identifier = str(user.id) if user else request.user_identifier
    logger.info(f"Stream chat for tenant {request.tenant_id}: {request.question[:50]}")

    # 0. Check for Rule-Based Override
    # We do case-insensitive substring match for now or exact match based on rule
    # Fetch active rules for this tenant
    rules_query = select(QARule).where(
        QARule.tenant_id == request.tenant_id,
        QARule.is_active == True
    )
    rules_result = await db.execute(rules_query)
    active_rules = rules_result.scalars().all()
    
    matched_rule_answer = None
    for rule in active_rules:
        if rule.match_type == "exact":
            if rule.trigger_text.lower().strip() == request.question.lower().strip():
                matched_rule_answer = rule.answer_text
                break
        elif rule.match_type == "contains":
            if rule.trigger_text.lower().strip() in request.question.lower().strip():
                matched_rule_answer = rule.answer_text
                break
    
    # If rule matched, we still need session setup to log it, but we skip RAG/LLM


    # 1. Setup Session & Settings
    settings = await get_tenant_settings_db(request.tenant_id, db)
    session_id = request.session_id
    conversation_history = []
    session = None

    if session_id:
        query = select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.tenant_id == request.tenant_id
        )
        result = await db.execute(query)
        session = result.scalar_one_or_none()
        if session and session.user_identifier != user_identifier:
             raise HTTPException(status_code=403, detail="Session access denied")
        
        if session:
            msgs_result = await db.execute(
                select(ChatMessage).where(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.created_at).limit(20)
            )
            messages = msgs_result.scalars().all()
            conversation_history = [{"role": m.role, "content": m.content} for m in messages if m.content]
    else:
        session = ChatSession(
            tenant_id=request.tenant_id,
            user_identifier=user_identifier,
            title=request.question[:50]
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        session_id = str(session.id)

    if matched_rule_answer:
        logger.info(f"Rule matched for query: {request.question}")
        # Save messages
        db.add(ChatMessage(session_id=session.id, role="user", content=request.question, intent="RULE_MATCH"))
        db.add(ChatMessage(session_id=session.id, role="assistant", content=matched_rule_answer, model_used="rule_based"))
        await db.commit()
        
        async def rule_stream():
            # simulate typing effect slightly or just dump it
            yield f"data: {json.dumps({'content': matched_rule_answer, 'is_final': False})}\n\n"
            yield f"data: {json.dumps({'content': '', 'is_final': True, 'session_id': session_id, 'suggestions': []})}\n\n"
            
        return StreamingResponse(rule_stream(), media_type="text/event-stream")

    # 2. Intelligence Layer
    intents = await intelligence.classify_intent(request.question, conversation_history)
    primary_intent = intents[0] if intents else "OTHER"
    
    if "CLOSING" in intents:
        summary = await intelligence.generate_conversation_summary(conversation_history + [{"role": "user", "content": request.question}])
        # Save messages
        db.add(ChatMessage(session_id=session.id, role="user", content=request.question, intent="CLOSING"))
        db.add(ChatMessage(session_id=session.id, role="assistant", content=summary, model_used="intelligence:summary"))
        await db.commit()
        
        async def closing_stream():
            yield f"data: {json.dumps({'content': summary, 'is_final': True, 'session_id': session_id})}\n\n"
        return StreamingResponse(closing_stream(), media_type="text/event-stream")

    new_context = await intelligence.extract_context(request.question, conversation_history, session.context_summary)
    session.context_summary = new_context
    # We commit context update later with the message
    
    # 3. Web Search (Optional)
    web_context = ""
    search_results = []
    if request.web_search:
        logger.info("Performing web search...")
        search_results = await web_search.search(request.question)
        web_context = web_search.format_for_context(search_results)
    
    # 4. RAG Retrieval
    retrieved = await retriever.retrieve(
        query=request.question,
        tenant_id=request.tenant_id,
        top_k=settings.top_k_chunks,
        use_hybrid=settings.use_hybrid,
        hybrid_alpha=settings.hybrid_alpha,
        relevance_threshold=settings.relevance_threshold
    )
    
    # 5. Assemble Prompt (Inject Web Context if exists)
    final_context_summary = session.context_summary

    prompt = prompt_assembler.assemble(
        query=request.question,
        retrieved_chunks=retrieved,
        system_prompt=settings.system_prompt,
        no_context_prompt=settings.no_context_prompt,
        conversation_history=conversation_history,
        context_summary=final_context_summary,
        web_context=web_context if request.web_search and web_context else None
    )
    
    # 6. Stream Generation
    async def response_generator():
        full_response = ""
        
        # Determine which model to use based on settings
        if settings.model_type == "local":
            model_used = f"local:{settings.local_model}"
        else:
            model_used = settings.api_model
        
        # Yield initial retrieved chunks meta (optional, or send at end)
        # We'll send chunks at the end or begin? Let's send a setup event first or just send chunks at end.
        
        messages = prompt_assembler.format_for_groq(prompt)
        
        try:
            if settings.model_type == "local":
                # Use local model (non-streaming fallback for now)
                if not local_llm_generator.is_available:
                    yield f"data: {json.dumps({'content': 'Error: Local LLM not available', 'is_final': True})}\n\n"
                    return
                
                # Local models generate synchronously - simulate streaming by yielding in chunks
                full_response = local_llm_generator.generate(
                    model_key=settings.local_model,
                    messages=messages,
                    temperature=settings.temperature,
                    max_new_tokens=settings.max_new_tokens,
                    top_p=settings.top_p,
                    top_k=settings.top_k,
                    repetition_penalty=settings.repetition_penalty
                )
                # Yield the full response as a single chunk (or split into words for "streaming" effect)
                words = full_response.split(' ')
                for i, word in enumerate(words):
                    chunk = word + (' ' if i < len(words) - 1 else '')
                    yield f"data: {json.dumps({'content': chunk, 'is_final': False})}\n\n"
            else:
                # Use API model (Groq) with streaming
                stream = llm_generator.generate_stream(
                    messages, 
                    temperature=settings.temperature,
                    max_tokens=settings.max_new_tokens,
                    top_p=settings.top_p
                )
                
                async for chunk in stream:
                    full_response += chunk
                    yield f"data: {json.dumps({'content': chunk, 'is_final': False})}\n\n"
            
            # 7. Post-generation: Save to DB
            chunks_data = []
            
            # Start with Web Results (if any)
            if request.web_search and search_results:
                for res in search_results:
                    chunks_data.append(
                        RetrievedChunk(
                            content=res.get("body", "")[:200],
                            document_id=f"web:{res.get('href')}",
                            document_version=0,
                            source_filename=res.get("title", "Web Result"),
                            chunk_index=0,
                            relevance_score=1.0,
                            page_label="Web"
                        ).model_dump()
                    )
            
            # Append Document Results
            chunks_data.extend([
                RetrievedChunk(
                    content=c.content[:200], 
                    document_id=c.document_id,
                    document_version=c.document_version,
                    source_filename=c.source_filename,
                    chunk_index=c.chunk_index,
                    relevance_score=c.relevance_score,
                    page_label=c.page_label
                ).model_dump() for c in retrieved
            ])
            
            # Save User Message
            db.add(ChatMessage(session_id=session.id, role="user", content=request.question, intent=primary_intent))
            # Save Assistant Message
            db_msg = ChatMessage(session_id=session.id, role="assistant", content=full_response, chunks_used=len(retrieved), model_used=model_used)
            db.add(db_msg)
            
            # Update Title if needed
            if session.title in ["New Conversation", "New Chat"]:
                session.title = request.question[:50]
                
            await db.commit()
            
            # Yield final data
            suggestions = await generate_suggestions(request.question, full_response, [c.content for c in retrieved] if retrieved else [])
            final_payload = {
                "content": "",
                "is_final": True,
                "session_id": session_id,
                "assistant_message_id": str(db_msg.id) if 'db_msg' in locals() else None, # We need to capture the msg object
                "retrieved_chunks": chunks_data,
                "suggestions": suggestions
            }
            yield f"data: {json.dumps(final_payload)}\n\n"
            
        except Exception as e:
            logger.error(f"Streaming failed: {e}")
            yield f"data: {json.dumps({'content': f' Error: {str(e)}', 'is_final': True})}\n\n"

    return StreamingResponse(response_generator(), media_type="text/event-stream")


@router.post("/public")
async def public_chat(
    request: PublicChatRequest,
    user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Public chat endpoint (Standard).
    Returns JSON response.
    """
    start_time = time.time()
    
    # Determine user identifier
    user_identifier = str(user.id) if user else request.user_identifier
    
    logger.info(f"Public chat for tenant {request.tenant_id}: {request.question[:50]}...")
    
    try:
        # Get tenant settings
        settings = await get_tenant_settings_db(request.tenant_id, db)
        
        # Get or create session
        session_id = request.session_id
        conversation_history = []
        
        if session_id:
            # Load existing session and history
            # IMPORTANT: Security check - ensure session belongs to user (if user_identifier matches)
            query = select(ChatSession).where(
                ChatSession.id == session_id,
                ChatSession.tenant_id == request.tenant_id
            )
            
            result = await db.execute(query)
            session = result.scalar_one_or_none()
            
            # Check ownership if found
            if session and session.user_identifier != user_identifier:
                 raise HTTPException(status_code=403, detail="Session access denied")

            if session:
                # Load conversation history
                msgs_result = await db.execute(
                    select(ChatMessage)
                    .where(ChatMessage.session_id == session_id)
                    .order_by(ChatMessage.created_at)
                    .limit(20)  # Increase limit for better context
                )
                messages = msgs_result.scalars().all()
                conversation_history = [
                    {"role": m.role, "content": m.content}
                    for m in messages
                    if m.content # Ensure content is not null
                ]
        else:
            # Create new session
            session = ChatSession(
                tenant_id=request.tenant_id,
                user_identifier=user_identifier,
                title=request.question[:50] + "..." if len(request.question) > 50 else request.question
            )
            db.add(session)
            await db.commit()
            await db.refresh(session)
            session_id = str(session.id)
            
        # --- INTELLIGENCE LAYER ---
        
        # 1. Classify Intent
        intents = await intelligence.classify_intent(request.question, conversation_history)
        primary_intent = intents[0] if intents else "OTHER"
        logger.info(f"Detected Intent: {primary_intent} for Query: {request.question[:30]}")
        
        # 2. Handle Closing Intent (Auto-Summarize)
        if "CLOSING" in intents:
            summary = await intelligence.generate_conversation_summary(conversation_history + [{"role": "user", "content": request.question}])
            
            # Save final user message
            user_msg = ChatMessage(
                session_id=session.id,
                role="user",
                content=request.question,
                intent="CLOSING"
            )
            # Save summary as assistant message
            assistant_msg = ChatMessage(
                session_id=session.id,
                role="assistant",
                content=summary,
                model_used="intelligence:summary"
            )
            db.add(user_msg)
            db.add(assistant_msg)
            await db.commit()
            
            return ChatResponse(
                answer=summary,
                session_id=session_id,
                retrieved_chunks=[],
                model_used="intelligence:summary",
                processing_time_ms=round((time.time() - start_time) * 1000, 2),
                suggestions=[]
            )

        # 3. Update Context
        new_context = await intelligence.extract_context(
            request.question, 
            conversation_history, 
            session.context_summary
        )
        session.context_summary = new_context
        # Save context update immediately roughly, or wait for commit later
        
        # --- RAG GENERATION ---
        
        # Generate response
        response_text, retrieved, model_used = await generate_response(
            question=request.question,
            tenant_id=request.tenant_id,
            settings=settings,
            use_hybrid=settings.use_hybrid,
            conversation_history=conversation_history,
            context_summary=session.context_summary  # Pass detected context
        )
        # NOTE: generate_response needs update to pass context_summary, 
        # but for now we rely on prompt_assembler update if we pass it here.
        # Check generate_response signature! It doesn't accept context_summary yet.
        # We need to update generate_response signature or just pass it in conversation_history hack?
        # Better: Update generate_response signature.
        
        # Let's fix generate_response call below.
        # For now, I will modify generate_response signature in a subsequent step or rely on prompt_assembler modification if accessible.
        # Wait, I can't change generate_response signature easily without changing it above.
        # I should change generate_response to accept **kwargs or explicit context_summary.
        
        # Let's pivot: check generate_response definition.
        # It calls prompt_assembler.assemble.
        # I need to update generate_response to take context_summary.
        
        # Save messages to session
        user_msg = ChatMessage(
            session_id=session.id,
            role="user",
            content=request.question,
            intent=primary_intent
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
        suggestions = await generate_suggestions(
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
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List chat sessions for a tenant (filtered by authenticated user)."""
    # Count total
    count_result = await db.execute(
        select(func.count()).select_from(ChatSession).where(
            ChatSession.tenant_id == tenant_id,
            ChatSession.user_identifier == str(user.id)
        )
    )
    total = count_result.scalar()
    
    # Get sessions with message count
    offset = (page - 1) * page_size
    result = await db.execute(
        select(ChatSession)
        .where(
            ChatSession.tenant_id == tenant_id,
            ChatSession.user_identifier == str(user.id)
        )
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
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a chat session with all messages (owner only)."""
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_identifier == str(user.id)
        )
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
    user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new chat session (authenticated or guest)."""
    # Determine user identifier
    user_identifier = str(user.id) if user else request.user_identifier
    
    session = ChatSession(
        tenant_id=request.tenant_id,
        title=request.title,
        user_identifier=user_identifier
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
    user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a chat session (owner only, or by session ID for guests)."""
    query = select(ChatSession).where(ChatSession.id == session_id)
    
    # If user is authenticated, verify ownership
    if user:
        query = query.where(ChatSession.user_identifier == str(user.id))
    
    result = await db.execute(query)
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    await db.delete(session)
    await db.commit()


# ============================================================================
# Feedback
# ============================================================================

class FeedbackRequest(BaseModel):
    rating: int  # 1 or -1
    feedback_text: Optional[str] = None

@router.put("/messages/{message_id}/feedback")
async def submit_feedback(
    message_id: str,
    feedback: FeedbackRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Submit user feedback (thumbs up/down) for a specific assistant message.
    """
    # 1. Find the message
    result = await db.execute(select(ChatMessage).where(ChatMessage.id == message_id))
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
        
    # 2. Update feedback
    message.rating = feedback.rating
    if feedback.feedback_text:
        message.feedback_text = feedback.feedback_text
        
    await db.commit()
    
    return {"status": "success", "message_id": message_id, "rating": feedback.rating}

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

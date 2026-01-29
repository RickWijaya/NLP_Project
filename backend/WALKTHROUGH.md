# Multi-Tenant RAG System Walkthrough

## Overview
This document provides a comprehensive walkthrough of the Multi-Tenant RAG System implementation, which supports:
- **Tenant Isolation**: Each business has its own documents, settings, and chat history
- **Local LLM Support**: Option to use local models (TinyLlama, Phi-2, Qwen2) or API (Groq)
- **Custom AI Settings**: Per-tenant model selection, parameters, and prompts
- **Chat History**: Session-based conversation management
- **Public Chat**: No-auth endpoint for end-user access

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        RAG Service                               │
├─────────────────────────────────────────────────────────────────┤
│  Public API              │  Admin API (Authenticated)           │
│  - POST /chat/public     │  - GET/PUT /admin/settings           │
│  - GET /chat/sessions    │  - POST /admin/documents             │
│                          │  - GET /admin/available-models       │
├─────────────────────────────────────────────────────────────────┤
│                    Core Modules                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │Retrieval │  │  Prompt  │  │   LLM    │  │Local LLM │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
├─────────────────────────────────────────────────────────────────┤
│                    Storage Layer                                 │
│  ┌──────────────────┐  ┌────────────────────┐                   │
│  │   PostgreSQL     │  │    ChromaDB        │                   │
│  │  (Metadata)      │  │  (Vector Store)    │                   │
│  └──────────────────┘  └────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Models

### TenantSettings
Stores tenant-specific AI configuration:
- `model_type`: "api" or "local"
- `api_model`: Groq model name (e.g., llama-3.3-70b-versatile)
- `local_model`: Local model key (e.g., tinyllama, phi2)
- `temperature`, `max_new_tokens`, `top_p`, `top_k`
- `system_prompt`, `no_context_prompt`
- `top_k_chunks`, `relevance_threshold`

### ChatSession
Tracks chat conversations:
- `tenant_id`: Business identifier
- `user_identifier`: Optional user tracking
- `title`: Auto-generated from first message

### ChatMessage
Individual messages within a session:
- `role`: "user" or "assistant"
- `content`: Message text
- `chunks_used`: Number of RAG chunks used
- `model_used`: Model that generated the response

---

## API Endpoints

### Public Chat (No Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat/public` | Chat with tenant's AI using their settings |
| GET | `/chat/sessions` | List sessions for a tenant |
| GET | `/chat/sessions/{id}` | Get session with message history |
| POST | `/chat/sessions` | Create new chat session |
| DELETE | `/chat/sessions/{id}` | Delete a session |

### Admin Settings (Authenticated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/settings` | Get tenant AI settings |
| PUT | `/admin/settings` | Update tenant AI settings |
| GET | `/admin/available-models` | List available API and local models |
| POST | `/admin/models/download` | Download a local model |

---

## Request/Response Examples

### Public Chat Request
```json
POST /chat/public
{
  "question": "What are your business hours?",
  "tenant_id": "my_company",
  "session_id": "optional-uuid-for-history"
}
```

### Public Chat Response
```json
{
  "answer": "Our business hours are Monday-Friday, 9 AM to 5 PM.",
  "session_id": "uuid-for-continuation",
  "retrieved_chunks": [...],
  "model_used": "llama-3.3-70b-versatile",
  "processing_time_ms": 1234.56
}
```

### Update Settings
```json
PUT /admin/settings
{
  "model_type": "api",
  "api_model": "llama-3.3-70b-versatile",
  "temperature": 0.7,
  "max_new_tokens": 512,
  "top_k_chunks": 5,
  "relevance_threshold": 0.1,
  "system_prompt": "You are a helpful assistant for My Company..."
}
```

---

## Local LLM Models

Available models for CPU inference:

| Key | Model | Size | Description |
|-----|-------|------|-------------|
| `tinyllama` | TinyLlama-1.1B-Chat | ~2.2 GB | Fast, lightweight |
| `phi2` | Microsoft Phi-2 | ~5.5 GB | Good reasoning |
| `qwen2` | Qwen2-1.5B-Instruct | ~3 GB | Balanced performance |
| `stablelm` | StableLM-2-Zephyr | ~3.2 GB | Stable output |

---

## Admin UI Features

The Settings tab in the admin dashboard provides:

1. **Model Configuration**
   - Toggle between API (Groq) and Local models
   - Select specific model from dropdown

2. **Generation Parameters**
   - Temperature slider (0-2)
   - Max Tokens slider (64-2048)
   - Top P slider (0-1)
   - Top K slider (1-100)

3. **Retrieval Settings**
   - Top K Chunks (1-20)
   - Relevance Threshold (0-1)

4. **Prompt Customization**
   - Editable system prompt
   - Custom no-context fallback prompt

---

## Usage Flow

### 1. Business Registration
```bash
POST /auth/register
{
  "username": "admin",
  "email": "admin@company.com",
  "password": "secure123",
  "tenant_id": "my_company",
  "business_name": "My Company Inc."
}
```

### 2. Configure AI Settings
Login to admin dashboard → Settings tab → Configure model and parameters

### 3. Upload Documents
Upload tab → Select PDF/DOCX/TXT files → Documents are processed and indexed

### 4. Enable Public Chat
End users can now chat at `POST /chat/public` with your `tenant_id`

---

## Files Modified/Added

| File | Description |
|------|-------------|
| `app/models/document.py` | Added TenantSettings, ChatSession, ChatMessage |
| `app/routers/admin.py` | Settings and model management endpoints |
| `app/routers/chat.py` | Public chat with tenant isolation |
| `app/modules/local_llm.py` | Local model inference module |
| `app/schemas/settings.py` | Settings-related Pydantic schemas |
| `app/schemas/chat.py` | Session-related schemas |
| `static/admin.html` | Settings tab UI |
| `migrate.py` | Database migration script |

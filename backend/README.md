# RAG Service - Multi-Tenant Customer Service AI

A Retrieval-Augmented Generation (RAG) pipeline for Customer Service AI chatbot with multi-tenant support, built with Python/FastAPI.

## Features

### Core RAG Capabilities
- **Document Management**: Upload, update, and delete documents (PDF, DOCX, TXT, XLSX)
- **Text Processing Pipeline**:
  - Text extraction from multiple formats
  - Preprocessing (lowercasing, tokenization, stopword removal, lemmatization)
  - Sentence-aware chunking with overlap
- **Semantic Search**: Vector similarity search with ChromaDB
- **Hybrid Retrieval**: Optional BM25 + vector hybrid search

### Multi-Tenant Architecture
- **Tenant Isolation**: Separate knowledge bases, settings, and chat history per business
- **Self-Registration**: Businesses can register with unique `tenant_id`
- **Public Chat**: No-auth endpoint for end-user access using `tenant_id`

### AI Model Support
- **API Models (Groq)**: llama-3.3-70b-versatile, mixtral-8x7b, gemma2-9b
- **Local Models**: TinyLlama, Phi-2, Qwen2, StableLM (CPU inference)
- **Customizable Parameters**: Temperature, max tokens, top_p, top_k per tenant

### Chat History
- **Session Management**: Create, list, and continue chat sessions
- **Conversation Context**: Multi-turn conversations with history

## Tech Stack

- **Framework**: FastAPI (Python)
- **Embeddings**: BAAI/bge-small-en-v1.5 (sentence-transformers)
- **Vector Store**: ChromaDB (persistent)
- **Database**: PostgreSQL (document metadata, tenant settings)
- **LLM**: Groq API or Local transformers
- **NLP**: NLTK, spaCy

## Quick Start

### 1. Prerequisites

- Python 3.10+
- PostgreSQL
- Groq API key

### 2. Setup

```bash
# Navigate to project
cd rag_service

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm
```

### 3. Configure Environment

Edit `.env` file:

```env
DATABASE_URL=postgresql+asyncpg://postgres:your_password@localhost:5432/rag_service
JWT_SECRET=your-secret-key-here
GROQ_API_KEY=your-groq-api-key
```

### 4. Create Database

```sql
CREATE DATABASE rag_service;
```

### 5. Run

```bash
uvicorn app.main:app --reload --port 8000
```

## Access

- **API Docs**: http://localhost:8000/docs
- **Admin UI**: http://localhost:8000/static/admin.html

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register business/admin |
| POST | `/auth/login` | Login, get JWT |

### Admin (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/documents` | Upload document |
| GET | `/admin/documents` | List documents |
| GET | `/admin/documents/{id}` | Get document details |
| DELETE | `/admin/documents/{id}` | Delete document |
| GET | `/admin/settings` | Get tenant AI settings |
| PUT | `/admin/settings` | Update tenant AI settings |
| GET | `/admin/available-models` | List available models |
| GET | `/admin/stats` | Get statistics |

### Public Chat (No Auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat/public` | Chat with tenant's AI |
| GET | `/chat/sessions` | List chat sessions |
| GET | `/chat/sessions/{id}` | Get session with messages |
| POST | `/chat/sessions` | Create new session |
| DELETE | `/chat/sessions/{id}` | Delete session |

## Usage Examples

### Register a Business
```json
POST /auth/register
{
  "username": "myadmin",
  "email": "admin@mycompany.com",
  "password": "secure123",
  "tenant_id": "my_company",
  "business_name": "My Company Inc."
}
```

### Configure AI Settings
```json
PUT /admin/settings
Authorization: Bearer <token>
{
  "model_type": "api",
  "api_model": "llama-3.3-70b-versatile",
  "temperature": 0.7,
  "max_new_tokens": 512,
  "top_k_chunks": 5,
  "system_prompt": "You are a helpful assistant for My Company..."
}
```

### Public Chat
```json
POST /chat/public
{
  "question": "What services do you offer?",
  "tenant_id": "my_company"
}
```

## Architecture

```
app/
├── main.py           # FastAPI application
├── config.py         # Settings management
├── database.py       # SQLAlchemy async setup
├── auth/             # JWT authentication
├── models/           # SQLAlchemy models
├── schemas/          # Pydantic schemas
├── modules/          # Processing modules
│   ├── extraction.py     # Text extraction
│   ├── preprocessing.py  # NLP preprocessing
│   ├── chunking.py       # Text chunking
│   ├── embedding.py      # Vector embeddings
│   ├── vector_store.py   # ChromaDB operations
│   ├── retrieval.py      # Semantic search
│   ├── prompt.py         # Prompt assembly
│   ├── llm.py            # Groq integration
│   └── local_llm.py      # Local model inference
├── routers/          # API routes
└── utils/            # Utilities

static/
└── admin.html        # Admin dashboard UI
```

## Documentation

See [WALKTHROUGH.md](./WALKTHROUGH.md) for detailed implementation documentation.

## License

MIT

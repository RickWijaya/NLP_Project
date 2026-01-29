# RAG Service - Multi-Tenant Customer Service AI

A Retrieval-Augmented Generation (RAG) pipeline for Customer Service AI chatbot with multi-tenant support, built with Python/FastAPI.

## 🚀 Features

### Core RAG Capabilities
- **Document Management**: Upload, update, and delete documents (PDF, DOCX, TXT, XLSX)
- **Text Processing Pipeline**: Extraction → Preprocessing → Chunking → Embedding
- **Semantic Search**: Vector similarity search with ChromaDB
- **Hybrid Retrieval**: Optional BM25 + vector hybrid search

### Multi-Tenant Architecture
- **Tenant Isolation**: Separate knowledge bases, settings, and chat history per business
- **Self-Registration**: Businesses can register with unique `tenant_id`
- **Public Chat**: No-auth endpoint for end-user access using `tenant_id`

### AI Features
- **Chat with Context**: Multi-turn conversations with history
- **Source Citations**: Shows which documents were used in responses
- **Suggested Questions**: AI-generated follow-up question buttons
- **Web Search**: Optional DuckDuckGo integration for real-time info
- **Streaming Responses**: Real-time token delivery via SSE
- **Content Moderation**: Blocks inappropriate user content

### Admin Features
- **Analytics Dashboard**: Usage metrics, charts, and trends
- **Super Admin Panel**: Manage all tenants, view system-wide stats
- **Model Configuration**: Choose between API and local models

## 📦 Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | FastAPI (Python 3.10+) |
| Database | PostgreSQL + SQLAlchemy Async |
| Vector Store | ChromaDB |
| Embeddings | BAAI/bge-small-en-v1.5 |
| LLM | Groq API (llama-3.3-70b) |
| Auth | JWT (python-jose) |
| NLP | NLTK, spaCy |

## 🛠️ Quick Start

### 1. Prerequisites
- Python 3.10+
- PostgreSQL database
- Groq API key ([get one here](https://console.groq.com))

### 2. Installation

```bash
# Clone and navigate
cd rag_service

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download NLP models
python -m spacy download en_core_web_sm
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet')"
```

### 3. Configure Environment

Create `.env` file:

```env
DATABASE_URL=postgresql+asyncpg://postgres:your_password@localhost:5432/rag_db
JWT_SECRET=your-super-secret-key-change-this
GROQ_API_KEY=gsk_your_groq_api_key_here
```

### 4. Create Database

```sql
CREATE DATABASE rag_db;
```

### 5. Run Server

```bash
uvicorn app.main:app --reload --port 8000
```

### 6. Access

| URL | Description |
|-----|-------------|
| http://localhost:8000/docs | API Documentation (Swagger) |
| http://localhost:8000/static/admin.html | Admin Dashboard |
| http://localhost:8000/static/chat.html?tenant=YOUR_TENANT | Chat Interface |
| http://localhost:8000/static/analytics.html | Analytics Dashboard |
| http://localhost:8000/static/superadmin.html | Super Admin Panel |

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [API_REFERENCE.md](./docs/API_REFERENCE.md) | Complete API endpoint documentation |
| [FRONTEND_INTEGRATION.md](./docs/FRONTEND_INTEGRATION.md) | Guide for connecting React/Vue/etc. |
| [DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Production deployment guide |

## 🔑 Default Accounts

After first run, these accounts are created:

| Role | Username | Password | URL |
|------|----------|----------|-----|
| Admin | admin | admin123 | /static/admin.html |
| Super Admin | sadmin | sadmin | /static/superadmin.html |

## 🏗️ Project Structure

```
rag_service/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Environment settings
│   ├── database.py          # SQLAlchemy setup
│   ├── auth/                # JWT authentication
│   ├── models/              # Database models
│   ├── schemas/             # Pydantic schemas
│   ├── modules/             # Core modules
│   │   ├── extraction.py    # Text extraction
│   │   ├── preprocessing.py # NLP preprocessing
│   │   ├── chunking.py      # Text chunking
│   │   ├── embedding.py     # Vector embeddings
│   │   ├── vector_store.py  # ChromaDB
│   │   ├── retrieval.py     # Semantic search
│   │   ├── prompt.py        # Prompt assembly
│   │   ├── llm.py           # Groq integration
│   │   ├── moderation.py    # Content moderation
│   │   ├── suggestions.py   # Follow-up questions
│   │   └── web_search.py    # DuckDuckGo search
│   └── routers/
│       ├── auth.py          # Authentication
│       ├── admin.py         # Admin endpoints
│       ├── chat.py          # Chat endpoints
│       └── analytics.py     # Analytics endpoints
├── static/                  # Frontend files
│   ├── admin.html           # Admin dashboard
│   ├── chat.html            # Chat interface
│   ├── analytics.html       # Analytics dashboard
│   └── superadmin.html      # Super admin panel
├── docs/                    # Documentation
├── requirements.txt
└── .env
```

## License

MIT

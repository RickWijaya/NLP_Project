# 🛠️ Developer Setup Guide

This guide provides step-by-step instructions to set up the RAG Service backend for local development.

## 📋 Prerequisites

Ensure you have the following installed on your machine:
- **Python 3.10** or higher
- **PostgreSQL 14** or higher
- **Git**
- **Node.js** (optional, for frontend)

---

## 🚀 1. Clone the Repository

Clone the specific branch (`briant`) from the repository:

```bash
git clone -b briant https://github.com/RickWijaya/NLP_Project.git
cd NLP_Project
```

---

## 🐍 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

### 2.1 Virtual Environment

Create and activate a virtual environment to isolate dependencies:

**Windows:**
```powershell
python -m venv venv
.\venv\Scripts\activate
```

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2.2 Install Dependencies

Install the required Python packages:

```bash
pip install -r requirements.txt
```

### 2.3 Download NLP Models

The system uses local NLP models that need to be downloaded once:

```bash
# Download spaCy model for text processing
python -m spacy download en_core_web_sm

# Download NLTK data (stopwords, tokenizer, wordnet)
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet')"
```

---

## 🗄️ 3. Database Setup

### 3.1 Create PostgreSQL Database

Open your terminal or a tool like `pgAdmin` and run:

```sql
CREATE DATABASE rag_db;
```

### 3.2 Configure Environment Variables

1. Copy the example environment file (if available) or create a new `.env` file in the `backend/` directory.

2. Add the following content to `backend/.env`:

```ini
# Database Connection
# Format: postgresql+asyncpg://<username>:<password>@<host>:<port>/<database_name>
DATABASE_URL=postgresql+asyncpg://postgres:your_password@localhost:5432/rag_db

# Security (Change this to a random string)
JWT_SECRET=dev_secret_key_12345
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# LLM Provider (Groq)
# Get a key from: https://console.groq.com
GROQ_API_KEY=gsk_your_groq_api_key_here

# Optional: Local LLM Settings
USE_LOCAL_LLM=false

# Optional: Vector Store Path
CHROMA_PERSIST_DIRECTORY=./chroma_db
```

> **Note:** Make sure to replace `your_password` and `gsk_your_groq_api_key_here` with your actual values.

---

## ⚡ 4. Initializing the System

### 4.1 Apply Migrations

The database tables are created automatically on startup by SQLAlchemy. No manual migration command is needed for the initial run.

### 4.2 Create Super Admin & Default Data

Run the seed script to create default accounts and settings:

```bash
python seed_db.py
```

This will create:
- **Super Admin**: `sadmin` / `sadmin`
- **Default Admin**: `admin` / `admin123` (Tenant: `default`)

Alternatively, to create just the super admin manually:
```bash
python create_superadmin.py
```

---

## ▶️ 5. Running the Server

Start the development server with hot-reload enabled:

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at: **http://localhost:8000**

---

## 🧪 6. Verifying the Setup

1. **Check API Health**:  
   Visit [http://localhost:8000/docs](http://localhost:8000/docs) to see the Swagger UI.

2. **Access Admin Panel**:  
   Open [http://localhost:8000/static/admin.html](http://localhost:8000/static/admin.html)  
   Login with: `admin` / `admin123`

3. **Access Super Admin Panel**:  
   Open [http://localhost:8000/static/superadmin.html](http://localhost:8000/static/superadmin.html)  
   Login with: `sadmin` / `sadmin`

4. **Test Chat**:  
   Open [http://localhost:8000/static/chat.html?tenant=default](http://localhost:8000/static/chat.html?tenant=default)  
   Try sending a message like "Hello".

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError` | Ensure venv is activated and `pip install -r requirements.txt` passed. |
| `ConnectionRefusedError` (DB) | Check `DATABASE_URL` credentials and ensure PostgreSQL service is running. |
| `Authentication Failed` (DB) | Verify the password in `.env` matches your postgres user password. |
| `Missing NLTK data` | Run the NLTK download command in step 2.3. |
| `Groq API Error` | Verify your `GROQ_API_KEY` is valid and has credits. |

---

## 📚 Project Structure

- `app/` - Main application code
  - `routers/` - API endpoints
  - `modules/` - Logic (RAG, LLM, Auth)
  - `models/` - Database schemas
- `docs/` - Documentation
- `static/` - Simple HTML frontends for testing
- `chroma_db/` - Vector database storage (auto-created)
- `uploads/` - File storage (auto-created)

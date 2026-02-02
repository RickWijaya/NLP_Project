RAG Chat Web Application – Frontend

This repository includes a Next.js App Router frontend that serves as the user interface for a multi‑tenant retrieval‑augmented generation (RAG) customer‑service chatbot. The frontend provides separate workflows for admins (business owners) and customers (end users). Admins can register and manage documents, AI settings, models and analytics, while customers can chat with the AI without authentication.

Features

Multi‑tenant support – each business has its own documents, settings and chat history. The UI uses dynamic routes (/chat/[company_id]) to serve multiple chatbots.

Admin dashboard – upload/delete/update documents, view processing logs, copy public chat link, configure AI models and settings, view analytics and profile. The dashboard is accessed after login.

Authentication – admins register (/register) and log in (/) to receive a JWT token stored in local storage.

Chat interface – end users can send questions to the AI via /chat/[company_id], with optional streaming responses and suggested follow‑up questions.

Reusable components – top bar, sidebar and dashboard widgets are under public/component/common.

Tech stack

Framework: Next.js (App Router)

Styling: Tailwind CSS

State management: React hooks and context (no external state library required)

API calls: native fetch wrapped in utility functions

Project structure

The app/ directory contains all front‑end routes and components. Key routes include:

app/page.tsx – Login page

app/register/page.tsx – Registration page

app/admin/page.tsx – Entry point for the admin dashboard

app/admin/dashboard/... – Nested routes for document management, settings, models, analytics and profile

app/user/chat/[botname]/page.tsx – Public chat interface for a specific bot

app/layout.tsx – Global layout with top bar and sidebar

Quick start
Prerequisites

Node.js
 version 18 or later

npm
 (comes with Node.js)

Installation

Clone the repository (if you have not already):

git clone https://github.com/RickWijaya/NLP_Project.git
cd NLP_Project


Install dependencies:

npm install


Set environment variables:

Create a .env.local file in the root of the project and define the base URL of your backend API. For example:

# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000


The application uses this variable when calling the backend API. You can point it to a remote server in production.

Running in development

Start the development server on port 3000:

npm run dev


Open your browser to http://localhost:3000 and follow these steps:

Visit /register to create an admin account (username, email, password, business name and company ID). This sends a POST /auth/register request to the backend.

After registration, go back to / and log in with your credentials. The frontend calls POST /auth/login and stores the returned token in local storage.

Once logged in, you will be redirected to /dashboard. From the dashboard you can upload documents, manage models and settings, view analytics and profile, and copy the public chat link. See the admin flowchart in the report for details.

Customers can access the chat interface at /chat/[company_id] without logging in. Replace [company_id] with the company identifier used during registration.

Building for production

To create an optimized production build, run:

npm run build


This generates a .next folder with static assets. To serve the build locally, run npm start. In production, you should deploy the Next.js app on a platform such as Vercel, Netlify or your own Node.js server. Ensure that NEXT_PUBLIC_API_URL points to the deployed backend.

Environment variables

Besides NEXT_PUBLIC_API_URL, you may define additional variables depending on your environment, such as analytics keys or third‑party integrations. Always prefix public variables with NEXT_PUBLIC_ so that Next.js exposes them to the client.

Further notes

The frontend currently connects to all backend endpoints described in the integration walkthrough. If you add new endpoints to the backend, update the API utility functions accordingly.

To enable streaming responses in chat, implement the /chat/public/stream endpoint on the backend and create a client function similar to the example in the integration guide.

To deploy behind a domain, configure CORS in the backend (app/main.py) to allow your frontend origin.

Contributing

Pull requests are welcome. Please make sure to update tests as appropriate and follow the existing project structure and coding style.

RAG Service – Backend

This backend provides a multi‑tenant retrieval‑augmented generation (RAG) service for customer‑service chatbots. Built with Python and FastAPI
, it implements document ingestion, vector embedding, similarity search, hybrid BM25 re‑ranking, tenant isolation and chat generation. A corresponding Next.js frontend is available in the same repository.

Features

Document management – upload, update and delete documents (PDF, DOCX, TXT, XLSX). Documents are extracted, preprocessed, chunked and embedded in a vector store.

Semantic search & hybrid retrieval – uses dense embeddings (BAAI bge‑small‑en‑v1.5) and ChromaDB for vector similarity search; optionally re‑ranks results using BM25.

Multi‑tenant architecture – each tenant has separate knowledge bases, settings and chat history. A unique tenant_id is provided during registration and used to isolate data.

Chat with context – maintains conversation history, cites sources and generates follow‑up questions.

Admin features – analytics dashboard, model configuration (select API or local models) and a super‑admin panel.

Tech stack
Component	Technology
Framework	FastAPI (Python ≥ 3.10)
Database	PostgreSQL with SQLAlchemy (async)
Vector store	ChromaDB
Embeddings	BAAI/bge‑small‑en‑v1.5
LLM	Groq API (e.g., llama‑3.3‑70b)
Auth	JWT via python‑jose
NLP	NLTK, spaCy
Quick start
1. Prerequisites

Python 3.10 or higher

PostgreSQL database (e.g., running locally at localhost:5432)

Groq API key – obtain one from the Groq console

2. Installation

Clone the repository and navigate to the backend directory (e.g., backend/ or rag_service/ depending on your clone):

# clone repository if not already done
# git clone https://github.com/RickWijaya/NLP_Project.git
cd NLP_Project/backend

# create virtual environment
python -m venv venv
source venv/bin/activate  # on Windows use .\venv\Scripts\activate

# install Python dependencies
pip install -r requirements.txt

# download NLP models (required for preprocessing)
python -m spacy download en_core_web_sm
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet')"

3. Configure environment

Create a .env file in the backend directory with your configuration:

# .env
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/rag_db
JWT_SECRET=your-super-secret-key-change-this
GROQ_API_KEY=gsk_your_groq_api_key_here


Replace YOUR_PASSWORD and gsk_your_groq_api_key_here with your actual credentials.

4. Create the database

Create the Postgres database named rag_db (or match the name in your DATABASE_URL):

CREATE DATABASE rag_db;

5. Run the server

Launch the FastAPI app with Uvicorn:

uvicorn app.main:app --reload --port 8000


The API will be available at http://localhost:8000. In development, --reload enables hot reload on code changes.

6. Access the application
URL	Description
http://localhost:8000/docs	Swagger/OpenAPI documentation
http://localhost:8000/static/admin.html	Basic admin dashboard (if using the built‑in static files)
http://localhost:8000/static/chat.html?tenant=YOUR_TENANT	Chat interface
http://localhost:8000/static/analytics.html	Analytics dashboard
http://localhost:8000/static/superadmin.html	Super‑admin panel

If you are using the Next.js frontend from this repository, the React app will call these endpoints directly and you do not need to open the static HTML pages.

Deployment notes

For production deployments, remove --reload and run behind a production-grade ASGI server such as Uvicorn with Gunicorn or Hypercorn. Use a process manager (e.g., systemd or supervisor) or container orchestration (Docker/Kubernetes).

Configure HTTPS and CORS. In app/main.py, adjust the CORSMiddleware allowed origins to include your frontend domain.

Securely store your .env file and rotate secrets regularly.
```
Project structure
backend/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Environment settings
│   ├── database.py          # SQLAlchemy setup
│   ├── auth/                # JWT authentication
│   ├── models/              # Database models
│   ├── schemas/             # Pydantic schemas
│   ├── modules/             # Core modules: extraction, preprocessing, chunking, embedding, retrieval, prompts, LLM, etc.
│   └── routers/             # API routers: auth, admin, chat, analytics
├── static/                  # Optional basic HTML interfaces
├── docs/                    # Documentation files
├── requirements.txt         # Python dependencies
└── .env                     # Environment configuration (not committed)
```
Further documentation

The backend includes additional docs under docs/:

SETUP_GUIDE.md – step‑by‑step setup instructions

API_REFERENCE.md – full API specification

FRONTEND_INTEGRATION.md – guidance for connecting any frontend to the backend

DEPLOYMENT.md – production deployment guide

These files provide more detail on advanced configuration and deployment.

License

This project is licensed under the MIT license.

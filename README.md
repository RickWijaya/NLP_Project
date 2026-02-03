# Multi‑Tenant Retrieval‑Augmented Generation Chat Application

## Overview

This project implements a **multi‑tenant retrieval‑augmented generation (RAG) system** for customer‑service chatbots. It is composed of two main components:

- A **Next.js frontend** written in TypeScript that provides a complete user interface for tenants (business owners) and end users. Tenants can register, upload documents, configure AI settings and view analytics, while customers can interact with a chat assistant without needing an account[\[1\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=RAG%20Chat%20Web%20Application%20%E2%80%93,Frontend).
- A **FastAPI backend** written in Python that performs document processing, vector embedding, similarity search and chat generation. Each tenant's documents are split into chunks, embedded using a BGE model and stored in a vector database. A retriever combines vector similarity with optional BM25 re‑ranking to fetch relevant context; this context is injected into a prompt for the LLM. The backend also implements multi‑tenant isolation using separate database tables and collections for each organisation.

Together, the frontend and backend provide a scalable platform for deploying LLM‑powered chatbots that answer organisation‑specific questions while keeping each tenant's data private. This repository is maintained by Rick Wijaya and contributors and is licensed under the MIT License[\[2\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=License).

## Features

### Multi‑Tenant Support

- **Tenant isolation:** Each organisation has its own document collection, settings and chat history. Separate database tables and vector collections guarantee that documents and conversations remain private.
- **Custom settings:** Tenants can choose different LLM models (Groq API, TinyLlama, Phi‑2, Qwen2), set temperature and top‑k retrieval parameters, and provide system prompts.

### Document Management and Retrieval

- **Document ingestion:** Upload PDF, DOCX, TXT or XLSX files through the dashboard. Documents are converted to plain text and split into sentence‑aware chunks of 300-500 tokens.
- **Embedding:** Chunks are embedded using the BAAI bge‑small‑en‑v1.5 sentence transformer; embeddings are normalised for cosine similarity.
- **Vector storage:** Embeddings and metadata are stored in ChromaDB in tenant‑specific collections. Developers can swap out the vector database with minimal changes due to the modular design.
- **Hybrid retrieval:** A retriever queries the vector store to return the k nearest chunks and can optionally combine the vector similarity score with BM25 scores for better lexical matching.
- **Prompt assembly:** Retrieved chunks, the current user query and chat history are concatenated into a Groq‑compatible prompt. If no context is available, a fallback prompt instructs the model to request clarification.

### Chat and Admin Interfaces

- **Admin dashboard:** After logging in, tenants can upload/delete/update documents, configure models and settings, view usage statistics and copy a public chat link[\[3\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Multi%E2%80%91tenant%20support%20%E2%80%93%20each%20business,company_id%5D%29%20to%20serve%20multiple%20chatbots). The dashboard is built with reusable components (top bar, sidebar and widgets).
- **Authentication:** Admins register via /register and log in at /. A JWT token is stored in local storage for authenticated API calls[\[4\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Authentication%20%E2%80%93%20admins%20register%20,token%20stored%20in%20local%20storage).
- **Customer chat:** Customers access the chat at /chat/\[company_id\] without logging in. They can send questions and receive responses, optionally streaming and accompanied by suggested follow‑up questions[\[5\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Chat%20interface%20%E2%80%93%20end%20users,responses%20and%20suggested%20follow%E2%80%91up%20questions).
- **Analytics:** Tenants can view chat usage statistics via the analytics dashboard (backend /analytics/summary endpoint)[\[6\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=1).

### Modular Backend

- **Chunking:** Sentence‑aware text splitting with overlapping windows to preserve context.
- **Embedding:** BGE model with normalised vectors.
- **Vector store:** ChromaDB interface for storing and querying embeddings.
- **Retrieval:** Optional BM25 re‑ranking to improve lexical matching.
- **Prompt:** Configurable prompts assembled from retrieved chunks and chat history.
- **LLM:** Supports both remote Groq models (e.g., llama‑3.3‑70b) and local HuggingFace models.

### Analytics and Extensibility

- **API endpoints:** A comprehensive set of endpoints for authentication, document management, settings, model selection and chat sessions.
- **Extensibility:** Modular design allows developers to swap embedding models, vector databases or LLM providers with minimal changes.

## Project Structure

nlp_project/  
├── app/ # Next.js App Router frontend  
│ ├── page.tsx # Login page\[7\]  
│ ├── register/page.tsx # Registration page\[8\]  
│ ├── admin/page.tsx # Admin dashboard entry\[9\]  
│ ├── admin/dashboard/… # Nested routes for documents, settings, models, analytics, profile\[10\]  
│ ├── user/chat/\[botname\]/page.tsx # Public chat page\[11\]  
│ └── layout.tsx # Global layout\[12\]  
├── backend/  
│ ├── app/  
│ │ ├── main.py # FastAPI entry point\[13\]  
│ │ ├── config.py # Environment settings\[14\]  
│ │ ├── database.py # SQLAlchemy setup\[14\]  
│ │ ├── auth/ # JWT authentication\[15\]  
│ │ ├── models/ # Database models\[15\]  
│ │ ├── schemas/ # Pydantic schemas\[15\]  
│ │ ├── modules/ # Chunking, embedding, retrieval, LLM etc.\[16\]  
│ │ └── routers/ # API routers: auth, admin, chat, analytics\[17\]  
│ ├── static/ # Optional HTML interfaces (not needed when using Next.js)\[18\]  
│ ├── docs/ # Additional documentation\[19\]  
│ ├── requirements.txt # Python dependencies\[20\]  
│ └── .env # Environment configuration (ignored in VCS)\[21\]  
└── public/ # Static assets for the frontend

## Setup Instructions

The project consists of a frontend and a backend. You can run them separately during development or deploy them together in production.

### Prerequisites

**Frontend**

- **Node.js ≥ 18** and npm[\[22\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Quick%20start%20Prerequisites).

**Backend**

- **Python ≥ 3.10**[\[23\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=1).
- **PostgreSQL** running locally on localhost:5432 (adjust DATABASE_URL if you use a different host)[\[24\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=1).
- **Groq API key** for remote model access (obtain from the Groq console)[\[25\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Groq%20API%20key%20%E2%80%93%20obtain,one%20from%20the%20Groq%20console).

### Installation

Clone this repository and navigate into it:

git clone <https://github.com/RickWijaya/NLP_Project.git>  
cd NLP_Project

#### Frontend

- Change to the project root (if you aren't already) and install dependencies:

npm install\[26\]

- Create an **.env.local** file in the root directory and set the base URL of your backend API (adjust the URL if your backend runs elsewhere):

\# .env.local  
NEXT_PUBLIC_API_URL=<http://localhost:8000\[27\>]

- Start the development server on port **3000**:

npm run dev\[28\]

Visit <http://localhost:3000> and follow the admin flow: register a new admin at /register, then log in at / to access the dashboard[\[29\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Visit%20%2Fregister%20to%20create%20an,auth%2Fregister%20request%20to%20the%20backend). Customers can access the chat interface at /chat/\[company_id\] without authentication[\[30\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Customers%20can%20access%20the%20chat,company%20identifier%20used%20during%20registration).

- **Production build:** To build an optimized production bundle, run:

npm run build\[31\]  
npm start\[32\]

Deploy the generated .next folder on a platform such as Vercel, Netlify or your own Node.js server. Ensure that NEXT_PUBLIC_API_URL points to your deployed backend[\[33\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=run%20npm%20start,points%20to%20the%20deployed%20backend).

#### Backend

- Navigate to the backend directory:

cd backend\[34\]

- Create and activate a virtual environment:

python -m venv venv\[35\]  
source venv/bin/activate # Windows: .\\venv\\Scripts\\activate

- Install dependencies:

pip install -r requirements.txt\[36\]

- Download NLP models for preprocessing:

python -m spacy download en_core_web_sm\[37\]  
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet')"\[38\]

- Create a **.env** file in the backend directory with your configuration:

\# .env  
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/rag_db\[39\]  
JWT_SECRET=your-super-secret-key-change-this\[40\]  
GROQ_API_KEY=gsk_your_groq_api_key_here\[41\]

- Create the Postgres database (use psql or your favourite client):

CREATE DATABASE rag_db;【767827045854559†L497-L503】

- Launch the FastAPI server with Uvicorn:

uvicorn app.main:app --reload --port 8000\[42\]

The API will be available at <http://localhost:8000>. In development mode, --reload enables hot reloading on code changes.

- Optional: Access API documentation and basic HTML interfaces:
- Swagger/OpenAPI docs: <http://localhost:8000/docs[\[43\>]](<https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=http%3A%2F%2Flocalhost%3A8000%2Fdocs%20Swagger%2FOpenAPI%20documentation%20http%3A%2F%2Flocalhost%3A8000%2Fstatic%2Fadmin,using%20the%20built%E2%80%91in%20static%20files>)
### Deployment Notes

For production deployments:

- Run Uvicorn behind a production ASGI server such as Gunicorn or Hypercorn and remove the --reload flag[\[47\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Deployment%20notes).
- Use a process manager (systemd, supervisor) or container orchestration (Docker/Kubernetes) to manage the service[\[48\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Deployment%20notes).
- Configure HTTPS and adjust CORS in app/main.py to include your frontend domain[\[49\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Configure%20HTTPS%20and%20CORS,to%20include%20your%20frontend%20domain).
- Store your .env file securely and rotate secrets periodically[\[50\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=origins%20to%20include%20your%20frontend,domain).

## Usage

### Admin Flow

- **Register a tenant:** Visit /register and provide username, email, password, business name and a unique company ID. This sends a POST /auth/register request to the backend[\[51\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Visit%20%2Fregister%20to%20create%20an,auth%2Fregister%20request%20to%20the%20backend).
- **Log in:** Go to / and log in with your credentials. The frontend stores the returned JWT token in local storage for subsequent API calls[\[52\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=After%20registration%2C%20go%20back%20to,returned%20token%20in%20local%20storage).
- **Manage documents:** In the dashboard you can upload new documents, view processing logs, update or delete existing documents and copy the public chat link[\[53\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Once%20logged%20in%2C%20you%20will,view%20analytics%20and%20profile%2C%20and).
- **Configure models & settings:** Adjust model type, model name, temperature, max tokens, top‑k retrieval and system prompts via the settings page[\[54\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=models%2C%20analytics%20and%20profile).
- **View analytics:** Check chat usage statistics (number of sessions, messages and documents) via the analytics dashboard[\[55\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Once%20logged%20in%2C%20you%20will,in%20the%20report%20for%20details).

### Customer Flow

- Open the chat interface at /chat/\[company_id\] (replace company_id with the tenant's identifier). No login is required[\[30\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Customers%20can%20access%20the%20chat,company%20identifier%20used%20during%20registration).
- Type your question. The system embeds the query, retrieves the most relevant document chunks and assembles a prompt containing the context and chat history.
- Receive a response from the LLM. Suggested follow‑up questions may appear below the answer to guide the conversation[\[5\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Chat%20interface%20%E2%80%93%20end%20users,responses%20and%20suggested%20follow%E2%80%91up%20questions).

## Contributing

Contributions are welcome! Please follow these guidelines:

- **Fork and branch.** Fork the repository and create a feature or bug‑fix branch.
- **Coding style.** Follow the existing project structure and code conventions[\[56\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Pull%20requests%20are%20welcome,project%20structure%20and%20coding%20style).
- **Tests.** Update or add tests as appropriate when you submit a pull request[\[56\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Pull%20requests%20are%20welcome,project%20structure%20and%20coding%20style).
- **Documentation.** Update the documentation if you change APIs or add new functionality. See docs/ for existing guides[\[19\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Further%20documentation).
- **Pull request.** Submit a pull request describing your changes and reference any related issues.

## License

This project is licensed under the **MIT License**[\[2\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=License).

## References

- R. Wijaya, P. A. Handal, B. Jasper, F. Faris and D. Rahadiyan, "Design and Implementation of a Multi‑Tenant Retrieval‑Augmented Generation (RAG) System for Customer Service," President University, 2026. The report describes the architecture of the system, including sentence‑aware chunking, BGE embeddings, ChromaDB storage, hybrid retrieval and multi‑tenant APIs.
- NLP_Project repository README and documentation[\[57\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=RAG%20Chat%20Web%20Application%20%E2%80%93,Frontend).
- Additional technical references on embeddings, vector search and ranking algorithms are provided in the report's bibliography.

[\[1\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=RAG%20Chat%20Web%20Application%20%E2%80%93,Frontend) [\[2\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=License) [\[3\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Multi%E2%80%91tenant%20support%20%E2%80%93%20each%20business,company_id%5D%29%20to%20serve%20multiple%20chatbots) [\[4\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Authentication%20%E2%80%93%20admins%20register%20,token%20stored%20in%20local%20storage) [\[5\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Chat%20interface%20%E2%80%93%20end%20users,responses%20and%20suggested%20follow%E2%80%91up%20questions) [\[6\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=1) [\[7\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=app%2Fpage) [\[8\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=app%2Fregister%2Fpage) [\[9\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=app%2Fadmin%2Fpage,the%20admin%20dashboard) [\[10\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=app%2Fadmin%2Fdashboard%2F,settings%2C%20models%2C%20analytics%20and%20profile) [\[11\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=app%2Fuser%2Fchat%2F,for%20a%20specific%20bot) [\[12\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=app%2Flayout,top%20bar%20and%20sidebar) [\[13\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Project%20structure%20backend%2F%20%E2%94%9C%E2%94%80%E2%94%80%20app%2F,Environment%20settings) [\[14\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Project%20structure%20backend%2F%20%E2%94%9C%E2%94%80%E2%94%80%20app%2F,SQLAlchemy%20setup) [\[15\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Project%20structure%20backend%2F%20%E2%94%9C%E2%94%80%E2%94%80%20app%2F,routers%3A%20auth%2C%20admin%2C%20chat%2C%20analytics) [\[16\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=%E2%94%82%20%20%20%E2%94%9C%E2%94%80%E2%94%80%20modules%2F,embedding%2C%20retrieval%2C%20prompts%2C%20LLM%2C%20etc) [\[17\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=%E2%94%82%20%20%20%E2%94%9C%E2%94%80%E2%94%80%20modules%2F,routers%3A%20auth%2C%20admin%2C%20chat%2C%20analytics) [\[18\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=%E2%94%9C%E2%94%80%E2%94%80%20static%2F%20%20%20,Python%20dependencies) [\[19\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Further%20documentation) [\[20\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=%E2%94%9C%E2%94%80%E2%94%80%20requirements,not%20committed) [\[21\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=%E2%94%94%E2%94%80%E2%94%80%20,not%20committed) [\[22\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Quick%20start%20Prerequisites) [\[23\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=1) [\[24\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=1) [\[25\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Groq%20API%20key%20%E2%80%93%20obtain,one%20from%20the%20Groq%20console) [\[26\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=npm%20install) [\[27\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Create%20a%20,For%20example) [\[28\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Running%20in%20development) [\[29\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Visit%20%2Fregister%20to%20create%20an,auth%2Fregister%20request%20to%20the%20backend) [\[30\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Customers%20can%20access%20the%20chat,company%20identifier%20used%20during%20registration) [\[31\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Building%20for%20production) [\[32\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=npm%20run%20build) [\[33\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=run%20npm%20start,points%20to%20the%20deployed%20backend) [\[34\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Clone%20the%20repository%20and%20navigate,rag_service%2F%20depending%20on%20your%20clone) [\[35\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=create%20virtual%20environment) [\[36\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=install%20Python%20dependencies) [\[37\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=download%20NLP%20models%20,preprocessing) [\[38\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=python%20,download%28%27wordnet) [\[39\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=DATABASE_URL%3Dpostgresql%2Basyncpg%3A%2F%2Fpostgres%3AYOUR_PASSWORD%40localhost%3A5432%2Frag_db%20JWT_SECRET%3Dyour) [\[40\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=DATABASE_URL%3Dpostgresql%2Basyncpg%3A%2F%2Fpostgres%3AYOUR_PASSWORD%40localhost%3A5432%2Frag_db%20JWT_SECRET%3Dyour) [\[41\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=JWT_SECRET%3Dyour) [\[42\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Launch%20the%20FastAPI%20app%20with,Uvicorn) [\[43\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=http%3A%2F%2Flocalhost%3A8000%2Fdocs%20Swagger%2FOpenAPI%20documentation%20http%3A%2F%2Flocalhost%3A8000%2Fstatic%2Fadmin,using%20the%20built%E2%80%91in%20static%20files) [\[44\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=http%3A%2F%2Flocalhost%3A8000%2Fstatic%2Fadmin,using%20the%20built%E2%80%91in%20static%20files) [\[45\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=http%3A%2F%2Flocalhost%3A8000%2Fstatic%2Fchat) [\[46\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Chat%20interface%20http%3A%2F%2Flocalhost%3A8000%2Fstatic%2Fanalytics) [\[47\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Deployment%20notes) [\[48\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Deployment%20notes) [\[49\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Configure%20HTTPS%20and%20CORS,to%20include%20your%20frontend%20domain) [\[50\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=origins%20to%20include%20your%20frontend,domain) [\[51\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Visit%20%2Fregister%20to%20create%20an,auth%2Fregister%20request%20to%20the%20backend) [\[52\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=After%20registration%2C%20go%20back%20to,returned%20token%20in%20local%20storage) [\[53\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Once%20logged%20in%2C%20you%20will,view%20analytics%20and%20profile%2C%20and) [\[54\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=models%2C%20analytics%20and%20profile) [\[55\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Once%20logged%20in%2C%20you%20will,in%20the%20report%20for%20details) [\[56\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=Pull%20requests%20are%20welcome,project%20structure%20and%20coding%20style) [\[57\]](https://github.com/RickWijaya/NLP_Project/blob/main/README.md#:~:text=RAG%20Chat%20Web%20Application%20%E2%80%93,Frontend) NLP_Project/README.md at main · RickWijaya/NLP_Project · GitHub

<https://github.com/RickWijaya/NLP_Project/blob/main/README.md>

# 🤖 RAG for Customer Services

A **Retrieval-Augmented Generation (RAG)** web application for customer service use cases.  
Built with modern **Next.js App Router**, designed for scalable chatbot experiences with an admin dashboard for model management.

---

## 🚀 Tech Stack

- **Frontend:** Next.js (App Router), Tailwind CSS
- **Backend:** FastAPI (Python), PostgreSQL, ChromaDB

---

## 📂 Project Structure

This repository contains both Frontend and Backend:

- `app/` - Next.js Frontend
- `backend/` - FastAPI RAG Service

See [backend/README.md](./backend/README.md) for detailed backend documentation.

## 📁 Project Structure

### Application Routes (`app/`)
```
app/
├── page.tsx
│   └── Login page
│
├── admin/
│   ├── page.tsx
│   │   └── Admin dashboard entry page
│   │
│   └── dashboard/
│       └── model/
│           └── page.tsx
│               └── Model management page
│
├── user/
│   └── chat/
│       └── [botname]/
│           ├── layout.tsx
│           │   └── Chat layout (shared UI for chat pages)
│           │
│           └── page.tsx
│               └── Chat page for a specific bot
│
└── layout.tsx
    └── Global layout (Topbar + Sidebar)

public/
└── component/
    ├── common/
    │   ├── topbar/
    │   │   └── Reusable top navigation component
    │   │
    │   └── sidebar/
    │       └── Reusable sidebar navigation component
    │
    └── dashboard/
        └── model/
            └── Dashboard-specific model UI assets
```
# 🧭 Route Overview
Route Description
/	Login page
/admin	Admin dashboard
/admin/dashboard/model	Model management
/user/chat/[botname]	Chat interface for a specific bot
🧠 Architecture Overview

RAG Chat System
Uses dynamic routing ([botname]) to support multiple chatbots with different knowledge bases.

Admin Dashboard
Central place for managing models, configurations, or future RAG documents.

Layout Strategy

Global layout for shared navigation (Topbar & Sidebar)

Nested layouts for chat-specific UI

Reusable Components
Shared UI elements live under public/component/common to ensure consistency.

🛠 Development Notes

Built with Next.js App Router

Clear separation between Admin and User features

Scalable structure for:

Additional admin modules

New chatbot capabilities

Advanced RAG workflows
```text

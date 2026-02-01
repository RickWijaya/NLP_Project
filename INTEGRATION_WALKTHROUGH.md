# Frontend-Backend Integration Walkthrough

## Overview
Dokumen ini menjelaskan perubahan yang dilakukan untuk menghubungkan **Frontend (Next.js)** dengan **Backend (FastAPI)** pada project RAG Customer Service Chatbot.

**Peran:** Integrator - Menyambungkan frontend dan backend yang dikerjakan oleh tim berbeda.

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER FLOW                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐         │
│   │   ADMIN     │          │  CUSTOMER   │          │   BACKEND   │         │
│   │  (Owner)    │          │ (End User)  │          │  (FastAPI)  │         │
│   └──────┬──────┘          └──────┬──────┘          └──────┬──────┘         │
│          │                        │                        │                 │
│          ▼                        │                        │                 │
│   ┌──────────────┐                │                        │                 │
│   │   Register   │ ───────────────┼──────────────────────► │                 │
│   │   /register  │                │         POST /auth/register              │
│   └──────────────┘                │                        │                 │
│          │                        │                        │                 │
│          ▼                        │                        │                 │
│   ┌──────────────┐                │                        │                 │
│   │    Login     │ ───────────────┼──────────────────────► │                 │
│   │      /       │                │         POST /auth/login                 │
│   └──────────────┘                │                        │                 │
│          │                        │                        │                 │
│          ▼                        │                        │                 │
│   ┌──────────────┐                │                        │                 │
│   │  Dashboard   │ ───────────────┼──────────────────────► │                 │
│   │  /dashboard  │                │    GET /admin/stats    │                 │
│   │              │                │    GET /admin/documents│                 │
│   │  - Upload    │ ───────────────┼──────────────────────► │                 │
│   │  - Delete    │                │    POST/DELETE docs    │                 │
│   │  - Copy Link │                │                        │                 │
│   └──────────────┘                │                        │                 │
│          │                        │                        │                 │
│          │ Share Link             │                        │                 │
│          ▼                        ▼                        │                 │
│   ┌─────────────────────────────────────┐                  │                 │
│   │         PUBLIC CHAT                  │                  │                 │
│   │   /chat/[company_id]                 │ ───────────────► │                 │
│   │                                      │   POST /chat/public               │
│   │   (No Login Required)                │                  │                 │
│   └─────────────────────────────────────┘                  │                 │
│                                                             │                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Dual Role System

| Role | Akses | Butuh Login | Tujuan |
|------|-------|-------------|--------|
| **Admin** | `/dashboard`, `/register`, `/` | ✅ Ya | Manage documents, AI settings, lihat stats |
| **Customer** | `/chat/[company_id]` | ❌ Tidak | Langsung chat dengan AI |

---

## Files Modified

### 1. Login Page (`app/page.js`)

**Perubahan:** Menghubungkan form login ke backend API

```javascript
// SEBELUM - Tidak ada API call
const handleSubmit = async (e) => {
    e.preventDefault();
    // Static login simulation
    router.push('/dashboard');
};

// SESUDAH - Terhubung ke backend
const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
        const response = await fetch('http://localhost:8000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Login failed');
        }

        // Store token and user info
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('username', username);
        localStorage.setItem('tenant_id', data.tenant_id || 'default_tenant');

        router.push('/dashboard');
    } catch (err) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
};
```

**API Endpoint:** `POST /auth/login`

---

### 2. Register Page (`app/register/page.js`)

**Perubahan:** 
- Menambah field Company ID untuk tenant identifier
- Validasi sesuai backend requirements
- Terhubung ke API register

```javascript
// Form state dengan Company ID
const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    companyId: ''  // BARU - untuk tenant_id
});

// API call
const response = await fetch('http://localhost:8000/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        tenant_id: formData.companyId.toLowerCase().replace(/\s+/g, '_'),
        business_name: formData.businessName
    })
});
```

**API Endpoint:** `POST /auth/register`

---

### 3. Dashboard Page (`app/dashboard/page.js`)

**Perubahan:** Complete rewrite untuk integrasi dengan backend

#### a. Fetch Statistics
```javascript
const fetchStats = async (authToken) => {
    try {
        const response = await fetch('http://localhost:8000/admin/stats', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            setStats({
                total_documents: Object.values(data.document_counts || {}).reduce((a, b) => a + b, 0),
                completed_documents: data.document_counts?.completed || 0,
                total_chunks: data.total_chunks || 0,
                pending_documents: data.document_counts?.pending || 0
            });
        }
    } catch (err) {
        console.error('Failed to fetch stats:', err);
    }
};
```

#### b. Fetch Documents List
```javascript
const fetchDocuments = async (authToken) => {
    setIsLoading(true);
    try {
        const response = await fetch('http://localhost:8000/admin/documents', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            setDocuments(data.documents || []);
        }
    } catch (err) {
        console.error('Failed to fetch documents:', err);
    } finally {
        setIsLoading(false);
    }
};
```

#### c. Upload Document
```javascript
const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress('Uploading...');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('http://localhost:8000/admin/documents', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (response.ok) {
            setUploadProgress('Upload successful! Processing...');
            await fetchDocuments(token);
            await fetchStats(token);
        }
    } catch (err) {
        setError('Upload failed');
    } finally {
        setIsUploading(false);
    }
};
```

#### d. Delete Document
```javascript
const handleDeleteDocument = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
        const response = await fetch(`http://localhost:8000/admin/documents/${documentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            await fetchDocuments(token);
            await fetchStats(token);
        }
    } catch (err) {
        console.error('Delete error:', err);
    }
};
```

#### e. Copy Public Link (FITUR BARU)
```javascript
const [publicChatLink, setPublicChatLink] = useState('');

useEffect(() => {
    if (tenantId) {
        setPublicChatLink(`${window.location.origin}/chat/${tenantId}`);
    }
}, [tenantId]);

const handleCopyLink = async () => {
    try {
        await navigator.clipboard.writeText(publicChatLink);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
};
```

**API Endpoints:**
- `GET /admin/stats`
- `GET /admin/documents`
- `POST /admin/documents`
- `DELETE /admin/documents/{id}`

---

### 4. Public Chat Page (`app/chat/[botname]/page.js`)

**Perubahan:** Menghubungkan chat ke backend RAG API

```javascript
const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputMessage('');
    setIsLoading(true);

    try {
        const response = await fetch('http://localhost:8000/chat/public', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: userMessage,
                tenant_id: tenantId,
                session_id: sessionId
            })
        });

        const data = await response.json();

        if (response.ok) {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: data.answer 
            }]);
            setSessionId(data.session_id);
        }
    } catch (err) {
        setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: 'Sorry, something went wrong.' 
        }]);
    } finally {
        setIsLoading(false);
    }
};
```

**API Endpoint:** `POST /chat/public`

---

### 5. Global CSS (`app/globals.css`)

**Perubahan:** Fix horizontal scroll & page transition animations

```css
/* Prevent horizontal scroll */
html, body {
  max-width: 100vw;
  overflow-x: hidden;
}

* {
  box-sizing: border-box;
}

/* Page transition animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-transition {
  animation: fadeIn 0.4s ease-out;
}
```

---

### 6. Page Transition Templates

**File Baru:** `app/template.js` & `app/dashboard/template.js`

```javascript
// app/template.js
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Template({ children }) {
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(false);
        const timer = setTimeout(() => setIsVisible(true), 50);
        return () => clearTimeout(timer);
    }, [pathname]);

    return (
        <div className={`transition-all duration-300 ease-out ${
            isVisible 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-2'
        }`}>
            {children}
        </div>
    );
}
```

---

## Summary of API Integrations

| Frontend Page | Backend Endpoint | Method | Auth Required |
|---------------|------------------|--------|---------------|
| `/` (Login) | `/auth/login` | POST | ❌ |
| `/register` | `/auth/register` | POST | ❌ |
| `/dashboard` | `/admin/stats` | GET | ✅ Bearer Token |
| `/dashboard` | `/admin/documents` | GET | ✅ Bearer Token |
| `/dashboard` | `/admin/documents` | POST | ✅ Bearer Token |
| `/dashboard` | `/admin/documents/{id}` | DELETE | ✅ Bearer Token |
| `/chat/[id]` | `/chat/public` | POST | ❌ |

---

## Testing Flow

### Admin Flow
1. **Register:** http://localhost:3000/register
   - Isi username, email, business name, company ID, password
   - Submit → Redirect ke login

2. **Login:** http://localhost:3000
   - Masukkan username & password
   - Submit → Redirect ke dashboard

3. **Dashboard:** http://localhost:3000/dashboard
   - Lihat stats (documents, chunks)
   - Upload dokumen FAQ (PDF/DOCX/TXT)
   - Copy public chat link
   - Logout

### Customer Flow
1. **Public Chat:** http://localhost:3000/chat/[company_id]
   - Langsung bisa chat tanpa login
   - AI menjawab berdasarkan dokumen yang di-upload admin

---

## Files Added/Modified

| File | Type | Description |
|------|------|-------------|
| `app/page.js` | Modified | Login API integration |
| `app/register/page.js` | Modified | Register API + Company ID field |
| `app/dashboard/page.js` | Modified | Complete rewrite with all API integrations |
| `app/chat/[botname]/page.js` | Modified | Chat API integration |
| `app/globals.css` | Modified | Overflow fix + animations |
| `app/template.js` | **New** | Root page transition |
| `app/dashboard/template.js` | **New** | Dashboard page transition |
| `app/dashboard/layout.js` | Modified | Layout overflow fix |

---

## Known Issues & Future Work

### ❌ Not Connected (Frontend exists but no backend API)
- `/dashboard/setting/[email]` - Empty file

### ✅ Previously Missing - Now Implemented
- ~~`/dashboard/models` - Hardcoded data~~ → **DONE** - Connected to `/admin/available-models`
- ~~AI Settings page~~ → **DONE** - `/dashboard/settings`
- ~~User Profile~~ → **DONE** - `/dashboard/profile` with `/auth/me`
- ~~Document Update~~ → **DONE** - Update button in dashboard
- ~~Document Detail~~ → **DONE** - Click document to view processing logs
- ~~Chat Search~~ → **DONE** - Filter sessions by keyword
- ~~Analytics Dashboard~~ → **DONE** - `/dashboard/analytics`

### 💡 Recommendations
1. Implement Super Admin dashboard
2. Add tenant management for Super Admin
3. Mobile responsive improvements

---

## 📅 Update Log - 1 Februari 2026

### Perubahan yang Dilakukan Hari Ini

Berikut adalah semua fitur yang diimplementasikan dalam sesi coding hari ini, dengan penjelasan detail cara kerja masing-masing.

---

### 1. 🔧 Analytics Dashboard (`/dashboard/analytics`)

**File:** `app/dashboard/analytics/page.js`

**Deskripsi:** Dashboard untuk melihat statistik penggunaan chatbot dan performa AI.

**Cara Kerja:**
1. Frontend memanggil `GET /analytics/summary` dengan Bearer token
2. Backend menghitung:
   - Total chat sessions
   - Total messages
   - Unique users
   - Average response time
   - Top documents used
   - Daily usage trends
3. Data ditampilkan dalam cards dan charts

**API Endpoint:** `GET /analytics/summary`

```javascript
// Fetch analytics data
const response = await fetch(`${API_URL}/analytics/summary`, {
    headers: { 'Authorization': `Bearer ${token}` }
});
```

---

### 2. ⚙️ AI Settings Page (`/dashboard/settings`)

**File:** `app/dashboard/settings/page.js`

**Deskripsi:** Halaman untuk mengatur model AI dan parameter RAG.

**Fitur:**
- Pilih model type (API atau Local)
- Pilih model name (Groq models atau Ollama local)
- Atur system prompt
- Atur max tokens dan temperature
- Preview API key status

**Cara Kerja:**
1. Load current settings dari `GET /admin/settings`
2. User mengubah settings
3. Klik Save → `PUT /admin/settings`
4. Backend update TenantSettings di database

**API Endpoints:**
- `GET /admin/settings` - Load current settings
- `PUT /admin/settings` - Save new settings

```javascript
// Save settings
const response = await fetch(`${API_URL}/admin/settings`, {
    method: 'PUT',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        model_type: modelType,
        api_model_name: apiModelName,
        system_prompt: systemPrompt,
        max_tokens: maxTokens,
        temperature: temperature
    })
});
```

---

### 3. 👤 User Profile Page (`/dashboard/profile`)

**File:** `app/dashboard/profile/page.js`

**Deskripsi:** Halaman untuk melihat informasi akun admin yang login.

**Fitur:**
- Tampilkan username, email, business name
- Tampilkan tenant ID
- Copy public chat link
- Quick action links ke halaman lain

**Cara Kerja:**
1. Frontend memanggil `GET /auth/me`
2. Backend mengembalikan data admin dari JWT token
3. Data ditampilkan dalam profile card

**API Endpoint:** `GET /auth/me`

**Bug Fix yang Dilakukan:**
Backend `/auth/me` sebelumnya error karena salah dependency. Fixed dengan:
```python
# BEFORE (ERROR)
@router.get("/me")
async def get_current_admin_info(
    admin: Admin = Depends(get_db)  # ❌ Wrong!
):
    pass

# AFTER (FIXED)
@router.get("/me")
async def get_current_admin_info(
    admin: Admin = Depends(get_current_admin)  # ✅ Correct
):
    return admin
```

---

### 4. 📄 Document Update Feature

**File:** `app/dashboard/page.js` (modified)

**Deskripsi:** Tombol untuk meng-update dokumen yang sudah ada dengan versi baru.

**Fitur:**
- Tombol update (biru) di setiap row dokumen
- Modal popup untuk pilih file baru
- Upload file → replace dokumen lama
- Version number otomatis naik

**Cara Kerja:**
1. User klik tombol update di dokumen
2. Modal muncul dengan file selector
3. User pilih file baru
4. Frontend POST ke `PUT /admin/documents/{id}`
5. Backend:
   - Delete old embeddings
   - Process new file
   - Update version number
   - Create new embeddings

**API Endpoint:** `PUT /admin/documents/{id}`

```javascript
const handleUpdateDocument = async (e) => {
    const file = e.target.files?.[0];
    const formData = new FormData();
    formData.append('file', file);
    
    await fetch(`${API_URL}/admin/documents/${updateDocId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
};
```

---

### 5. 📋 Document Detail View

**File:** `app/dashboard/page.js` (modified)

**Deskripsi:** Klik dokumen untuk melihat detail lengkap dan processing logs.

**Fitur:**
- Clickable document rows
- Modal dengan document info (status, chunks, dates)
- Processing logs timeline
- Status indicators (warna hijau/merah/kuning)
- Quick update button dari modal

**Cara Kerja:**
1. User klik row dokumen
2. Frontend fetch `GET /admin/documents/{id}`
3. Modal menampilkan:
   - Document metadata
   - Processing status
   - Step-by-step processing logs dengan timestamps

**API Endpoint:** `GET /admin/documents/{id}`

```javascript
const fetchDocumentDetail = async (docId) => {
    const response = await fetch(`${API_URL}/admin/documents/${docId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setDetailDoc(data);  // Contains processing_logs array
};
```

---

### 6. 🤖 Models Page (Backend Connected)

**File:** `app/dashboard/models/page.js` (complete rewrite)

**Deskripsi:** Menampilkan available AI models dari backend (bukan data static).

**BEFORE:** Hardcoded dummy data dengan 10 fake users

**AFTER:**
- Fetch models dari `GET /admin/available-models`
- Tab untuk API Models (Groq) dan Local Models (Ollama)
- Tampilkan current active model
- Tombol "Use This Model" untuk switch
- Update model via `PUT /admin/settings`

**Cara Kerja:**
1. Load available models dari backend
2. Load current settings untuk tahu model aktif
3. User klik "Use This Model"
4. PUT request ke update settings
5. Refresh tampilan

**API Endpoints:**
- `GET /admin/available-models` - List all models
- `PUT /admin/settings` - Switch active model

```javascript
// Response structure dari available-models
{
    "api_models": [
        { "key": "llama3-70b-8192", "name": "LLaMA 3 70B", "description": "..." },
        { "key": "mixtral-8x7b-32768", "name": "Mixtral 8x7B", "description": "..." }
    ],
    "local_models": [
        { "key": "llama3", "name": "Llama 3", "downloaded": true, "size": "4.7GB" }
    ]
}
```

---

### 7. 🔍 Chat Search Filter

**File:** `app/chat/[botname]/page.js` (modified)

**Deskripsi:** Fungsi pencarian di sidebar chat untuk filter conversations.

**Fitur:**
- Input search di sidebar
- Filter sessions by title dan last message
- Real-time filtering saat mengetik
- "No matching conversations" message
- Clear Search button

**Cara Kerja:**
1. User ketik di search box
2. `filteredSessions` dihitung dari sessions array
3. Filter berdasarkan:
   - session.title contains query
   - session.last_message contains query
4. Render filteredSessions instead of sessions

```javascript
const [searchQuery, setSearchQuery] = useState('');

const filteredSessions = sessions.filter(session => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const title = (session.title || '').toLowerCase();
    const preview = (session.last_message || '').toLowerCase();
    return title.includes(query) || preview.includes(query);
});
```

---

### 8. 📊 Dashboard Sidebar Fixed Position

**File:** `app/dashboard/layout.js` (modified)

**Deskripsi:** Sidebar navigation tetap terlihat saat scroll.

**Perubahan:**
- Sidebar menggunakan `position: sticky`
- Sidebar tidak ikut scroll dengan content
- Height: viewport height

---

## 🗂️ File Changes Summary

### Files Modified Today

| File | Changes |
|------|---------|
| `app/dashboard/page.js` | Added update button, document detail modal, state management |
| `app/dashboard/layout.js` | Added Profile menu item, fixed sidebar position |
| `app/dashboard/models/page.js` | Complete rewrite - connected to backend API |
| `app/chat/[botname]/page.js` | Added search filter functionality |
| `backend/app/routers/auth.py` | Fixed `/auth/me` endpoint bug |

### Files Created Today

| File | Purpose |
|------|---------|
| `app/dashboard/profile/page.js` | User profile page |
| `app/dashboard/analytics/page.js` | Analytics dashboard |
| `app/dashboard/settings/page.js` | AI settings page |

---

## 🔄 Complete API Integration Map

| Frontend Page | Backend Endpoint | Method | Status |
|---------------|------------------|--------|--------|
| `/` (Login) | `/auth/login` | POST | ✅ Connected |
| `/register` | `/auth/register` | POST | ✅ Connected |
| `/dashboard` | `/admin/stats` | GET | ✅ Connected |
| `/dashboard` | `/admin/documents` | GET | ✅ Connected |
| `/dashboard` | `/admin/documents` | POST | ✅ Connected |
| `/dashboard` | `/admin/documents/{id}` | PUT | ✅ Connected (NEW) |
| `/dashboard` | `/admin/documents/{id}` | DELETE | ✅ Connected |
| `/dashboard` | `/admin/documents/{id}` | GET | ✅ Connected (NEW) |
| `/dashboard/analytics` | `/analytics/summary` | GET | ✅ Connected (NEW) |
| `/dashboard/settings` | `/admin/settings` | GET | ✅ Connected (NEW) |
| `/dashboard/settings` | `/admin/settings` | PUT | ✅ Connected (NEW) |
| `/dashboard/models` | `/admin/available-models` | GET | ✅ Connected (NEW) |
| `/dashboard/profile` | `/auth/me` | GET | ✅ Connected (NEW) |
| `/chat/[id]` | `/chat/public` | POST | ✅ Connected |
| `/chat/[id]` | `/chat/sessions` | GET | ✅ Connected |
| `/chat/[id]` | `/chat/sessions/{id}` | GET | ✅ Connected |
| `/chat/[id]` | `/chat/sessions/{id}` | DELETE | ✅ Connected |

---

## 🚀 How to Run

### Backend
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
npm run dev
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 👥 Team Notes

### Untuk Tim Frontend
- Semua API calls sudah menggunakan pattern yang sama
- Token disimpan di localStorage
- Error handling sudah ada di setiap fetch

### Untuk Tim Backend  
- Frontend sudah terintegrasi dengan semua endpoint utama
- Masih ada endpoint Super Admin yang belum diimplementasi di frontend

### Next Sprint Suggestions
1. Super Admin dashboard (multi-tenant management)
2. Mobile responsive improvements
3. Real-time chat updates (WebSocket)
4. Export analytics data

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
- `/dashboard/models` - Hardcoded data
- `/dashboard/setting/[email]` - Empty file

### ✅ Backend API exists but frontend not implemented
- `GET /admin/settings` - AI Settings
- `PUT /admin/settings` - Update AI Settings

### 💡 Recommendations
1. Implement AI Settings page
2. Remove or repurpose Models page
3. Add error toast notifications
4. Mobile responsive improvements

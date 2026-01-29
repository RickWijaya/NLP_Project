# API Reference

Complete API documentation for the RAG Service backend.

## Base URL

```
http://localhost:8000
```

## Authentication

Most admin endpoints require JWT authentication. Include the token in headers:

```
Authorization: Bearer <your_jwt_token>
```

---

## 🔐 Authentication Endpoints

### Register Admin (Business)

```http
POST /auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "mycompany",
  "email": "admin@mycompany.com",
  "password": "securepassword123",
  "tenant_id": "mycompany_tenant",
  "business_name": "My Company Inc."
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "username": "mycompany",
  "email": "admin@mycompany.com",
  "tenant_id": "mycompany_tenant",
  "business_name": "My Company Inc.",
  "is_active": true
}
```

---

### Login Admin

```http
POST /auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "mycompany",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

---

### Register User (Chat User)

```http
POST /auth/user/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "userpassword",
  "tenant_id": "mycompany_tenant"
}
```

---

### Login User

```http
POST /auth/user/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "userpassword",
  "tenant_id": "mycompany_tenant"
}
```

---

## 📄 Admin Document Management

All endpoints require admin JWT.

### Upload Document

```http
POST /admin/documents
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: Document file (PDF, DOCX, TXT, XLSX)
- `title` (optional): Document title
- `description` (optional): Document description

**Response:**
```json
{
  "id": "uuid",
  "title": "Product Guide",
  "filename": "product_guide.pdf",
  "status": "pending",
  "tenant_id": "mycompany_tenant",
  "created_at": "2026-01-30T00:00:00"
}
```

---

### List Documents

```http
GET /admin/documents
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): pending, processing, completed, failed

---

### Delete Document

```http
DELETE /admin/documents/{document_id}
Authorization: Bearer <token>
```

---

## ⚙️ Admin Settings

### Get Settings

```http
GET /admin/settings
Authorization: Bearer <token>
```

**Response:**
```json
{
  "model_type": "api",
  "api_model": "llama-3.3-70b-versatile",
  "temperature": 0.3,
  "max_new_tokens": 512,
  "top_k_chunks": 5,
  "relevance_threshold": 0.1,
  "system_prompt": "You are a helpful assistant...",
  "allow_web_search": true
}
```

---

### Update Settings

```http
PUT /admin/settings
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "temperature": 0.5,
  "max_new_tokens": 1024,
  "top_k_chunks": 10,
  "system_prompt": "Custom prompt here...",
  "allow_web_search": true
}
```

---

## 💬 Chat Endpoints

### Public Chat (Main Endpoint)

```http
POST /chat/public
Content-Type: application/json
```

**Request Body:**
```json
{
  "question": "What services do you offer?",
  "tenant_id": "mycompany_tenant",
  "session_id": "optional-session-uuid",
  "user_token": "optional-user-jwt",
  "enable_web_search": false
}
```

**Response:**
```json
{
  "answer": "We offer the following services...",
  "session_id": "uuid",
  "retrieved_chunks": [
    {
      "content": "Relevant text from document...",
      "document_id": "uuid",
      "source_filename": "services.pdf",
      "chunk_index": 3,
      "relevance_score": 0.87
    }
  ],
  "model_used": "llama-3.3-70b-versatile",
  "processing_time_ms": 1523.45,
  "source_citations": [
    {
      "document_id": "uuid",
      "chunk_index": 3,
      "filename": "services.pdf",
      "excerpt": "We provide consulting..."
    }
  ],
  "suggested_questions": [
    "What are your pricing plans?",
    "How can I get started?"
  ],
  "moderation_flagged": false
}
```

---

### Streaming Chat (SSE)

```http
POST /chat/public/stream
Content-Type: application/json
```

**Request Body:** Same as `/chat/public`

**Response:** Server-Sent Events stream

```
data: {"content": "We ", "done": false}
data: {"content": "offer ", "done": false}
data: {"content": "the following...", "done": false}
data: {"content": "", "done": true, "citations": [...], "suggestions": [...]}
```

---

### List Sessions

```http
GET /chat/sessions?tenant_id=mycompany_tenant
```

Optional: Add `Authorization: Bearer <user_token>` for user-specific sessions.

---

### Get Session Messages

```http
GET /chat/sessions/{session_id}?tenant_id=mycompany_tenant
```

---

### Delete Session

```http
DELETE /chat/sessions/{session_id}?tenant_id=mycompany_tenant
```

---

## 📊 Analytics Endpoints

### Get Tenant Analytics (Admin)

```http
GET /analytics/summary
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "total_messages": 1234,
  "total_sessions": 89,
  "total_users": 45,
  "total_documents": 12,
  "messages_today": 56,
  "messages_this_week": 321,
  "daily_messages": [
    {"date": "2026-01-24", "count": 45},
    {"date": "2026-01-25", "count": 67}
  ]
}
```

---

### Super Admin: Get System Stats

```http
GET /analytics/superadmin/stats
Authorization: Bearer <superadmin_token>
```

**Response:**
```json
{
  "total_tenants": 5,
  "total_messages": 5678,
  "total_users": 234,
  "total_documents": 89,
  "tenants": [
    {
      "tenant_id": "mycompany",
      "total_chats": 45,
      "total_messages": 234,
      "total_users": 12,
      "total_documents": 5
    }
  ]
}
```

---

### Super Admin: List All Tenants

```http
GET /analytics/superadmin/tenants
Authorization: Bearer <superadmin_token>
```

---

### Super Admin: Toggle Tenant

```http
PUT /analytics/superadmin/tenants/{tenant_id}/toggle
Authorization: Bearer <superadmin_token>
```

---

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message here"
}
```

| Status Code | Meaning |
|-------------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error - Internal error |

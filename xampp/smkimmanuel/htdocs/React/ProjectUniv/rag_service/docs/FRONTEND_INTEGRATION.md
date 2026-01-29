# Frontend Integration Guide

This guide explains how to connect your React, Vue, Next.js, or any frontend framework to the RAG Service backend.

## Table of Contents

1. [Quick Start](#quick-start)
2. [API Configuration](#api-configuration)
3. [Authentication Flow](#authentication-flow)
4. [Chat Integration](#chat-integration)
5. [Streaming Responses](#streaming-responses)
6. [React Examples](#react-examples)
7. [Vue Examples](#vue-examples)
8. [Error Handling](#error-handling)

---

## Quick Start

### Backend URL

During development:
```
http://localhost:8000
```

Production (update with your domain):
```
https://api.yoursite.com
```

### CORS

The backend allows all origins by default. For production, configure `app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourfrontend.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## API Configuration

### Create an API Client

**JavaScript/TypeScript:**

```javascript
// api/client.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const api = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };
    
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Request failed');
    }
    
    return response.json();
  },
  
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },
  
  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },
};
```

---

## Authentication Flow

### Admin Login

```javascript
// services/auth.js
export async function loginAdmin(username, password) {
  const response = await fetch('http://localhost:8000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  
  if (!response.ok) {
    throw new Error('Invalid credentials');
  }
  
  const data = await response.json();
  localStorage.setItem('admin_token', data.access_token);
  return data;
}

export function logout() {
  localStorage.removeItem('admin_token');
}

export function getToken() {
  return localStorage.getItem('admin_token');
}
```

### User Login (for Chat)

```javascript
export async function loginUser(email, password, tenantId) {
  const response = await fetch('http://localhost:8000/auth/user/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      tenant_id: tenantId,
    }),
  });
  
  const data = await response.json();
  localStorage.setItem('user_token', data.access_token);
  return data;
}
```

---

## Chat Integration

### Basic Chat Function

```javascript
// services/chat.js
export async function sendMessage(question, tenantId, options = {}) {
  const response = await fetch('http://localhost:8000/chat/public', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      tenant_id: tenantId,
      session_id: options.sessionId || null,
      user_token: options.userToken || null,
      enable_web_search: options.enableWebSearch || false,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to get response');
  }
  
  return response.json();
}
```

### Response Structure

```javascript
// The response includes:
{
  answer: "AI response text...",
  session_id: "uuid",
  source_citations: [
    { filename: "doc.pdf", excerpt: "..." }
  ],
  suggested_questions: [
    "Follow-up question 1?",
    "Follow-up question 2?"
  ],
  processing_time_ms: 1500,
  moderation_flagged: false
}
```

---

## Streaming Responses

For real-time token-by-token display (like ChatGPT):

```javascript
// services/chat.js
export async function sendMessageStreaming(question, tenantId, onChunk) {
  const response = await fetch('http://localhost:8000/chat/public/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      tenant_id: tenantId,
    }),
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        
        if (data.content) {
          fullResponse += data.content;
          onChunk(data.content, fullResponse);
        }
        
        if (data.done) {
          return {
            answer: fullResponse,
            citations: data.citations,
            suggestions: data.suggestions,
          };
        }
      }
    }
  }
}
```

---

## React Examples

### ChatComponent.jsx

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { sendMessage } from '../services/chat';

function ChatComponent({ tenantId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(scrollToBottom, [messages]);
  
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const response = await sendMessage(input, tenantId, { sessionId });
      
      setSessionId(response.session_id);
      
      const aiMessage = {
        role: 'assistant',
        content: response.answer,
        citations: response.source_citations,
        suggestions: response.suggested_questions,
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'error',
        content: error.message,
      }]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSuggestionClick = (question) => {
    setInput(question);
  };
  
  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <p>{msg.content}</p>
            
            {/* Source Citations */}
            {msg.citations && msg.citations.length > 0 && (
              <div className="citations">
                <span>Sources: </span>
                {msg.citations.map((c, j) => (
                  <span key={j} className="citation">{c.filename}</span>
                ))}
              </div>
            )}
            
            {/* Suggested Questions */}
            {msg.suggestions && msg.suggestions.length > 0 && (
              <div className="suggestions">
                {msg.suggestions.map((q, j) => (
                  <button
                    key={j}
                    onClick={() => handleSuggestionClick(q)}
                    className="suggestion-btn"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {loading && <div className="message assistant loading">Typing...</div>}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatComponent;
```

### useChat Hook

```jsx
// hooks/useChat.js
import { useState, useCallback } from 'react';
import { sendMessage, sendMessageStreaming } from '../services/chat';

export function useChat(tenantId) {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  
  const send = useCallback(async (question, options = {}) => {
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    
    try {
      if (options.streaming) {
        setStreamingText('');
        const result = await sendMessageStreaming(
          question,
          tenantId,
          (chunk, full) => setStreamingText(full)
        );
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.answer,
          citations: result.citations,
          suggestions: result.suggestions,
        }]);
        setStreamingText('');
      } else {
        const response = await sendMessage(question, tenantId, {
          sessionId,
          ...options,
        });
        
        setSessionId(response.session_id);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.answer,
          citations: response.source_citations,
          suggestions: response.suggested_questions,
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'error',
        content: error.message,
      }]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, sessionId]);
  
  const clear = useCallback(() => {
    setMessages([]);
    setSessionId(null);
  }, []);
  
  return {
    messages,
    send,
    clear,
    loading,
    streamingText,
    sessionId,
  };
}
```

---

## Vue Examples

### ChatComponent.vue

```vue
<template>
  <div class="chat-container">
    <div class="messages" ref="messagesContainer">
      <div
        v-for="(msg, i) in messages"
        :key="i"
        :class="['message', msg.role]"
      >
        <p>{{ msg.content }}</p>
        
        <div v-if="msg.citations" class="citations">
          <span v-for="c in msg.citations" :key="c.filename" class="citation">
            {{ c.filename }}
          </span>
        </div>
        
        <div v-if="msg.suggestions" class="suggestions">
          <button
            v-for="q in msg.suggestions"
            :key="q"
            @click="input = q"
            class="suggestion-btn"
          >
            {{ q }}
          </button>
        </div>
      </div>
      
      <div v-if="loading" class="message assistant">Typing...</div>
    </div>
    
    <div class="input-area">
      <input
        v-model="input"
        @keypress.enter="sendMessage"
        placeholder="Type your message..."
        :disabled="loading"
      />
      <button @click="sendMessage" :disabled="loading">Send</button>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    tenantId: { type: String, required: true }
  },
  
  data() {
    return {
      messages: [],
      input: '',
      loading: false,
      sessionId: null,
    };
  },
  
  methods: {
    async sendMessage() {
      if (!this.input.trim() || this.loading) return;
      
      const question = this.input;
      this.input = '';
      this.loading = true;
      
      this.messages.push({ role: 'user', content: question });
      
      try {
        const response = await fetch('http://localhost:8000/chat/public', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            tenant_id: this.tenantId,
            session_id: this.sessionId,
          }),
        });
        
        const data = await response.json();
        this.sessionId = data.session_id;
        
        this.messages.push({
          role: 'assistant',
          content: data.answer,
          citations: data.source_citations,
          suggestions: data.suggested_questions,
        });
      } catch (error) {
        this.messages.push({
          role: 'error',
          content: error.message,
        });
      } finally {
        this.loading = false;
        this.$nextTick(() => {
          this.$refs.messagesContainer.scrollTop =
            this.$refs.messagesContainer.scrollHeight;
        });
      }
    },
  },
};
</script>
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 404 Tenant not found | Invalid tenant_id | Check tenant_id is correct |
| 401 Unauthorized | Missing/invalid token | Refresh token or re-login |
| 500 Server Error | Backend issue | Check server logs |
| CORS Error | Origin not allowed | Update CORS settings |

### Error Handler

```javascript
export function handleApiError(error) {
  if (error.message.includes('Tenant not found')) {
    return 'This chat is not available. Please check the URL.';
  }
  
  if (error.message.includes('Unauthorized')) {
    // Clear token and redirect to login
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
    return 'Session expired. Please login again.';
  }
  
  return 'Something went wrong. Please try again.';
}
```

---

## Environment Variables

### React (.env)

```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_DEFAULT_TENANT=your_tenant_id
```

### Vue (.env)

```env
VUE_APP_API_URL=http://localhost:8000
VUE_APP_DEFAULT_TENANT=your_tenant_id
```

### Next.js (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_TENANT_ID=your_tenant_id
```

---

## Embedding the Chat Widget

To embed the chat in any website:

```html
<iframe
  src="http://localhost:8000/static/chat.html?tenant=YOUR_TENANT_ID"
  style="width: 400px; height: 600px; border: none; border-radius: 12px;"
></iframe>
```

Or as a floating widget:

```html
<script>
  (function() {
    const iframe = document.createElement('iframe');
    iframe.src = 'http://localhost:8000/static/chat.html?tenant=YOUR_TENANT';
    iframe.style.cssText = 'position:fixed;bottom:20px;right:20px;width:380px;height:500px;border:none;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:9999;';
    document.body.appendChild(iframe);
  })();
</script>
```

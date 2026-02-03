'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// Backend API URL
const API_URL = 'http://127.0.0.1:8000';

export default function ChatPage() {
    const [message, setMessage] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [botname, setBotname] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [expandedSources, setExpandedSources] = useState({}); // Track expanded source sections
    const [viewerConfig, setViewerConfig] = useState(null); // { url, page }
    const [useWebSearch, setUseWebSearch] = useState(false);

    // Auth State
    const [currentUser, setCurrentUser] = useState(null);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState('');

    // Confirmation dialog state
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState(null);
    const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

    const params = useParams();
    const searchParams = useSearchParams();
    const isIframe = searchParams.get('mode') === 'iframe';

    // Effect to close sidebar automatically in iframe mode
    useEffect(() => {
        if (isIframe) {
            setSidebarOpen(false);
        }
    }, [isIframe]);

    useEffect(() => {
        if (params.botname) {
            setBotname(params.botname);
        }
    }, [params.botname]);

    // Check local storage for user
    useEffect(() => {
        const storedUser = localStorage.getItem('chat_user_info');
        if (storedUser) {
            try {
                setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user info");
            }
        }
    }, []);

    const promptLogout = () => {
        setLogoutConfirmOpen(true);
    };

    const confirmLogout = () => {
        localStorage.removeItem('chat_user_token');
        localStorage.removeItem('chat_user_info');
        setCurrentUser(null);
        setSessions([]);
        setSessionId(null);
        setMessages([{ role: 'assistant', content: `Hello! How can I help you today?`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        setLogoutConfirmOpen(false);
    };

    // Keep original handleLogout for token expiration cases (no confirmation needed)
    const handleLogout = () => {
        localStorage.removeItem('chat_user_token');
        localStorage.removeItem('chat_user_info');
        setCurrentUser(null);
        setSessions([]);
        setSessionId(null);
        setMessages([{ role: 'assistant', content: `Hello! How can I help you today?`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError('');

        const email = e.target.email.value;
        const password = e.target.password.value;
        const endpoint = authMode === 'login' ? '/auth/user/login' : '/auth/user/register';

        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    tenant_id: botname
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || 'Authentication failed');
            }

            if (authMode === 'login') {
                localStorage.setItem('chat_user_token', data.access_token);
                const userInfo = {
                    id: data.user_id,
                    email: data.email,
                    tenant_id: data.tenant_id
                };
                localStorage.setItem('chat_user_info', JSON.stringify(userInfo));
                setCurrentUser(userInfo);
                setAuthModalOpen(false);
                fetchSessions(); // Refresh sessions after login
            } else {
                // Register successful, switch to login or auto-login
                setAuthMode('login');
                setAuthError('Registration successful! Please sign in.');
                setAuthLoading(false);
                return;
            }
        } catch (err) {
            setAuthError(err.message);
        } finally {
            setAuthLoading(false);
        }
    };

    const [messages, setMessages] = useState([
        { role: 'assistant', content: `Hello! How can I help you today?`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);

    const getUserIdentifier = () => {
        let userId = localStorage.getItem('chat_user_id');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('chat_user_id', userId);
        }
        return userId;
    };

    const fetchSessions = async () => {
        if (!botname) return;

        // If not logged in, do not fetch sessions (as per requirement)
        // Or handle guest sessions differently? 
        // Backend now REQUIRES auth for getting sessions.
        const token = localStorage.getItem('chat_user_token');
        if (!token) {
            setSessions([]);
            setLoadingSessions(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/chat/sessions?tenant_id=${botname}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSessions(data.sessions || []);
            } else if (response.status === 401) {
                // Token invalid
                handleLogout();
            }
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoadingSessions(false);
        }
    };

    useEffect(() => {
        if (botname) {
            fetchSessions();
        }
    }, [botname]);

    const loadSession = async (selectedSessionId) => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('chat_user_token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            const response = await fetch(`${API_URL}/chat/sessions/${selectedSessionId}`, {
                headers: headers
            });

            if (response.ok) {
                const data = await response.json();
                setSessionId(selectedSessionId);
                const formattedMessages = data.messages.map(m => ({
                    role: m.role,
                    content: m.content,
                    timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    id: m.id,
                    rating: m.rating
                }));
                setMessages(formattedMessages.length > 0 ? formattedMessages : [
                    { role: 'assistant', content: `Hello! How can I help you today?`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
                ]);
            }
        } catch (error) {
            console.error('Error loading session:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const startNewChat = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('chat_user_token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${API_URL}/chat/sessions`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    tenant_id: botname,
                    title: 'New Conversation',
                    user_identifier: getUserIdentifier()
                })
            });
            if (response.ok) {
                const data = await response.json();
                setSessionId(data.id);
                setMessages([
                    { role: 'assistant', content: `Hello! How can I help you today?`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
                ]);
                fetchSessions();
            }
        } catch (error) {
            console.error('Error creating session:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const promptDeleteSession = (sessionIdToDelete, e) => {
        e.stopPropagation();
        setSessionToDelete(sessionIdToDelete);
        setDeleteConfirmOpen(true);
    };

    const confirmDeleteSession = async () => {
        if (!sessionToDelete) return;

        try {
            const token = localStorage.getItem('chat_user_token');
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            await fetch(`${API_URL}/chat/sessions/${sessionToDelete}`, {
                method: 'DELETE',
                headers: headers
            });
            setSessions(prev => prev.filter(s => s.id !== sessionToDelete));
            if (sessionId === sessionToDelete) {
                setSessionId(null);
                setMessages([{ role: 'assistant', content: `Hello! How can I help you today?`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
            }
        } catch (error) {
            console.error('Error deleting session:', error);
        } finally {
            setDeleteConfirmOpen(false);
            setSessionToDelete(null);
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessageToBackend = async (userMessage) => {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages(prevMessages => [...prevMessages, { role: 'user', content: userMessage, timestamp }]);
        setIsLoading(true);

        try {
            const token = localStorage.getItem('chat_user_token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${API_URL}/chat/public/stream`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    question: userMessage,
                    tenant_id: botname || 'default_tenant',
                    session_id: sessionId,
                    user_identifier: getUserIdentifier(),
                    web_search: useWebSearch
                })
            });

            if (!response.ok) throw new Error('Failed to get response');

            // Create placeholder for assistant message
            const initialResTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: useWebSearch ? '🔍 *Searching the web...*' : 'Thinking...',
                timestamp: initialResTimestamp,
                isLoading: true,
                isSearching: useWebSearch
            }]);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = "";
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop(); // Keep the last partial line

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.is_final) {
                                // Final update for metadata
                                setIsLoading(false);
                                if (data.session_id && !sessionId) {
                                    setSessionId(data.session_id);
                                    fetchSessions();
                                }
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    const lastMsg = newMsgs[newMsgs.length - 1];
                                    lastMsg.suggestions = data.suggestions || [];
                                    lastMsg.sources = data.retrieved_chunks || [];
                                    lastMsg.id = data.assistant_message_id; // Capture ID
                                    lastMsg.isLoading = false;
                                    return newMsgs;
                                });
                            } else {
                                assistantMessage += data.content;
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    const lastMsg = newMsgs[newMsgs.length - 1];
                                    if (lastMsg.isSearching) {
                                        lastMsg.content = assistantMessage; // Replace "Searching..." with actual content
                                        lastMsg.isSearching = false;
                                    } else {
                                        lastMsg.content = assistantMessage;
                                    }
                                    return newMsgs;
                                });
                            }
                        } catch (e) {
                            console.error('Error parsing SSE:', e);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error:', error);
            setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFeedback = async (messageId, rating) => {
        if (!messageId) return;

        // Optimistic update
        setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, rating } : msg
        ));

        try {
            const token = localStorage.getItem('chat_user_token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            await fetch(`${API_URL}/chat/messages/${messageId}/feedback`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify({ rating })
            });
        } catch (error) {
            console.error('Feedback error:', error);
            // Revert on error
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, rating: undefined } : msg
            ));
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
    };

    const handleRegenerate = (index) => {
        // Find the last user message before this assistant message
        let lastUserMsg = null;
        for (let i = index - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                lastUserMsg = messages[i];
                break;
            }
        }

        if (lastUserMsg) {
            // Remove the assistant message (and any subsequent ones) to restart from that point
            setMessages(prev => prev.slice(0, index));
            sendMessageToBackend(lastUserMsg.content);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        await uploadFile(file);
        e.target.value = null; // Reset for same file re-upload
    };

    const uploadFile = async (file) => {
        setIsUploading(true);
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Add optimistic upload message
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: `📁 *Uploading ${file.name}...*`,
            timestamp
        }]);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_URL}/chat/upload?tenant_id=${botname}`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastIdx = newMessages.length - 1;
                    newMessages[lastIdx] = {
                        role: 'assistant',
                        content: `✅ **${file.name}** has been added to the knowledge base. My brain is now processing this information—you can ask me about it in a moment!`,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };
                    return newMessages;
                });
            } else {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.detail || 'Upload failed');
            }
        } catch (error) {
            setMessages(prev => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                newMessages[lastIdx] = {
                    role: 'assistant',
                    content: `❌ **Upload failed**: ${error.message}. Please try again with a supported file (PDF, TXT, DOCX, XLSX).`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                return newMessages;
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!message.trim() || isLoading) return;
        sendMessageToBackend(message);
        setMessage('');
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    // Filter sessions by search query
    const filteredSessions = sessions.filter(session => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const title = (session.title || '').toLowerCase();
        const preview = (session.last_message || '').toLowerCase();
        return title.includes(query) || preview.includes(query);
    });

    if (!botname) {
        return (
            <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-button-primary)' }}></div>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>

            {/* Beautiful Sidebar */}
            <div
                className={`${sidebarOpen ? 'w-[320px]' : 'w-0'} transition-all duration-500 ease-in-out overflow-hidden relative`}
                style={{
                    backgroundColor: 'var(--color-bg-card)',
                    borderRight: sidebarOpen ? '1px solid var(--color-border-slate)' : 'none'
                }}
            >
                <div className="flex flex-col h-full p-5 relative z-10">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: 'var(--color-button-primary)' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-lg m-0" style={{ fontFamily: 'var(--font-family-poppins)' }}>Conversations</h2>
                            <p className="text-xs m-0" style={{ color: 'var(--color-text-secondary)' }}>{sessions.length} chats</p>
                        </div>
                    </div>

                    {/* New Chat Button */}
                    <button
                        onClick={startNewChat}
                        className="w-full p-4 mb-5 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                            backgroundColor: 'var(--color-button-primary)',
                            boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                        <span className="text-white font-medium" style={{ fontFamily: 'var(--font-family-poppins)' }}>New Conversation</span>
                    </button>

                    {/* Search */}
                    <div className="relative mb-5">
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full p-3 pl-10 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                            style={{
                                backgroundColor: 'var(--color-bg-dark-primary)',
                                border: '1px solid var(--color-border-slate)',
                                color: 'var(--color-text-primary)',
                                fontFamily: 'var(--font-family-jakarta)'
                            }}
                        />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>

                    {/* Chat History Title */}
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-secondary)' }}>Recent Chats</span>
                        <button onClick={fetchSessions} className="p-1.5 rounded-lg hover:bg-white/5 transition-all">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M4 4v5h5M20 20v-5h-5M4 20L9.5 14.5M20 4l-5.5 5.5" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>

                    {/* Sessions List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {loadingSessions ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-3">
                                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-button-primary)', borderTopColor: 'transparent' }}></div>
                                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Loading history...</p>
                            </div>
                        ) : filteredSessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-3">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <p className="text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
                                    {searchQuery ? 'No matching conversations' : 'No conversations yet.'}<br />
                                    {searchQuery ? 'Try a different search' : 'Start a new chat!'}
                                </p>
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="px-4 py-2 rounded-lg text-sm transition-all hover:opacity-80"
                                        style={{ backgroundColor: 'var(--color-bg-dark-primary)', color: 'var(--color-text-secondary)' }}
                                    >
                                        Clear Search
                                    </button>
                                )}
                            </div>
                        ) : (
                            filteredSessions.map((session, index) => (
                                <div
                                    key={session.id}
                                    onClick={() => loadSession(session.id)}
                                    className={`p-4 rounded-xl cursor-pointer group transition-all duration-300 ${sessionId === session.id
                                        ? 'border'
                                        : 'hover:bg-white/5 border border-transparent'
                                        }`}
                                    style={{
                                        backgroundColor: sessionId === session.id ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                                        borderColor: sessionId === session.id ? 'var(--color-button-primary)' : 'transparent'
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{
                                                backgroundColor: sessionId === session.id ? 'var(--color-button-primary)' : 'var(--color-bg-dark-primary)'
                                            }}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={sessionId === session.id ? 'white' : 'var(--color-text-secondary)'} strokeWidth="2" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate mb-1" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-jakarta)' }}>
                                                {session.title || 'New Conversation'}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{session.message_count} messages</span>
                                                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--color-text-secondary)' }}></span>
                                                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{formatDate(session.updated_at)}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => promptDeleteSession(session.id, e)}
                                            className="opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all"
                                            style={{ backgroundColor: 'rgba(225, 29, 72, 0.1)' }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="var(--color-destructive)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--color-border-slate)' }}>
                        {currentUser ? (
                            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white uppercase" style={{ backgroundColor: 'var(--color-button-primary)' }}>
                                    {currentUser.email ? currentUser.email.charAt(0) : '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{currentUser.email}</p>
                                    <button
                                        onClick={promptLogout}
                                        className="text-xs hover:text-red-400 transition-colors"
                                        style={{ color: 'var(--color-text-secondary)' }}
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <p className="text-xs text-center mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                                    Sign in to save chat history
                                </p>
                                <button
                                    onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}
                                    className="w-full py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/10"
                                    style={{ border: '1px solid var(--color-border-slate)', color: 'var(--color-text-primary)' }}
                                >
                                    Sign In
                                </button>
                                <button
                                    onClick={() => { setAuthMode('register'); setAuthModalOpen(true); }}
                                    className="w-full py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                                    style={{ backgroundColor: 'var(--color-button-primary)', color: 'white' }}
                                >
                                    Sign Up
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Top Bar */}
                <div
                    className="flex flex-row items-center justify-between px-6 py-4"
                    style={{
                        backgroundColor: 'var(--color-bg-card)',
                        borderBottom: '1px solid var(--color-border-slate)'
                    }}
                >
                    <div className="flex flex-row items-center gap-4">
                        {/* Toggle Sidebar Button */}
                        {!isIframe && (
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2.5 rounded-xl hover:bg-white/5 transition-all duration-300"
                                style={{ border: '1px solid var(--color-border-slate)' }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={`transition-transform duration-300 ${sidebarOpen ? '' : 'rotate-180'}`}>
                                    <path d="M4 6h16M4 12h10M4 18h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                        )}

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Image
                                    src="/kathy-avatar.png"
                                    alt="Kathy AI"
                                    width={40}
                                    height={40}
                                    className="object-contain rounded-xl"
                                />
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ backgroundColor: 'var(--color-button-primary)', borderColor: 'var(--color-bg-card)' }}></div>
                            </div>
                            <div>
                                <h1 className="font-semibold text-lg m-0" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-poppins)' }}>{botname}</h1>
                                <p className="text-xs m-0 flex items-center gap-1" style={{ color: 'var(--color-button-primary)' }}>
                                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-button-primary)' }}></span>
                                    Online
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Back to Dashboard Button */}

                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                    {!sessionId && messages.length <= 1 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center gap-6 max-w-[500px] mx-auto">
                            <div className="w-20 h-20 rounded-3xl flex items-center justify-center animate-bounce shadow-2xl" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--color-button-primary)' }}>
                                <Image
                                    src="/kathy-avatar.png"
                                    alt="Kathy AI"
                                    width={50}
                                    height={50}
                                    className="object-contain"
                                />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-poppins)' }}>
                                    Welcome to {botname}!
                                </h2>
                                <p style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-jakarta)' }}>
                                    Start typing below to begin a new conversation.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex items-start gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    {/* Avatar */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${message.role === 'user' ? 'bg-indigo-500/10' : 'bg-emerald-500/10'}`}>
                                        {message.role === 'user' ? (
                                            <div className="w-full h-full rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold">
                                                U
                                            </div>
                                        ) : (
                                            <Image
                                                src="/kathy-avatar.png"
                                                alt="Kathy AI"
                                                width={28}
                                                height={28}
                                                className="object-contain"
                                            />
                                        )}
                                    </div>

                                    {/* Message Bubble */}
                                    <div
                                        className={`flex flex-col gap-2 max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                                    >
                                        <div
                                            className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${message.role === 'user'
                                                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-tr-sm'
                                                : 'bg-[#1a1c20] text-gray-100 rounded-tl-sm border border-white/5'
                                                }`}
                                            style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                                        >
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={{
                                                    code({ node, inline, className, children, ...props }) {
                                                        const match = /language-(\w+)/.exec(className || '')
                                                        return !inline && match ? (
                                                            <SyntaxHighlighter
                                                                style={atomDark}
                                                                language={match[1]}
                                                                PreTag="div"
                                                                {...props}
                                                            >
                                                                {String(children).replace(/\n$/, '')}
                                                            </SyntaxHighlighter>
                                                        ) : (
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        )
                                                    }
                                                }}
                                            >
                                                {message.content}
                                            </ReactMarkdown>
                                        </div>

                                        {/* Metadata */}
                                        <div className="flex items-center gap-2 px-2">
                                            <span className="text-[10px] text-gray-500 font-medium opacity-60">
                                                {message.timestamp}
                                            </span>
                                            {message.role === 'assistant' && (
                                                <div className="flex gap-2 items-center">
                                                    <button
                                                        onClick={() => message.id && handleFeedback(message.id, 1)}
                                                        disabled={!message.id}
                                                        className={`p-1 rounded hover:bg-white/10 transition-all ${message.rating === 1 ? 'text-green-500' : 'text-gray-500 hover:text-green-400'} ${!message.id ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                        title={message.id ? "Good response" : "Saving..."}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => message.id && handleFeedback(message.id, -1)}
                                                        disabled={!message.id}
                                                        className={`p-1 rounded hover:bg-white/10 transition-all ${message.rating === -1 ? 'text-red-500' : 'text-gray-500 hover:text-red-400'} ${!message.id ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                        title={message.id ? "Bad response" : "Saving..."}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>
                                                    </button>
                                                    <div className="w-[1px] h-3 bg-white/10 mx-1"></div>
                                                    <button
                                                        onClick={() => handleCopy(message.content)}
                                                        className="text-[10px] text-gray-500 hover:text-white transition-colors"
                                                    >
                                                        Copy
                                                    </button>
                                                    <button
                                                        onClick={() => handleRegenerate(index)}
                                                        className="text-[10px] text-gray-500 hover:text-white transition-colors"
                                                    >
                                                        Regenerate
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Citations/Sources */}
                                        {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-1 px-2 select-none">
                                                {message.sources.map((source, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            if (source.document_id.startsWith('web:')) {
                                                                window.open(source.document_id.substring(4), '_blank');
                                                            } else {
                                                                setViewerConfig({
                                                                    url: `${API_URL}/chat/view-doc/${source.document_id}`,
                                                                    filename: source.source_filename,
                                                                    page: source.page_label
                                                                });
                                                            }
                                                        }}
                                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all hover:scale-105 active:scale-95"
                                                        style={{
                                                            backgroundColor: source.document_id.startsWith('web:') ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                            color: source.document_id.startsWith('web:') ? '#60a5fa' : '#34d399',
                                                            border: `1px solid ${source.document_id.startsWith('web:') ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                                                        }}
                                                    >
                                                        {source.document_id.startsWith('web:') ? (
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <circle cx="12" cy="12" r="10"></circle>
                                                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                                            </svg>
                                                        ) : (
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                                <polyline points="14 2 14 8 20 8"></polyline>
                                                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                                                <polyline points="10 9 9 9 8 9"></polyline>
                                                            </svg>
                                                        )}
                                                        <span className="truncate max-w-[150px]">{source.source_filename}</span>
                                                        {!source.document_id.startsWith('web:') && source.page_label && <span className="opacity-60 ml-0.5">• p.{source.page_label}</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <span className="text-[11px] px-1" style={{ color: 'var(--color-text-secondary)' }}>{message.timestamp}</span>

                                        {/* Suggested Questions */}
                                        {message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && index === messages.length - 1 && (
                                            <div className="flex flex-wrap gap-2 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                {message.suggestions.map((suggestion, sIdx) => (
                                                    <button
                                                        key={sIdx}
                                                        onClick={() => sendMessageToBackend(suggestion)}
                                                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                                                        style={{
                                                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                                            border: '1px solid var(--color-button-primary)',
                                                            color: 'var(--color-text-primary)'
                                                        }}
                                                    >
                                                        {suggestion}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex flex-row gap-4 justify-start">
                                    <div className="flex-shrink-0">
                                        <Image src="/kathy-avatar.png" alt="AI" width={40} height={40} className="object-contain rounded-xl" />
                                    </div>
                                    <div className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                                        <div className="flex gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-button-primary)', animationDelay: '0ms' }}></div>
                                            <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-button-primary)', animationDelay: '150ms' }}></div>
                                            <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-button-primary)', animationDelay: '300ms' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-5" style={{ backgroundColor: 'var(--color-bg-card)', borderTop: '1px solid var(--color-border-slate)' }}>
                    <form onSubmit={handleSendMessage} className="max-w-[800px] mx-auto">
                        <div
                            className={`flex flex-col gap-2 p-2 rounded-2xl transition-all`}
                            style={{
                                backgroundColor: 'var(--color-bg-dark-primary)',
                                border: '1px solid var(--color-border-slate)'
                            }}
                        >
                            {/* Toolbar */}
                            <div className="flex items-center px-2 gap-3 pb-2 border-b border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setUseWebSearch(!useWebSearch)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${useWebSearch
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                        : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                                        }`}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                    Web Search {useWebSearch ? 'ON' : 'OFF'}
                                </button>
                            </div>

                            <div className="flex flex-row gap-3 items-end">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept=".pdf,.docx,.txt,.xlsx"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`p-3 rounded-xl hover:bg-white/5 transition-all ${isUploading ? 'animate-pulse' : ''}`}
                                    disabled={isUploading}
                                    title={!sessionId ? "Start a conversation to upload files" : "Add document to knowledge base"}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M12 5v14M5 12h14" stroke={isUploading ? 'var(--color-button-primary)' : 'var(--color-text-secondary)'} strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </button>
                                <div className="flex-1">
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                                        placeholder="Type your message..."
                                        rows={1}
                                        disabled={isLoading}
                                        className="w-full p-3 rounded-xl resize-none focus:outline-none transition-all disabled:opacity-50"
                                        style={{
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            color: 'var(--color-text-primary)',
                                            fontFamily: 'var(--font-family-jakarta)',
                                            minHeight: '48px',
                                            maxHeight: '120px',
                                        }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!message.trim() || isLoading}
                                    className="p-4 rounded-xl transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                                    style={{
                                        backgroundColor: 'var(--color-button-primary)',
                                        boxShadow: message.trim() ? '0 4px 15px rgba(34, 197, 94, 0.3)' : 'none'
                                    }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-center text-xs mt-3" style={{ color: 'var(--color-text-secondary)' }}>
                                Press Enter to send, Shift+Enter for new line
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            {/* Custom Scrollbar Styles */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: var(--color-border-slate);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: var(--color-text-secondary);
                }
            `}</style>
            {/* Suggested Questions & Citations Viewer Modal */}
            {viewerConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-5xl h-[90vh] bg-[#1a1c20] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-emerald-400">
                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white tracking-tight">{viewerConfig.filename}</h3>
                                    <p className="text-[11px] text-white/40 font-medium">Viewing Page {viewerConfig.page || 1}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setViewerConfig(null)}
                                className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-all group"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white/40 group-hover:text-white transition-colors">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-black/40">
                            <iframe
                                src={viewerConfig.url}
                                className="w-full h-full border-none"
                                title="Document Viewer"
                            />
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-white/10 flex justify-center bg-black/20">
                            <button
                                onClick={() => setViewerConfig(null)}
                                className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all"
                            >
                                Close Viewer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Auth Modal */}
            {authModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-[400px] bg-[#1a1c20] rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="relative p-6">
                            <button
                                onClick={() => setAuthModalOpen(false)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>

                            <h3 className="text-xl font-bold text-white text-center mb-6" style={{ fontFamily: 'var(--font-family-poppins)' }}>
                                {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                            </h3>

                            {authError && (
                                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                                    {authError}
                                </div>
                            )}

                            <form onSubmit={handleAuth} className="flex flex-col gap-4">
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email address"
                                    required
                                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 transition-all"
                                />
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Password"
                                    required
                                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={authLoading}
                                    className="w-full py-3 rounded-xl font-medium text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: 'var(--color-button-primary)' }}
                                >
                                    {authLoading ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Sign Up')}
                                </button>
                            </form>

                            <div className="mt-6 text-center">
                                <p className="text-sm text-white/40">
                                    {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                                    <button
                                        onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}
                                        className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                                    >
                                        {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                                    </button>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Session Confirmation Modal */}
            {deleteConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
                    <div className="relative w-full max-w-sm p-6 rounded-2xl" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Delete Conversation?</h3>
                        <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                            This will permanently delete this conversation. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setDeleteConfirmOpen(false); setSessionToDelete(null); }}
                                className="flex-1 py-2.5 rounded-xl font-medium transition-all hover:bg-white/10"
                                style={{ border: '1px solid var(--color-border-slate)', color: 'var(--color-text-primary)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteSession}
                                className="flex-1 py-2.5 rounded-xl font-medium transition-all hover:opacity-90"
                                style={{ backgroundColor: 'var(--color-destructive)', color: 'white' }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Logout Confirmation Modal */}
            {logoutConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
                    <div className="relative w-full max-w-sm p-6 rounded-2xl" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Sign Out?</h3>
                        <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                            Are you sure you want to sign out? Your chat history will still be saved.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setLogoutConfirmOpen(false)}
                                className="flex-1 py-2.5 rounded-xl font-medium transition-all hover:bg-white/10"
                                style={{ border: '1px solid var(--color-border-slate)', color: 'var(--color-text-primary)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="flex-1 py-2.5 rounded-xl font-medium transition-all hover:opacity-90"
                                style={{ backgroundColor: 'var(--color-destructive)', color: 'white' }}
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

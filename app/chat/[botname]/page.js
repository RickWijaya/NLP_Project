'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

// Backend API URL
const API_URL = 'http://localhost:8000';

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

    const params = useParams();

    useEffect(() => {
        if (params.botname) {
            setBotname(params.botname);
        }
    }, [params.botname]);

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
        try {
            const response = await fetch(`${API_URL}/chat/sessions?tenant_id=${botname}`);
            if (response.ok) {
                const data = await response.json();
                setSessions(data.sessions || []);
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
            const response = await fetch(`${API_URL}/chat/sessions/${selectedSessionId}`);
            if (response.ok) {
                const data = await response.json();
                setSessionId(selectedSessionId);
                const formattedMessages = data.messages.map(m => ({
                    role: m.role,
                    content: m.content,
                    timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

    const startNewChat = () => {
        setSessionId(null);
        setMessages([
            { role: 'assistant', content: `Hello! How can I help you today?`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
    };

    const deleteSession = async (sessionIdToDelete, e) => {
        e.stopPropagation();
        try {
            await fetch(`${API_URL}/chat/sessions/${sessionIdToDelete}`, { method: 'DELETE' });
            setSessions(prev => prev.filter(s => s.id !== sessionIdToDelete));
            if (sessionId === sessionIdToDelete) {
                startNewChat();
            }
        } catch (error) {
            console.error('Error deleting session:', error);
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
            const response = await fetch(`${API_URL}/chat/public`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: userMessage,
                    tenant_id: botname || 'default_tenant',
                    session_id: sessionId,
                    user_identifier: getUserIdentifier()
                })
            });

            if (!response.ok) throw new Error('Failed to get response');
            const data = await response.json();

            if (data.session_id && !sessionId) {
                setSessionId(data.session_id);
                fetchSessions();
            }

            const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: data.answer, timestamp: responseTimestamp }]);
        } catch (error) {
            console.error('Error:', error);
            setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        } finally {
            setIsLoading(false);
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
                                            onClick={(e) => deleteSession(session.id, e)}
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
                        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-button-primary)' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="white" strokeWidth="2" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>Guest User</p>
                                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Free Plan</p>
                            </div>
                        </div>
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
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2.5 rounded-xl hover:bg-white/5 transition-all duration-300"
                            style={{ border: '1px solid var(--color-border-slate)' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={`transition-transform duration-300 ${sidebarOpen ? '' : 'rotate-180'}`}>
                                <path d="M4 6h16M4 12h10M4 18h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>

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
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                    <div className="flex flex-col gap-6 max-w-[800px] mx-auto">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex flex-row gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="flex-shrink-0">
                                        <Image
                                            src="/kathy-avatar.png"
                                            alt="AI"
                                            width={40}
                                            height={40}
                                            className="object-contain rounded-xl"
                                        />
                                    </div>
                                )}
                                <div className={`flex flex-col gap-2 max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div
                                        className="p-4 rounded-2xl"
                                        style={{
                                            backgroundColor: msg.role === 'user' ? 'var(--color-button-primary)' : 'var(--color-bg-card)',
                                            border: msg.role === 'user' ? 'none' : '1px solid var(--color-border-slate)'
                                        }}
                                    >
                                        <p className="text-[15px] leading-relaxed m-0 whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-jakarta)' }}>
                                            {msg.content}
                                        </p>
                                    </div>
                                    <span className="text-[11px] px-1" style={{ color: 'var(--color-text-secondary)' }}>{msg.timestamp}</span>
                                </div>
                                {msg.role === 'user' && (
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-button-primary)' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="white" strokeWidth="2" />
                                            </svg>
                                        </div>
                                    </div>
                                )}
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
                </div>

                {/* Input Area */}
                <div className="p-5" style={{ backgroundColor: 'var(--color-bg-card)', borderTop: '1px solid var(--color-border-slate)' }}>
                    <form onSubmit={handleSendMessage} className="max-w-[800px] mx-auto">
                        <div className="flex flex-row gap-3 items-end p-2 rounded-2xl" style={{ backgroundColor: 'var(--color-bg-dark-primary)', border: '1px solid var(--color-border-slate)' }}>
                            <button type="button" className="p-3 rounded-xl hover:bg-white/5 transition-all">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 5v14M5 12h14" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" />
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
                        <p className="text-center text-xs mt-3" style={{ color: 'var(--color-text-secondary)' }}>Press Enter to send, Shift+Enter for new line</p>
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
        </div>
    );
}

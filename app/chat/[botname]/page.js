'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';  // Use useParams() in App Router
import Image from 'next/image';

// Backend API URL
const API_URL = 'http://localhost:8000';

export default function ChatPage() {
    const [message, setMessage] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [botname, setBotname] = useState(null); // Store botname in state
    const [isLoading, setIsLoading] = useState(false); // Loading state for API calls
    const [sessionId, setSessionId] = useState(null); // Session ID for chat continuity
    
    const params = useParams();  // Access dynamic params here
    
    // Set botname from the dynamic route
    useEffect(() => {
        if (params.botname) {
            setBotname(params.botname);  // Set the botname from the URL
        }
    }, [params.botname]);  // Depend on the botname param
    
    const [messages, setMessages] = useState([
        { role: 'assistant', content: `Hello! I am ${params.botname}, your intelligent assistant. How can I help you today?`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);
    
    // Function to send message to backend API
    const sendMessageToBackend = async (userMessage) => {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Add user message immediately
        setMessages(prevMessages => [
            ...prevMessages,
            { role: 'user', content: userMessage, timestamp },
        ]);
        
        setIsLoading(true);
        
        try {
            const response = await fetch(`${API_URL}/chat/public`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: userMessage,
                    tenant_id: botname || 'default_tenant',
                    session_id: sessionId
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to get response from server');
            }
            
            const data = await response.json();
            
            // Save session ID for continuity
            if (data.session_id) {
                setSessionId(data.session_id);
            }
            
            // Add assistant response
            const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setMessages(prevMessages => [
                ...prevMessages,
                { role: 'assistant', content: data.answer, timestamp: responseTimestamp },
            ]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setMessages(prevMessages => [
                ...prevMessages,
                { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: errorTimestamp },
            ]);
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

    // If botname is still null, show loading message
    if (!botname) {
        return <div>Loading...</div>; // Show loading until botname is available
    }

    return (
        <div className="flex h-screen" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
            

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Top Bar */}
                
                <div className="flex flex-row items-center justify-between p-4 border-b" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-slate)' }}>
                    <div className="flex flex-row items-center gap-3">
                        <Image
                            src="/kathy-avatar.png"
                            alt="Kathy AI"
                            width={35}
                            height={35}
                            className="object-contain rounded-full"
                        />
                        <Image
                            src="/kathy-text.png"
                            alt="Kathy AI"
                            width={100}
                            height={35}
                            className="object-contain -ml-4"
                        />
                        <h1 className="font-semibold text-[18px] leading-6 m-0 text-white" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                            {botname ? botname : 'New Chat'}
                        </h1>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <Image
                                src="/kathy-avatar.png"
                                alt="Kathy AI"
                                width={80}
                                height={80}
                                className="object-contain opacity-50"
                            />
                            <h2 className="font-bold text-[24px] leading-8 text-center m-0" style={{ fontFamily: 'var(--font-family-jakarta)', color: 'var(--color-text-secondary)' }}>
                                Start a conversation
                            </h2>
                            <p className="font-normal text-[16px] leading-6 text-center m-0" style={{ fontFamily: 'var(--font-family-jakarta)', color: 'var(--color-text-secondary)' }}>
                                Ask me anything or select a chat from history
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6 max-w-[800px] mx-auto">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex flex-row gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="flex-shrink-0">
                                            <Image
                                                src="/kathy-avatar.png"
                                                alt="Kathy AI"
                                                width={36}
                                                height={36}
                                                className="object-contain rounded-full"
                                            />
                                        </div>
                                    )}
                                    <div className={`flex flex-col gap-2 max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div
                                            className="p-4 rounded-2xl"
                                            style={{
                                                backgroundColor: msg.role === 'user' ? 'var(--color-button-primary)' : 'var(--color-bg-card)',
                                                fontFamily: 'var(--font-family-jakarta)'
                                            }}
                                        >
                                            <p className="font-normal text-[15px] leading-6 text-white m-0 whitespace-pre-wrap">
                                                {msg.content}
                                            </p>
                                        </div>
                                        <span className="font-normal text-[12px] leading-4" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-jakarta)' }}>
                                            {msg.timestamp}
                                        </span>
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="flex-shrink-0">
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-button-primary)' }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-slate)' }}>
                    <form onSubmit={handleSendMessage} className="max-w-[800px] mx-auto">
    <div className="flex flex-row gap-3 items-center"> {/* Align items in the center vertically */}
        <div className="flex-1 relative">
            <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                    }
                }}
                placeholder="Type your message..."
                rows={1}
                className="w-full p-4 pr-12 rounded-xl resize-none focus:outline-none focus:ring-2 transition-all"
                style={{
                    backgroundColor: 'var(--color-bg-dark-primary)',
                    border: '1px solid var(--color-border-slate)',
                    fontFamily: 'var(--font-family-jakarta)',
                    color: 'var(--color-text-primary)',
                    minHeight: '52px',
                    maxHeight: '200px',
                }}
            />
        </div>
        <button
            type="submit"
            disabled={!message.trim()}
            className="p-5 rounded-xl border-none cursor-pointer hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
                backgroundColor: 'var(--color-button-primary)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
            }}
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </button>
    </div>
</form>

                </div>
            </div>
        </div>
    );
}

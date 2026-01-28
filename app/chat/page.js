'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function ChatPage() {
    const [message, setMessage] = useState('');
    const [selectedChat, setSelectedChat] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Sample chat history data
    const chatHistory = [
        { id: 1, title: 'How to use Kathy AI?', date: 'Today', preview: 'I want to know how to...' },
        { id: 2, title: 'API Integration Help', date: 'Yesterday', preview: 'Can you help me with...' },
        { id: 3, title: 'Model Configuration', date: '2 days ago', preview: 'How do I configure...' },
        { id: 4, title: 'Document Upload Issue', date: '3 days ago', preview: 'I am having trouble...' },
        { id: 5, title: 'Custom Training', date: '1 week ago', preview: 'Is it possible to...' },
    ];

    // Sample messages for selected chat
    const messages = selectedChat ? [
        { role: 'user', content: 'Hello! How can I use Kathy AI?', timestamp: '10:30 AM' },
        { role: 'assistant', content: 'Hello! I\'m Kathy AI, your intelligent assistant. I can help you with various tasks including answering questions, providing information, and assisting with your projects. What would you like to know?', timestamp: '10:30 AM' },
        { role: 'user', content: 'Can you help me integrate the API?', timestamp: '10:32 AM' },
        { role: 'assistant', content: 'Of course! To integrate the Kathy AI API, you\'ll need to follow these steps:\n\n1. Get your API key from the dashboard\n2. Install the SDK\n3. Initialize the client\n4. Make your first request\n\nWould you like detailed instructions for any of these steps?', timestamp: '10:32 AM' },
    ] : [];

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        console.log('Sending message:', message);
        setMessage('');
    };

    return (
        <div className="flex h-screen" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
            {/* Sidebar - Chat History */}
            <aside
                className={`flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-[280px]' : 'w-0'} overflow-hidden`}
                style={{ backgroundColor: 'var(--color-bg-card)', borderRight: '1px solid var(--color-border-slate)' }}
            >
                {/* Sidebar Header */}
                <div className="flex flex-col p-4 gap-3 border-b" style={{ borderColor: 'var(--color-border-slate)' }}>
                    {/* Logo */}
                    <div className="flex flex-row items-center">
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
                    </div>

                    {/* New Chat Button */}
                    <button
                        onClick={() => setSelectedChat(null)}
                        className="flex flex-row items-center justify-center gap-2 p-3 rounded-lg border-none cursor-pointer hover:opacity-90 transition-all"
                        style={{ backgroundColor: 'var(--color-button-primary)', fontFamily: 'var(--font-family-jakarta)' }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span className="font-semibold text-[14px] text-white">New Chat</span>
                    </button>
                </div>

                {/* Chat History List */}
                <div className="flex-1 overflow-y-auto p-2">
                    <div className="flex flex-col gap-1">
                        {chatHistory.map((chat) => (
                            <button
                                key={chat.id}
                                onClick={() => setSelectedChat(chat.id)}
                                className={`flex flex-col items-start p-3 rounded-lg border-none cursor-pointer text-left transition-all ${selectedChat === chat.id ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                                style={{
                                    backgroundColor: selectedChat === chat.id ? 'var(--color-bg-dark-primary)' : 'transparent',
                                    fontFamily: 'var(--font-family-jakarta)'
                                }}
                            >
                                <p className="font-semibold text-[14px] leading-5 text-white m-0 truncate w-full">
                                    {chat.title}
                                </p>
                                <p className="font-normal text-[12px] leading-4 m-0 mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                    {chat.date}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sidebar Footer - Back to Dashboard */}
                <div className="p-4 border-t" style={{ borderColor: 'var(--color-border-slate)' }}>
                    <Link
                        href="/dashboard"
                        className="flex flex-row items-center gap-2 p-3 rounded-lg no-underline hover:opacity-80 transition-all"
                        style={{ backgroundColor: 'var(--color-bg-dark-primary)', fontFamily: 'var(--font-family-jakarta)' }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 19l-7-7 7-7" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="font-medium text-[14px] text-white">Dashboard</span>
                    </Link>
                </div>
            </aside>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Top Bar */}
                <div className="flex flex-row items-center justify-between p-4 border-b" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-slate)' }}>
                    <div className="flex flex-row items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 rounded-lg border-none cursor-pointer hover:opacity-80 transition-all"
                            style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 12h18M3 6h18M3 18h18" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                        <h1 className="font-semibold text-[18px] leading-6 m-0 text-white" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                            {selectedChat ? chatHistory.find(c => c.id === selectedChat)?.title : 'New Chat'}
                        </h1>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    {messages.length === 0 ? (
                        // Empty State
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
                        // Messages
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
                        <div className="flex flex-row gap-3 items-end">
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
                                        maxHeight: '200px'
                                    }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!message.trim()}
                                className="p-4 rounded-xl border-none cursor-pointer hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: 'var(--color-button-primary)' }}
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

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

// Backend API URL
const API_URL = 'http://localhost:8000';

export default function DashboardPage() {
    const router = useRouter();
    const [username, setUsername] = useState('Admin');
    const [email, setEmail] = useState('');
    const [tenantId, setTenantId] = useState('');
    const [token, setToken] = useState('');

    // Stats from backend
    const [stats, setStats] = useState({
        total_documents: 0,
        completed_documents: 0,
        total_chunks: 0,
        pending_documents: 0
    });

    // Documents list
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Upload state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    // Load user info and fetch data on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUsername = localStorage.getItem('username');
        const storedTenantId = localStorage.getItem('tenant_id');

        if (!storedToken) {
            router.push('/');
            return;
        }

        setToken(storedToken);
        setUsername(storedUsername || 'Admin');
        setTenantId(storedTenantId || 'default_tenant');

        // Fetch data
        fetchStats(storedToken);
        fetchDocuments(storedToken);
    }, [router]);

    const fetchStats = async (authToken) => {
        try {
            const response = await fetch(`${API_URL}/admin/stats`, {
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

    const fetchDocuments = async (authToken) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/admin/documents`, {
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

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadProgress('Uploading...');
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_URL}/admin/documents`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Upload failed');
            }

            setUploadProgress('Processing document...');

            // Refresh documents list
            await fetchDocuments(token);
            await fetchStats(token);

            setUploadProgress('Upload successful!');
            setTimeout(() => setUploadProgress(''), 3000);
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message || 'Upload failed');
            setUploadProgress('');
        } finally {
            setIsUploading(false);
            e.target.value = ''; // Reset file input
        }
    };

    const handleDeleteDocument = async (documentId) => {
        if (!confirm('Are you sure you want to delete this document?')) return;

        try {
            const response = await fetch(`${API_URL}/admin/documents/${documentId}`, {
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

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('tenant_id');
        router.push('/');
    };

    // Copy link state
    const [linkCopied, setLinkCopied] = useState(false);
    const [publicChatLink, setPublicChatLink] = useState('');

    // Set public chat link on client side only (avoid hydration mismatch)
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

    const getStatusBadge = (status) => {
        const styles = {
            completed: { bg: 'rgba(34, 197, 94, 0.2)', color: '#22C55E' },
            processing: { bg: 'rgba(59, 130, 246, 0.2)', color: '#3B82F6' },
            pending: { bg: 'rgba(234, 179, 8, 0.2)', color: '#EAB308' },
            failed: { bg: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }
        };
        const style = styles[status] || styles.pending;
        return (
            <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: style.bg, color: style.color }}>
                {status?.toUpperCase()}
            </span>
        );
    };

    const statsCards = [
        { label: 'Total Documents', value: stats.total_documents, icon: '📄', color: '#22C55E' },
        { label: 'Completed', value: stats.completed_documents, icon: '✅', color: '#3B82F6' },
        { label: 'Total Chunks', value: stats.total_chunks, icon: '🧩', color: '#00C0E8' },
        { label: 'Pending', value: stats.pending_documents, icon: '⏳', color: '#EAB308' },
    ];

    return (
        <div className="w-full max-w-full overflow-x-hidden">
            {/* Header Bar */}
            <div className="w-full" style={{ backgroundColor: 'var(--color-bg-card)', boxShadow: 'var(--shadow-cyan-glow)' }}>
                <div className="flex flex-row justify-between items-center p-[10px_30px] min-h-[66px]">
                    <div className="flex items-center">
                        <h1 className="font-normal text-[22px] leading-7 m-0" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-text-primary)' }}>
                            Dashboard
                        </h1>
                    </div>
                    <div className="flex flex-row items-center gap-4">
                        <div className="flex flex-row items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                                <Image
                                    src="/kathy-avatar.png"
                                    alt="Admin"
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex flex-col items-start gap-[2px]">
                                <p className="font-bold text-[16px] leading-[22px] tracking-[-0.007em] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                    {username}
                                </p>
                                <p className="font-medium text-[14px] leading-5 tracking-[-0.006em] m-0" style={{ fontFamily: 'var(--font-family-jakarta)', color: 'var(--color-text-secondary)' }}>
                                    Tenant: {tenantId}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex justify-center items-center p-2 w-10 h-10 min-h-0 rounded-full bg-transparent border-none cursor-pointer hover:opacity-80 transition-all duration-300"
                            style={{ color: 'var(--color-destructive)' }}
                            aria-label="Logout"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="currentColor" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-4 md:p-[30px] overflow-x-hidden">
                <div className="flex flex-col gap-[30px] max-w-full">
                    {/* Welcome Section */}
                    <div className="flex flex-col gap-2">
                        <h2 className="font-bold text-[28px] leading-9 tracking-[-0.01em] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                            Welcome back, {username}! 👋
                        </h2>
                        <p className="font-normal text-[16px] leading-6 tracking-[-0.006em] m-0" style={{ fontFamily: 'var(--font-family-jakarta)', color: 'var(--color-text-secondary)' }}>
                            Manage your knowledge base documents and AI settings.
                        </p>
                    </div>

                    {/* Stats Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {statsCards.map((stat, index) => (
                            <div
                                key={index}
                                className="flex flex-col p-6 gap-3 rounded-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                                style={{
                                    backgroundColor: 'var(--color-bg-card)',
                                    border: '1px solid var(--color-border-slate)',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                <div className="flex flex-row justify-between items-start">
                                    <div className="flex flex-col gap-2">
                                        <p className="font-medium text-[14px] leading-5 tracking-[-0.006em] m-0" style={{ fontFamily: 'var(--font-family-jakarta)', color: 'var(--color-text-secondary)' }}>
                                            {stat.label}
                                        </p>
                                        <p className="font-bold text-[32px] leading-10 tracking-[-0.01em] m-0" style={{ fontFamily: 'var(--font-family-jakarta)', color: stat.color }}>
                                            {stat.value}
                                        </p>
                                    </div>
                                    <div className="text-[32px]">
                                        {stat.icon}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Upload Section */}
                    <div className="flex flex-col p-6 gap-5 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                        <h3 className="font-semibold text-[20px] leading-6 tracking-[-0.006em] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                            Upload Documents
                        </h3>
                        <p className="text-sm m-0" style={{ color: 'var(--color-text-secondary)' }}>
                            Upload PDF, DOCX, TXT, or XLSX files to build your knowledge base.
                        </p>

                        {error && (
                            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444' }}>
                                {error}
                            </div>
                        )}

                        {uploadProgress && (
                            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3B82F6', color: '#3B82F6' }}>
                                {uploadProgress}
                            </div>
                        )}

                        <div className="flex flex-row gap-4 items-center">
                            <label
                                className="flex flex-row items-center gap-3 px-6 py-3 rounded-lg cursor-pointer transition-all hover:opacity-80"
                                style={{ backgroundColor: 'var(--color-button-primary)' }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                                </svg>
                                <span className="text-white font-medium">
                                    {isUploading ? 'Uploading...' : 'Choose File'}
                                </span>
                                <input
                                    type="file"
                                    accept=".pdf,.docx,.txt,.xlsx"
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                    className="hidden"
                                />
                            </label>
                            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                Supported: PDF, DOCX, TXT, XLSX
                            </span>
                        </div>
                    </div>

                    {/* Documents List */}
                    <div className="flex flex-col p-6 gap-5 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                        <div className="flex flex-row justify-between items-center">
                            <h3 className="font-semibold text-[20px] leading-6 tracking-[-0.006em] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                Documents ({documents.length})
                            </h3>
                            <button
                                onClick={() => { fetchDocuments(token); fetchStats(token); }}
                                className="px-4 py-2 rounded-lg border-none cursor-pointer transition-all hover:opacity-80"
                                style={{ backgroundColor: 'var(--color-bg-dark-primary)', color: 'var(--color-text-primary)' }}
                            >
                                Refresh
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
                                Loading documents...
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
                                No documents uploaded yet. Upload your first document above!
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {documents.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="flex flex-row items-center p-4 gap-4 rounded-lg"
                                        style={{ backgroundColor: 'var(--color-bg-dark-primary)', border: '1px solid var(--color-border-slate)' }}
                                    >
                                        <div className="flex justify-center items-center w-10 h-10 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                <polyline points="14 2 14 8 20 8" />
                                            </svg>
                                        </div>
                                        <div className="flex flex-col gap-1 flex-1">
                                            <p className="font-medium text-[14px] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                                {doc.original_filename}
                                            </p>
                                            <p className="text-[12px] m-0" style={{ color: 'var(--color-text-secondary)' }}>
                                                {doc.file_type?.toUpperCase()} • {doc.chunk_count || 0} chunks • v{doc.version}
                                            </p>
                                        </div>
                                        {getStatusBadge(doc.status)}
                                        <button
                                            onClick={() => handleDeleteDocument(doc.id)}
                                            className="p-2 rounded-lg border-none cursor-pointer transition-all hover:opacity-80"
                                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <Link
                            href="/dashboard/models"
                            className="flex flex-row items-center p-6 gap-4 rounded-xl no-underline transition-all duration-300 hover:scale-[1.02]"
                            style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}
                        >
                            <div className="flex justify-center items-center w-12 h-12 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="3" y="3" width="8" height="8" rx="2" stroke="#22C55E" strokeWidth="2" />
                                    <rect x="13" y="3" width="8" height="8" rx="2" stroke="#22C55E" strokeWidth="2" />
                                    <rect x="3" y="13" width="8" height="8" rx="2" stroke="#22C55E" strokeWidth="2" />
                                    <rect x="13" y="13" width="8" height="8" rx="2" stroke="#22C55E" strokeWidth="2" />
                                </svg>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="font-semibold text-[16px] leading-5 tracking-[-0.006em] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                    AI Settings
                                </p>
                                <p className="font-normal text-[14px] leading-5 tracking-[-0.006em] m-0" style={{ fontFamily: 'var(--font-family-jakarta)', color: 'var(--color-text-secondary)' }}>
                                    Configure model and parameters
                                </p>
                            </div>
                            <svg className="ml-auto" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M7.5 5l5 5-5 5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </Link>

                        <Link
                            href={`/chat/${tenantId}`}
                            className="flex flex-row items-center p-6 gap-4 rounded-xl no-underline transition-all duration-300 hover:scale-[1.02]"
                            style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}
                        >
                            <div className="flex justify-center items-center w-12 h-12 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="font-semibold text-[16px] leading-5 tracking-[-0.006em] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                    🔬 Preview Bot
                                </p>
                                <p className="font-normal text-[14px] leading-5 tracking-[-0.006em] m-0" style={{ fontFamily: 'var(--font-family-jakarta)', color: 'var(--color-text-secondary)' }}>
                                    Test your chatbot before sharing
                                </p>
                            </div>
                            <svg className="ml-auto" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M7.5 5l5 5-5 5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </Link>
                    </div>

                    {/* Share Public Link Section */}
                    <div className="flex flex-col p-6 gap-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', border: '2px solid var(--color-button-primary)' }}>
                        <div className="flex flex-row items-center gap-3">
                            <div className="flex justify-center items-center w-12 h-12 rounded-lg" style={{ backgroundColor: 'rgba(0, 192, 232, 0.1)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00C0E8" strokeWidth="2">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                </svg>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="font-semibold text-[18px] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                    🔗 Share Chatbot with Customers
                                </p>
                                <p className="text-sm m-0" style={{ color: 'var(--color-text-secondary)' }}>
                                    Copy this link and share it on your website, Instagram bio, or anywhere!
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-row gap-3 items-center">
                            <div className="flex-1 px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-dark-primary)', border: '1px solid var(--color-border-slate)' }}>
                                <code className="text-sm" style={{ color: '#00C0E8' }}>{publicChatLink || 'Loading...'}</code>
                            </div>
                            <button
                                onClick={handleCopyLink}
                                className="flex items-center gap-2 px-6 py-3 rounded-lg border-none cursor-pointer transition-all hover:opacity-80"
                                style={{ backgroundColor: linkCopied ? '#22C55E' : 'var(--color-button-primary)', color: 'white' }}
                            >
                                {linkCopied ? (
                                    <>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                        </svg>
                                        Copy Link
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div >
        </div>
    );
}

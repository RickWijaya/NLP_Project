'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';

// Backend API URL
const API_URL = 'http://127.0.0.1:8000';

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
        pending_documents: 0,
        traffic: []
    });

    // Documents list
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Upload state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    // Update document state
    const [updateDocId, setUpdateDocId] = useState(null);
    const [updateDocName, setUpdateDocName] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Document detail state
    const [detailDoc, setDetailDoc] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Delete confirmation state
    const [deleteConfirm, setDeleteConfirm] = useState(null); // {id, name}
    const [isDeleting, setIsDeleting] = useState(false);

    // Feedback analytics state
    const [feedbackStats, setFeedbackStats] = useState({
        total_rated: 0,
        positive: 0,
        negative: 0,
        satisfaction_rate: 0,
        recent_feedback: []
    });

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
        fetchFeedback(storedToken);
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
                    pending_documents: data.document_counts?.pending || 0,
                    traffic: data.traffic || []
                });
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

    const fetchFeedback = async (authToken) => {
        try {
            const response = await fetch(`${API_URL}/analytics/feedback`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                setFeedbackStats(data);
            }
        } catch (err) {
            console.error('Failed to fetch feedback:', err);
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

    const handleDeleteDocument = (documentId, filename) => {
        setDeleteConfirm({ id: documentId, name: filename });
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`${API_URL}/admin/documents/${deleteConfirm.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setDeleteConfirm(null);
                await fetchDocuments(token);
                await fetchStats(token);
            } else {
                const data = await response.json();
                setError(data.detail || 'Delete failed');
            }
        } catch (err) {
            console.error('Delete error:', err);
            setError('Delete failed due to network error');
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle document update
    const handleUpdateDocument = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !updateDocId) return;

        setIsUpdating(true);
        setUploadProgress('Updating document...');
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_URL}/admin/documents/${updateDocId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Update failed');
            }

            setUploadProgress('Document updated successfully!');
            await fetchDocuments(token);
            await fetchStats(token);
            setUpdateDocId(null);
            setUpdateDocName('');
            setTimeout(() => setUploadProgress(''), 3000);
        } catch (err) {
            console.error('Update error:', err);
            setError(err.message || 'Update failed');
            setUploadProgress('');
        } finally {
            setIsUpdating(false);
            e.target.value = '';
        }
    };

    // Fetch document detail with processing logs
    const fetchDocumentDetail = async (docId) => {
        setLoadingDetail(true);
        try {
            const response = await fetch(`${API_URL}/admin/documents/${docId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setDetailDoc(data);
            }
        } catch (err) {
            console.error('Failed to fetch document detail:', err);
        } finally {
            setLoadingDetail(false);
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

                    {/* Message Traffic Chart */}
                    <div className="flex flex-col p-6 gap-6 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                        <div className="flex flex-row justify-between items-center">
                            <h3 className="font-semibold text-[20px] leading-6 tracking-[-0.006em] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                Messages (Last 7 Days)
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-button-primary)' }}></span>
                                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Live Traffic</span>
                            </div>
                        </div>

                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.traffic}>
                                    <defs>
                                        <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-button-primary)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--color-button-primary)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--color-bg-card)',
                                            borderRadius: '12px',
                                            border: '1px solid var(--color-border-slate)',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                            color: '#fff'
                                        }}
                                        itemStyle={{ color: 'var(--color-button-primary)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="messages"
                                        stroke="var(--color-button-primary)"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorMessages)"
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Feedback Analytics Section */}
                    <div className="flex flex-col p-6 gap-5 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                        <div className="flex flex-row justify-between items-center">
                            <h3 className="font-semibold text-[20px] leading-6 tracking-[-0.006em] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                User Feedback
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                    <span className="text-green-400 text-sm">👍 {feedbackStats.positive}</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                    <span className="text-red-400 text-sm">👎 {feedbackStats.negative}</span>
                                </div>
                            </div>
                        </div>

                        {/* Satisfaction Rate */}
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Satisfaction Rate</span>
                                <span className="font-bold text-lg" style={{ color: feedbackStats.satisfaction_rate >= 50 ? '#22C55E' : '#EF4444' }}>
                                    {feedbackStats.satisfaction_rate}%
                                </span>
                            </div>
                            <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${feedbackStats.satisfaction_rate}%`,
                                        backgroundColor: feedbackStats.satisfaction_rate >= 50 ? '#22C55E' : '#EF4444'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Recent Feedback List */}
                        {feedbackStats.recent_feedback && feedbackStats.recent_feedback.length > 0 && (
                            <div className="flex flex-col gap-3 mt-2">
                                <h4 className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Recent Feedback</h4>
                                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                                    {feedbackStats.recent_feedback.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="flex flex-row items-start gap-3 p-3 rounded-lg transition-all"
                                            style={{ backgroundColor: 'var(--color-bg-dark-primary)', border: '1px solid var(--color-border-slate)' }}
                                        >
                                            <span className="text-lg">{item.rating === 1 ? '👍' : '👎'}</span>
                                            <div className="flex flex-col gap-1 flex-1">
                                                <p className="text-sm m-0 line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>
                                                    {item.content}
                                                </p>
                                                <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                                                    {new Date(item.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {feedbackStats.total_rated === 0 && (
                            <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>
                                No feedback received yet. Users can rate responses using 👍 and 👎 buttons in the chat.
                            </p>
                        )}
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
                                        className="flex flex-row items-center p-4 gap-4 rounded-lg cursor-pointer hover:bg-white/5 transition-all"
                                        style={{ backgroundColor: 'var(--color-bg-dark-primary)', border: '1px solid var(--color-border-slate)' }}
                                        onClick={() => fetchDocumentDetail(doc.id)}
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
                                            onClick={() => { setUpdateDocId(doc.id); setUpdateDocName(doc.original_filename); }}
                                            className="p-2 rounded-lg border-none cursor-pointer transition-all hover:opacity-80"
                                            style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}
                                            title="Update document"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id, doc.original_filename); }}
                                            className="p-2 rounded-lg border-none cursor-pointer transition-all hover:opacity-80"
                                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
                                            title="Delete document"
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

                    {/* Embed Widget Section */}
                    <div className="flex flex-col p-6 gap-4 rounded-xl mt-6" style={{ backgroundColor: 'var(--color-bg-card)', border: '2px solid var(--color-button-primary)' }}>
                        <div className="flex flex-row items-center gap-3">
                            <div className="flex justify-center items-center w-12 h-12 rounded-lg" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="font-semibold text-[18px] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                    🧩 Embed on Your Website
                                </p>
                                <p className="text-sm m-0" style={{ color: 'var(--color-text-secondary)' }}>
                                    Add this code to your website's HTML to display the chat widget.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-row gap-3 items-center">
                            <div className="flex-1 px-4 py-3 rounded-lg overflow-x-auto" style={{ backgroundColor: 'var(--color-bg-dark-primary)', border: '1px solid var(--color-border-slate)' }}>
                                <code className="text-sm whitespace-nowrap" style={{ color: '#A855F7' }}>
                                    {`<script src="${API_URL}/widget/${tenantId || 'default_tenant'}.js"></script>`}
                                </code>
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`<script src="${API_URL}/widget/${tenantId || 'default_tenant'}.js"></script>`);
                                    alert('Embed code copied!');
                                }}
                                className="flex items-center gap-2 px-6 py-3 rounded-lg border-none cursor-pointer transition-all hover:opacity-80"
                                style={{ backgroundColor: '#A855F7', color: 'white' }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                Copy Code
                            </button>
                        </div>
                    </div>

                    {/* Inline Embed Widget Section */}
                    <div className="flex flex-col p-6 gap-4 rounded-xl mt-6" style={{ backgroundColor: 'var(--color-bg-card)', border: '2px solid var(--color-border-slate)' }}>
                        <div className="flex flex-row items-center gap-3">
                            <div className="flex justify-center items-center w-12 h-12 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="3" y1="9" x2="21" y2="9"></line>
                                </svg>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="font-semibold text-[18px] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                    📄 Embed Inline (Page Section)
                                </p>
                                <p className="text-sm m-0" style={{ color: 'var(--color-text-secondary)' }}>
                                    Embed the chat directly into a section of your webpage instead of a popup.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <p className="text-xs text-gray-400">1. Create a container in your HTML:</p>
                            <div className="px-4 py-3 rounded-lg overflow-x-auto" style={{ backgroundColor: 'var(--color-bg-dark-primary)', border: '1px solid var(--color-border-slate)' }}>
                                <code className="text-sm whitespace-nowrap" style={{ color: '#3B82F6' }}>
                                    {`<div id="ai-chat-inline-container" style="height: 600px; width: 100%;"></div>`}
                                </code>
                            </div>

                            <p className="text-xs text-gray-400 mt-2">2. Add the script:</p>
                            <div className="flex flex-row gap-3 items-center">
                                <div className="flex-1 px-4 py-3 rounded-lg overflow-x-auto" style={{ backgroundColor: 'var(--color-bg-dark-primary)', border: '1px solid var(--color-border-slate)' }}>
                                    <code className="text-sm whitespace-nowrap" style={{ color: '#3B82F6' }}>
                                        {`<script src="${API_URL}/widget/${tenantId || 'default_tenant'}_inline.js"></script>`}
                                    </code>
                                </div>
                                <button
                                    onClick={() => {
                                        const code = `<div id="ai-chat-inline-container" style="height: 600px; width: 100%;"></div>\n<script src="${API_URL}/widget/${tenantId || 'default_tenant'}_inline.js"></script>`;
                                        navigator.clipboard.writeText(code);
                                        alert('Inline embed code copied!');
                                    }}
                                    className="flex items-center gap-2 px-6 py-3 rounded-lg border-none cursor-pointer transition-all hover:opacity-80"
                                    style={{ backgroundColor: '#3B82F6', color: 'white' }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                    Copy Code
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Update Document Modal */}
            {updateDocId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                    <div className="p-6 rounded-2xl max-w-md w-full mx-4" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                        <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-family-poppins)' }}>
                            Update Document
                        </h3>
                        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                            Replace <strong style={{ color: '#3B82F6' }}>{updateDocName}</strong> with a new version
                        </p>

                        <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: 'var(--color-bg-dark-primary)', border: '2px dashed var(--color-border-slate)' }}>
                            <label className="flex flex-col items-center gap-3 cursor-pointer">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-button-primary)" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                                </svg>
                                <span className="text-white font-medium">{isUpdating ? 'Updating...' : 'Click to select new file'}</span>
                                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>PDF, DOCX, TXT, XLSX</span>
                                <input
                                    type="file"
                                    accept=".pdf,.docx,.txt,.xlsx"
                                    onChange={handleUpdateDocument}
                                    disabled={isUpdating}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setUpdateDocId(null); setUpdateDocName(''); }}
                                disabled={isUpdating}
                                className="px-4 py-2 rounded-lg border-none cursor-pointer transition-all hover:opacity-80 disabled:opacity-50"
                                style={{ backgroundColor: 'var(--color-bg-dark-primary)', color: 'var(--color-text-primary)' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Detail Modal */}
            {detailDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
                    <div className="rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                        {/* Header */}
                        <div className="p-6 border-b" style={{ borderColor: 'var(--color-border-slate)' }}>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-white m-0" style={{ fontFamily: 'var(--font-family-poppins)' }}>
                                            {detailDoc.original_filename}
                                        </h3>
                                        <p className="text-sm m-0 mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                            {detailDoc.file_type?.toUpperCase()} • Version {detailDoc.version}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDetailDoc(null)}
                                    className="p-2 rounded-lg border-none cursor-pointer hover:bg-white/10 transition-all"
                                    style={{ backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingDetail ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: 'var(--color-button-primary)' }}></div>
                                </div>
                            ) : (
                                <>
                                    {/* Document Info Grid */}
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                                            <p className="text-xs uppercase mb-1" style={{ color: 'var(--color-text-secondary)' }}>Status</p>
                                            {getStatusBadge(detailDoc.status)}
                                        </div>
                                        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                                            <p className="text-xs uppercase mb-1" style={{ color: 'var(--color-text-secondary)' }}>Chunks</p>
                                            <p className="text-white font-semibold m-0">{detailDoc.chunk_count || 0}</p>
                                        </div>
                                        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                                            <p className="text-xs uppercase mb-1" style={{ color: 'var(--color-text-secondary)' }}>Created</p>
                                            <p className="text-white text-sm m-0">{new Date(detailDoc.created_at).toLocaleString('id-ID')}</p>
                                        </div>
                                        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                                            <p className="text-xs uppercase mb-1" style={{ color: 'var(--color-text-secondary)' }}>Updated</p>
                                            <p className="text-white text-sm m-0">{new Date(detailDoc.updated_at).toLocaleString('id-ID')}</p>
                                        </div>
                                    </div>

                                    {/* Processing Logs */}
                                    <div>
                                        <h4 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-family-poppins)' }}>
                                            📋 Processing Logs
                                        </h4>
                                        {detailDoc.processing_logs && detailDoc.processing_logs.length > 0 ? (
                                            <div className="space-y-3">
                                                {detailDoc.processing_logs.map((log, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-start gap-3 p-3 rounded-lg"
                                                        style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}
                                                    >
                                                        <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0`} style={{
                                                            backgroundColor: log.status === 'completed' ? '#22C55E' :
                                                                log.status === 'failed' ? '#EF4444' :
                                                                    log.status === 'running' ? '#3B82F6' : '#EAB308'
                                                        }}></div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-white font-medium">{log.step}</span>
                                                                <span className="px-2 py-0.5 rounded text-xs" style={{
                                                                    backgroundColor: log.status === 'completed' ? 'rgba(34, 197, 94, 0.2)' :
                                                                        log.status === 'failed' ? 'rgba(239, 68, 68, 0.2)' :
                                                                            'rgba(234, 179, 8, 0.2)',
                                                                    color: log.status === 'completed' ? '#22C55E' :
                                                                        log.status === 'failed' ? '#EF4444' : '#EAB308'
                                                                }}>
                                                                    {log.status}
                                                                </span>
                                                            </div>
                                                            {log.message && (
                                                                <p className="text-sm m-0 mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                                                                    {log.message}
                                                                </p>
                                                            )}
                                                            <p className="text-xs m-0" style={{ color: 'var(--color-text-secondary)' }}>
                                                                {new Date(log.started_at).toLocaleString('id-ID')}
                                                                {log.ended_at && ` → ${new Date(log.ended_at).toLocaleString('id-ID')}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 rounded-xl" style={{ backgroundColor: 'var(--color-bg-dark-primary)', color: 'var(--color-text-secondary)' }}>
                                                No processing logs available
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: 'var(--color-border-slate)' }}>
                            <button
                                onClick={() => { setDetailDoc(null); setUpdateDocId(detailDoc.id); setUpdateDocName(detailDoc.original_filename); }}
                                className="px-4 py-2 rounded-lg border-none cursor-pointer transition-all hover:opacity-80"
                                style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}
                            >
                                Update Document
                            </button>
                            <button
                                onClick={() => setDetailDoc(null)}
                                className="px-4 py-2 rounded-lg border-none cursor-pointer transition-all hover:opacity-80"
                                style={{ backgroundColor: 'var(--color-bg-dark-primary)', color: 'var(--color-text-primary)' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div
                        className="w-full max-w-md bg-[#1a1c20] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
                        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(239, 68, 68, 0.1)' }}
                    >
                        {/* Header/Icon */}
                        <div className="pt-8 pb-4 flex flex-col items-center">
                            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-4">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-red-500">
                                    <path d="M19 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Delete Document?</h3>
                        </div>

                        {/* Body */}
                        <div className="px-8 pb-8 text-center" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                            <p className="text-white/60 text-sm leading-relaxed m-0 text-center">
                                Are you sure you want to delete <span className="text-red-400 font-semibold italic">"{deleteConfirm.name}"</span>?
                            </p>
                            <p className="text-white/40 text-[11px] mt-2 m-0 uppercase tracking-widest font-bold text-center">
                                This action is permanent
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="p-6 bg-black/20 flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={isDeleting}
                                className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex-1 px-6 py-3 rounded-xl bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    <span>Yes, Delete</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

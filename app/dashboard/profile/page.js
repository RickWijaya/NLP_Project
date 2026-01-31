'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = 'http://localhost:8000';

export default function ProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        business_name: '',
        email: ''
    });
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }
        fetchProfile(token);
    }, [router]);

    const fetchProfile = async (token) => {
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                localStorage.removeItem('token');
                router.push('/');
                return;
            }

            if (!response.ok) throw new Error('Failed to fetch profile');

            const data = await response.json();
            setProfile(data);
            setFormData({
                business_name: data.business_name || '',
                email: data.email || ''
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--color-button-primary)' }}></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-family-poppins)' }}>
                    👤 Profile
                </h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>Manage your account information</p>
            </div>

            {/* Success Message */}
            {success && (
                <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', border: '1px solid var(--color-button-primary)' }}>
                    <p style={{ color: 'var(--color-button-primary)' }}>✓ {success}</p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-destructive)' }}>
                    <p style={{ color: 'var(--color-destructive)' }}>✕ {error}</p>
                </div>
            )}

            {/* Profile Card */}
            <div className="rounded-2xl p-8 mb-6" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                {/* Avatar Section */}
                <div className="flex items-start gap-6 mb-8 pb-8" style={{ borderBottom: '1px solid var(--color-border-slate)' }}>
                    <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl" style={{ backgroundColor: 'var(--color-button-primary)' }}>
                        {profile?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-family-poppins)' }}>
                            {profile?.username}
                        </h2>
                        <p className="text-lg mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                            {profile?.business_name || 'No business name set'}
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--color-button-primary)' }}>
                                {profile?.is_active ? '● Active' : '○ Inactive'}
                            </span>
                            {profile?.is_superadmin && (
                                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' }}>
                                    ⭐ Super Admin
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Email */}
                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                        <label className="text-xs uppercase tracking-wider mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>
                            Email
                        </label>
                        <p className="text-white font-medium">{profile?.email}</p>
                    </div>

                    {/* Tenant ID */}
                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                        <label className="text-xs uppercase tracking-wider mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>
                            Tenant ID / Company ID
                        </label>
                        <div className="flex items-center gap-2">
                            <p className="text-white font-medium font-mono">{profile?.tenant_id}</p>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(profile?.tenant_id);
                                    setSuccess('Tenant ID copied!');
                                    setTimeout(() => setSuccess(''), 2000);
                                }}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-all"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="var(--color-text-secondary)" strokeWidth="2" />
                                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="var(--color-text-secondary)" strokeWidth="2" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Created At */}
                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                        <label className="text-xs uppercase tracking-wider mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>
                            Account Created
                        </label>
                        <p className="text-white font-medium">{profile?.created_at ? formatDate(profile.created_at) : 'N/A'}</p>
                    </div>

                    {/* Chat Link */}
                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                        <label className="text-xs uppercase tracking-wider mb-2 block" style={{ color: 'var(--color-text-secondary)' }}>
                            Your Chat Link
                        </label>
                        <div className="flex items-center gap-2">
                            <p className="text-white font-medium text-sm truncate">
                                {typeof window !== 'undefined' ? `${window.location.origin}/chat/${profile?.tenant_id}` : ''}
                            </p>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/chat/${profile?.tenant_id}`);
                                    setSuccess('Chat link copied!');
                                    setTimeout(() => setSuccess(''), 2000);
                                }}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-all flex-shrink-0"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="var(--color-text-secondary)" strokeWidth="2" />
                                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="var(--color-text-secondary)" strokeWidth="2" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                <h3 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-family-poppins)' }}>
                    Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="p-4 rounded-xl text-left hover:bg-white/5 transition-all"
                        style={{ border: '1px solid var(--color-border-slate)' }}
                    >
                        <div className="text-2xl mb-2">📄</div>
                        <p className="text-white font-medium">Manage Documents</p>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Upload and manage your knowledge base</p>
                    </button>

                    <button
                        onClick={() => router.push('/dashboard/settings')}
                        className="p-4 rounded-xl text-left hover:bg-white/5 transition-all"
                        style={{ border: '1px solid var(--color-border-slate)' }}
                    >
                        <div className="text-2xl mb-2">⚙️</div>
                        <p className="text-white font-medium">AI Settings</p>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Configure AI model and parameters</p>
                    </button>

                    <button
                        onClick={() => router.push('/dashboard/analytics')}
                        className="p-4 rounded-xl text-left hover:bg-white/5 transition-all"
                        style={{ border: '1px solid var(--color-border-slate)' }}
                    >
                        <div className="text-2xl mb-2">📊</div>
                        <p className="text-white font-medium">View Analytics</p>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Track usage and performance</p>
                    </button>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { API_URL, auth } from '@/app/lib/api';

export default function SuperAdminDashboard() {
    const router = useRouter();
    const [token, setToken] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Stats
    const [stats, setStats] = useState({
        total_tenants: 0,
        total_messages: 0,
        total_users: 0,
        total_documents: 0,
        tenants: []
    });

    // Tenants list with details
    const [tenants, setTenants] = useState([]);
    const [togglingTenant, setTogglingTenant] = useState(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
            router.push('/');
            return;
        }
        setToken(storedToken);
        fetchSuperAdminStats(storedToken);
        fetchTenants(storedToken);
    }, [router]);

    const fetchSuperAdminStats = async (authToken) => {
        try {
            const response = await fetch(`${API_URL}/analytics/superadmin/stats`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            if (response.status === 403) {
                setError('Access denied. Super admin privileges required.');
                setIsLoading(false);
                return;
            }

            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Failed to fetch superadmin stats:', err);
            setError('Failed to load statistics');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTenants = async (authToken) => {
        try {
            const response = await fetch(`${API_URL}/analytics/superadmin/tenants`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                setTenants(data.tenants || []);
            }
        } catch (err) {
            console.error('Failed to fetch tenants:', err);
        }
    };

    const toggleTenantStatus = async (tenantId) => {
        setTogglingTenant(tenantId);
        try {
            const response = await fetch(`${API_URL}/analytics/superadmin/tenants/${tenantId}/toggle`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                // Refresh data
                await fetchTenants(token);
                await fetchSuperAdminStats(token);
            }
        } catch (err) {
            console.error('Failed to toggle tenant:', err);
        } finally {
            setTogglingTenant(null);
        }
    };

    const handleLogout = () => {
        auth.logout();
        router.push('/');
    };

    // Colors for charts
    const COLORS = ['#00C0E8', '#22C55E', '#3B82F6', '#EAB308', '#EF4444', '#A855F7', '#EC4899'];

    // Prepare pie chart data
    const tenantPieData = stats.tenants.map((t, idx) => ({
        name: t.tenant_id,
        value: t.total_messages,
        fill: COLORS[idx % COLORS.length]
    })).filter(t => t.value > 0);

    const statsCards = [
        { label: 'Total Tenants', value: stats.total_tenants, icon: '🏢', color: '#A855F7' },
        { label: 'Total Messages', value: stats.total_messages, icon: '💬', color: '#00C0E8' },
        { label: 'Total Users', value: stats.total_users, icon: '👥', color: '#22C55E' },
        { label: 'Total Documents', value: stats.total_documents, icon: '📄', color: '#3B82F6' },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--color-button-primary)' }}></div>
            </div>
        );
    }

    if (error && error.includes('Access denied')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                <div className="text-6xl">🔒</div>
                <h1 className="text-2xl font-bold text-white">Access Denied</h1>
                <p className="text-gray-400 text-center max-w-md">
                    This page is only accessible to super administrators. Please contact your system administrator if you believe you should have access.
                </p>
                <Link
                    href="/dashboard"
                    className="px-6 py-3 rounded-lg font-medium text-white no-underline transition-all hover:opacity-80"
                    style={{ backgroundColor: 'var(--color-button-primary)' }}
                >
                    ← Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
            {/* Header */}
            <div className="w-full" style={{ backgroundColor: 'var(--color-bg-card)', boxShadow: 'var(--shadow-cyan-glow)' }}>
                <div className="flex flex-row justify-between items-center p-[10px_30px] min-h-[66px]">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <h1 className="font-normal text-[22px] leading-7 m-0 flex items-center gap-2" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-text-primary)' }}>
                            <span className="text-2xl">👑</span> Super Admin Dashboard
                        </h1>
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

            {/* Main Content */}
            <div className="p-8 max-w-7xl mx-auto">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    {statsCards.map((stat, index) => (
                        <div
                            key={index}
                            className="flex flex-col p-6 gap-3 rounded-xl transition-all duration-300 hover:scale-105"
                            style={{
                                backgroundColor: 'var(--color-bg-card)',
                                border: '1px solid var(--color-border-slate)',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                        >
                            <div className="flex flex-row justify-between items-start">
                                <div className="flex flex-col gap-2">
                                    <p className="font-medium text-[14px] leading-5 m-0" style={{ color: 'var(--color-text-secondary)' }}>
                                        {stat.label}
                                    </p>
                                    <p className="font-bold text-[32px] leading-10 m-0" style={{ color: stat.color }}>
                                        {stat.value.toLocaleString()}
                                    </p>
                                </div>
                                <div className="text-[32px]">{stat.icon}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Messages by Tenant Bar Chart */}
                    <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                        <h3 className="text-lg font-semibold text-white mb-4">📊 Messages by Tenant</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.tenants.slice(0, 10)} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                                    <XAxis type="number" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                                    <YAxis
                                        dataKey="tenant_id"
                                        type="category"
                                        width={100}
                                        tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--color-bg-card)',
                                            borderRadius: '12px',
                                            border: '1px solid var(--color-border-slate)',
                                            color: '#fff'
                                        }}
                                    />
                                    <Bar dataKey="total_messages" radius={[0, 8, 8, 0]}>
                                        {stats.tenants.slice(0, 10).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Documents by Tenant Pie Chart */}
                    <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                        <h3 className="text-lg font-semibold text-white mb-4">📄 Documents Distribution</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.tenants.filter(t => t.total_documents > 0)}
                                        dataKey="total_documents"
                                        nameKey="tenant_id"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label={({ tenant_id, percent }) => `${tenant_id}: ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {stats.tenants.filter(t => t.total_documents > 0).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--color-bg-card)',
                                            borderRadius: '12px',
                                            border: '1px solid var(--color-border-slate)',
                                            color: '#fff'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Tenants Table */}
                <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                            🏢 All Tenants ({tenants.length})
                        </h3>
                        <button
                            onClick={() => { fetchTenants(token); fetchSuperAdminStats(token); }}
                            className="px-4 py-2 rounded-lg border-none cursor-pointer transition-all hover:opacity-80 flex items-center gap-2"
                            style={{ backgroundColor: 'var(--color-bg-dark-primary)', color: 'var(--color-text-primary)' }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                            Refresh
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b" style={{ borderColor: 'var(--color-border-slate)' }}>
                                    <th className="text-left py-3 px-4 font-medium text-sm" style={{ color: 'var(--color-text-secondary)' }}>Tenant ID</th>
                                    <th className="text-left py-3 px-4 font-medium text-sm" style={{ color: 'var(--color-text-secondary)' }}>Business Name</th>
                                    <th className="text-left py-3 px-4 font-medium text-sm" style={{ color: 'var(--color-text-secondary)' }}>Username</th>
                                    <th className="text-left py-3 px-4 font-medium text-sm" style={{ color: 'var(--color-text-secondary)' }}>Email</th>
                                    <th className="text-center py-3 px-4 font-medium text-sm" style={{ color: 'var(--color-text-secondary)' }}>Status</th>
                                    <th className="text-center py-3 px-4 font-medium text-sm" style={{ color: 'var(--color-text-secondary)' }}>Messages</th>
                                    <th className="text-center py-3 px-4 font-medium text-sm" style={{ color: 'var(--color-text-secondary)' }}>Docs</th>
                                    <th className="text-center py-3 px-4 font-medium text-sm" style={{ color: 'var(--color-text-secondary)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.map((tenant, idx) => {
                                    const tenantStats = stats.tenants.find(t => t.tenant_id === tenant.tenant_id) || {};
                                    return (
                                        <tr
                                            key={tenant.id}
                                            className="border-b hover:bg-white/5 transition-colors"
                                            style={{ borderColor: 'var(--color-border-slate)' }}
                                        >
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    {tenant.is_super_admin && <span title="Super Admin">👑</span>}
                                                    <span className="text-white font-medium">{tenant.tenant_id}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-gray-300">{tenant.business_name || '-'}</td>
                                            <td className="py-4 px-4 text-gray-300">{tenant.username}</td>
                                            <td className="py-4 px-4 text-gray-400 text-sm">{tenant.email}</td>
                                            <td className="py-4 px-4 text-center">
                                                <span
                                                    className="px-3 py-1 rounded-full text-xs font-medium"
                                                    style={{
                                                        backgroundColor: tenant.is_active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                        color: tenant.is_active ? '#22C55E' : '#EF4444'
                                                    }}
                                                >
                                                    {tenant.is_active ? 'Active' : 'Disabled'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span className="text-cyan-400 font-medium">{tenantStats.total_messages || 0}</span>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span className="text-blue-400 font-medium">{tenantStats.total_documents || 0}</span>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link
                                                        href={`/chat/${tenant.tenant_id}`}
                                                        className="p-2 rounded-lg transition-all hover:opacity-80 no-underline"
                                                        style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}
                                                        title="View Chat"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                                        </svg>
                                                    </Link>
                                                    {!tenant.is_super_admin && (
                                                        <button
                                                            onClick={() => toggleTenantStatus(tenant.tenant_id)}
                                                            disabled={togglingTenant === tenant.tenant_id}
                                                            className="p-2 rounded-lg border-none cursor-pointer transition-all hover:opacity-80 disabled:opacity-50"
                                                            style={{
                                                                backgroundColor: tenant.is_active ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                                                color: tenant.is_active ? '#EF4444' : '#22C55E'
                                                            }}
                                                            title={tenant.is_active ? 'Disable Tenant' : 'Enable Tenant'}
                                                        >
                                                            {togglingTenant === tenant.tenant_id ? (
                                                                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                                                    <path d="M12 2a10 10 0 0 1 10 10" />
                                                                </svg>
                                                            ) : tenant.is_active ? (
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <circle cx="12" cy="12" r="10" />
                                                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                                                </svg>
                                                            ) : (
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {tenants.length === 0 && (
                        <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
                            No tenants found.
                        </div>
                    )}
                </div>

                {/* Tenant Details Cards */}
                <div className="mt-8">
                    <h3 className="text-xl font-semibold text-white mb-4">📈 Tenant Performance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stats.tenants.map((tenant, idx) => (
                            <div
                                key={tenant.tenant_id}
                                className="p-4 rounded-xl transition-all hover:scale-[1.02]"
                                style={{
                                    backgroundColor: 'var(--color-bg-card)',
                                    border: '1px solid var(--color-border-slate)'
                                }}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                    >
                                        {tenant.tenant_id.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium m-0">{tenant.tenant_id}</p>
                                        <p className="text-gray-400 text-xs m-0">{tenant.total_users} users</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                                        <p className="text-cyan-400 font-bold text-lg m-0">{tenant.total_messages}</p>
                                        <p className="text-gray-500 text-xs m-0">Messages</p>
                                    </div>
                                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                                        <p className="text-green-400 font-bold text-lg m-0">{tenant.total_chats}</p>
                                        <p className="text-gray-500 text-xs m-0">Chats</p>
                                    </div>
                                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                                        <p className="text-blue-400 font-bold text-lg m-0">{tenant.total_documents}</p>
                                        <p className="text-gray-500 text-xs m-0">Docs</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

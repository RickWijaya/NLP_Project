'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    MessageCircle, Users, FileText, Layout,
    Calendar, BarChart3, TrendingUp, RefreshCw
} from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000';

export default function AnalyticsPage() {
    const router = useRouter();
    const [token, setToken] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [analytics, setAnalytics] = useState({
        total_messages: 0,
        total_sessions: 0,
        total_users: 0,
        total_documents: 0,
        messages_today: 0,
        messages_this_week: 0,
        daily_messages: []
    });

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
            router.push('/');
            return;
        }
        setToken(storedToken);
        fetchAnalytics(storedToken);
    }, [router]);

    const fetchAnalytics = async (authToken) => {
        try {
            const response = await fetch(`${API_URL}/analytics/summary`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                setAnalytics(data);
            } else if (response.status === 401) {
                router.push('/');
            } else {
                setError('Failed to load analytics data');
            }
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
            setError('Failed to connect to server');
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate max value for chart scaling
    const maxDailyMessages = Math.max(...analytics.daily_messages.map(d => d.count), 1);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">📊 Analytics Dashboard</h1>
                <p className="text-gray-400">Track your chatbot usage and performance</p>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500 text-red-400">
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {/* Total Messages */}
                <div className="bg-[#1e293b] rounded-2xl p-6 border border-slate-800 transition-all hover:scale-[1.02] hover:border-slate-700 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                            <MessageCircle size={24} />
                        </div>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Messages</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-1">Total Messages</p>
                    <p className="text-3xl font-bold text-white tracking-tight">{analytics.total_messages.toLocaleString()}</p>
                </div>

                {/* Total Sessions */}
                <div className="bg-[#1e293b] rounded-2xl p-6 border border-slate-800 transition-all hover:scale-[1.02] hover:border-slate-700 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                            <Layout size={24} />
                        </div>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Sessions</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-1">Chat Sessions</p>
                    <p className="text-3xl font-bold text-white tracking-tight">{analytics.total_sessions.toLocaleString()}</p>
                </div>

                {/* Total Users */}
                <div className="bg-[#1e293b] rounded-2xl p-6 border border-slate-800 transition-all hover:scale-[1.02] hover:border-slate-700 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-xl bg-green-500/10 text-green-400">
                            <Users size={24} />
                        </div>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Users</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-1">Unique Users</p>
                    <p className="text-3xl font-bold text-white tracking-tight">{analytics.total_users.toLocaleString()}</p>
                </div>

                {/* Total Documents */}
                <div className="bg-[#1e293b] rounded-2xl p-6 border border-slate-800 transition-all hover:scale-[1.02] hover:border-slate-700 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
                            <FileText size={24} />
                        </div>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Knowledge</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-1">Documents</p>
                    <p className="text-3xl font-bold text-white tracking-tight">{analytics.total_documents.toLocaleString()}</p>
                </div>
            </div>

            {/* Time-based Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Messages Today */}
                <div className="bg-[#1e293b] rounded-2xl p-6 border border-slate-800 shadow-lg">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Messages Today</p>
                            <p className="text-3xl font-bold text-white tracking-tight">{analytics.messages_today.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min((analytics.messages_today / Math.max(analytics.messages_this_week, 1)) * 100, 100)}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
                        <TrendingUp size={14} />
                        {analytics.messages_today > 0 ? "Tracking activity" : "Waiting for messages"}
                    </p>
                </div>

                {/* Messages This Week */}
                <div className="bg-[#1e293b] rounded-2xl p-6 border border-slate-800 shadow-lg">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Messages This Week</p>
                            <p className="text-3xl font-bold text-white tracking-tight">{analytics.messages_this_week.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            style={{ width: `${Math.min((analytics.messages_this_week / Math.max(analytics.total_messages, 1)) * 100, 100)}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
                        <TrendingUp size={14} />
                        Weekly engagement trend
                    </p>
                </div>
            </div>

            {/* Daily Messages Chart */}
            <div className="bg-[#1e293b] rounded-2xl p-8 border border-slate-800 shadow-xl mb-8">
                <div className="flex flex-row justify-between items-center mb-10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <BarChart3 className="text-purple-400" size={24} />
                        Messages Traffic (7 Days)
                    </h2>
                    <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Updates</span>
                    </div>
                </div>

                <div className="h-[350px] w-full">
                    {analytics.daily_messages.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics.daily_messages}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    tickFormatter={(str) => {
                                        const date = new Date(str);
                                        return date.toLocaleDateString('en-US', { weekday: 'short' });
                                    }}
                                    dy={15}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    tickCount={6}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#0f172a',
                                        borderRadius: '16px',
                                        border: '1px solid #334155',
                                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                                        color: '#fff',
                                        padding: '12px'
                                    }}
                                    itemStyle={{ color: '#8b5cf6', fontWeight: 'bold' }}
                                    labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '11px' }}
                                    formatter={(value) => [`${value} Messages`, 'Traffic']}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#8b5cf6"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorCount)"
                                    animationDuration={2000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center">
                                <BarChart3 size={32} className="opacity-20" />
                            </div>
                            <p className="text-sm font-medium">No activity data available yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Refresh Button */}
            <div className="flex justify-center">
                <button
                    onClick={() => {
                        setIsLoading(true);
                        fetchAnalytics(token);
                    }}
                    className="group px-8 py-3 rounded-2xl bg-[#1e293b] hover:bg-slate-800 text-white font-semibold transition-all flex items-center gap-3 border border-slate-800 hover:border-slate-700 shadow-lg"
                >
                    <RefreshCw className="group-hover:rotate-180 transition-transform duration-700 text-purple-400" size={20} />
                    Refresh Analytics Data
                </button>
            </div>
        </div>
    );
}

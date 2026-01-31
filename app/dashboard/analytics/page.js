'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
            const response = await fetch('http://localhost:8000/analytics/summary', {
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {/* Total Messages */}
                <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-5 border border-purple-500/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Total Messages</span>
                        <span className="text-2xl">💬</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{analytics.total_messages.toLocaleString()}</p>
                </div>

                {/* Total Sessions */}
                <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl p-5 border border-blue-500/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Chat Sessions</span>
                        <span className="text-2xl">🗨️</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{analytics.total_sessions.toLocaleString()}</p>
                </div>

                {/* Total Users */}
                <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl p-5 border border-green-500/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Unique Users</span>
                        <span className="text-2xl">👥</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{analytics.total_users.toLocaleString()}</p>
                </div>

                {/* Total Documents */}
                <div className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 rounded-xl p-5 border border-orange-500/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Documents</span>
                        <span className="text-2xl">📄</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{analytics.total_documents.toLocaleString()}</p>
                </div>
            </div>

            {/* Time-based Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Messages Today */}
                <div className="bg-[#1E1E2E] rounded-xl p-6 border border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <span className="text-2xl">📅</span>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Messages Today</p>
                            <p className="text-2xl font-bold text-white">{analytics.messages_today.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                            style={{ width: `${Math.min((analytics.messages_today / Math.max(analytics.messages_this_week, 1)) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>

                {/* Messages This Week */}
                <div className="bg-[#1E1E2E] rounded-xl p-6 border border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <span className="text-2xl">📆</span>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Messages This Week</p>
                            <p className="text-2xl font-bold text-white">{analytics.messages_this_week.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                            style={{ width: `${Math.min((analytics.messages_this_week / Math.max(analytics.total_messages, 1)) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Daily Messages Chart */}
            <div className="bg-[#1E1E2E] rounded-xl p-6 border border-gray-700">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Messages (Last 7 Days)
                </h2>

                {analytics.daily_messages.length > 0 ? (
                    <div className="flex items-end justify-between gap-2 h-48">
                        {analytics.daily_messages.map((day, index) => {
                            const height = maxDailyMessages > 0
                                ? (day.count / maxDailyMessages) * 100
                                : 0;
                            const date = new Date(day.date);
                            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

                            return (
                                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                                    {/* Bar */}
                                    <div className="w-full relative flex-1 flex items-end justify-center">
                                        <div
                                            className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-purple-600 to-pink-500 transition-all duration-500 hover:from-purple-500 hover:to-pink-400"
                                            style={{ height: `${Math.max(height, 5)}%` }}
                                        >
                                            {/* Tooltip */}
                                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap">
                                                {day.count} messages
                                            </div>
                                        </div>
                                    </div>
                                    {/* Count */}
                                    <span className="text-xs text-gray-400 font-medium">{day.count}</span>
                                    {/* Day label */}
                                    <span className="text-xs text-gray-500">{dayName}</span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-48 flex items-center justify-center text-gray-500">
                        No data available yet
                    </div>
                )}
            </div>

            {/* Refresh Button */}
            <div className="mt-6 flex justify-center">
                <button
                    onClick={() => {
                        setIsLoading(true);
                        fetchAnalytics(token);
                    }}
                    className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-all flex items-center gap-2"
                >
                    🔄 Refresh Data
                </button>
            </div>
        </div>
    );
}

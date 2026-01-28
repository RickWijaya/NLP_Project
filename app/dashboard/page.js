'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function DashboardPage() {
    // Sample stats data
    const stats = [
        { label: 'Total Models', value: '12', icon: '📊', color: '#22C55E' },
        { label: 'Active Bots', value: '8', icon: '🤖', color: '#3B82F6' },
        { label: 'Total Users', value: '156', icon: '👥', color: '#F59E0B' },
        { label: 'API Calls', value: '2.4K', icon: '⚡', color: '#00C0E8' },
    ];

    // Recent activity data
    const recentActivity = [
        { action: 'New model created', model: 'User1', time: '2 hours ago' },
        { action: 'Bot activated', model: 'User2', time: '5 hours ago' },
        { action: 'Model updated', model: 'User3', time: '1 day ago' },
    ];

    return (
        <>
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
                                    Admin
                                </p>
                                <p className="font-medium text-[14px] leading-5 tracking-[-0.006em] m-0" style={{ fontFamily: 'var(--font-family-jakarta)', color: 'var(--color-text-secondary)' }}>
                                    Admin@gmail.com
                                </p>
                            </div>
                        </div>
                        <button
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
            <div className="flex-1 p-[30px]">
                <div className="flex flex-col gap-[30px]">
                    {/* Welcome Section */}
                    <div className="flex flex-col gap-2">
                        <h2 className="font-bold text-[28px] leading-9 tracking-[-0.01em] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                            Welcome back, Admin! 👋
                        </h2>
                        <p className="font-normal text-[16px] leading-6 tracking-[-0.006em] m-0" style={{ fontFamily: 'var(--font-family-jakarta)', color: 'var(--color-text-secondary)' }}>
                            Here's what's happening with your AI models today.
                        </p>
                    </div>

                    {/* Stats Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {stats.map((stat, index) => (
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

                    {/* Quick Actions & Recent Activity Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Quick Actions */}
                        <div className="flex flex-col p-6 gap-5 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                            <h3 className="font-semibold text-[20px] leading-6 tracking-[-0.006em] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                Quick Actions
                            </h3>
                            <div className="flex flex-col gap-3">
                                <Link
                                    href="/dashboard/models"
                                    className="flex flex-row items-center p-4 gap-4 rounded-lg no-underline transition-all duration-300 hover:scale-[1.02]"
                                    style={{ backgroundColor: 'var(--color-bg-dark-primary)', border: '1px solid var(--color-border-slate)' }}
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
                                            Manage Models
                                        </p>
                                        <p className="font-normal text-[14px] leading-5 tracking-[-0.006em] m-0" style={{ fontFamily: 'var(--font-family-jakarta)', color: 'var(--color-text-secondary)' }}>
                                            View and edit your AI models
                                        </p>
                                    </div>
                                    <svg className="ml-auto" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M7.5 5l5 5-5 5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </Link>
                                <Link
                                    href="/dashboard/models/add"
                                    className="flex flex-row items-center p-4 gap-4 rounded-lg no-underline transition-all duration-300 hover:scale-[1.02]"
                                    style={{ backgroundColor: 'var(--color-bg-dark-primary)', border: '1px solid var(--color-border-slate)' }}
                                >
                                    <div className="flex justify-center items-center w-12 h-12 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="12" cy="12" r="9" stroke="#3B82F6" strokeWidth="2" />
                                            <path d="M12 8v8M8 12h8" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="font-semibold text-[16px] leading-5 tracking-[-0.006em] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                            Add New Model
                                        </p>
                                        <p className="font-normal text-[14px] leading-5 tracking-[-0.006em] m-0" style={{ fontFamily: 'var(--font-family-jakarta)', color: 'var(--color-text-secondary)' }}>
                                            Create a new AI bot model
                                        </p>
                                    </div>
                                    <svg className="ml-auto" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M7.5 5l5 5-5 5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </Link>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="flex flex-col p-6 gap-5 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                            <h3 className="font-semibold text-[20px] leading-6 tracking-[-0.006em] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                Recent Activity
                            </h3>
                            <div className="flex flex-col gap-3">
                                {recentActivity.map((activity, index) => (
                                    <div
                                        key={index}
                                        className="flex flex-row items-start p-4 gap-3 rounded-lg"
                                        style={{ backgroundColor: 'var(--color-bg-dark-primary)', border: '1px solid var(--color-border-slate)' }}
                                    >
                                        <div className="flex justify-center items-center w-2 h-2 mt-2 rounded-full" style={{ backgroundColor: '#22C55E' }}></div>
                                        <div className="flex flex-col gap-1 flex-1">
                                            <p className="font-medium text-[14px] leading-5 tracking-[-0.006em] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                                {activity.action}
                                            </p>
                                            <p className="font-normal text-[13px] leading-5 tracking-[-0.006em] m-0" style={{ fontFamily: 'var(--font-family-jakarta)', color: 'var(--color-text-secondary)' }}>
                                                Model: {activity.model}
                                            </p>
                                        </div>
                                        <p className="font-normal text-[12px] leading-4 tracking-[-0.005em] m-0" style={{ fontFamily: 'var(--font-family-jakarta)', color: 'var(--color-text-secondary)' }}>
                                            {activity.time}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

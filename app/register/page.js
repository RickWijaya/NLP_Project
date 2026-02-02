'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

// Backend API URL
const API_URL = 'http://127.0.0.1:8000';

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        businessName: '',
        companyId: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.username || !formData.email || !formData.password || !formData.businessName || !formData.companyId) {
            setError('Please fill in all required fields');
            return;
        }

        if (formData.companyId.length < 3) {
            setError('Company ID must be at least 3 characters');
            return;
        }

        if (formData.username.length < 3) {
            setError('Username must be at least 3 characters');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    tenant_id: formData.companyId.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
                    business_name: formData.businessName
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Registration failed');
            }

            // Registration successful, redirect to login
            alert('Registration successful! Please login.');
            router.push('/');
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
            <div className="flex flex-col items-center p-[50px] gap-[25px] w-full max-w-[520px] rounded-[20px]" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                {/* Header with Logo */}
                <div className="flex flex-col items-center w-full gap-4">
                    <div className="flex flex-row items-center">
                        <Image
                            src="/kathy-avatar.png"
                            alt="Kathy AI"
                            width={60}
                            height={60}
                            className="object-contain"
                        />
                        <Image
                            src="/kathy-text.png"
                            alt="Kathy AI"
                            width={180}
                            height={60}
                            className="object-contain -ml-12"
                        />
                    </div>
                    <h1 className="font-bold text-[24px] leading-8 tracking-wide m-0" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-button-primary)' }}>
                        REGISTER
                    </h1>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="w-full p-3 rounded-lg text-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444' }}>
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col items-start gap-[16px] w-full">
                    {/* Username */}
                    <div className="flex flex-col items-start gap-[6px] w-full">
                        <label htmlFor="username" className="font-normal text-[14px] leading-[21px]" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-text-primary)' }}>
                            Username *
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full h-[44px] px-4 rounded-[8px] text-[14px] focus:outline-none focus:ring-2 transition-all"
                            style={{
                                backgroundColor: 'var(--color-bg-card)',
                                border: '1px solid var(--color-border-slate)',
                                fontFamily: 'var(--font-family-poppins)',
                                color: 'var(--color-text-primary)'
                            }}
                        />
                    </div>

                    {/* Email */}
                    <div className="flex flex-col items-start gap-[6px] w-full">
                        <label htmlFor="email" className="font-normal text-[14px] leading-[21px]" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-text-primary)' }}>
                            Email *
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full h-[44px] px-4 rounded-[8px] text-[14px] focus:outline-none focus:ring-2 transition-all"
                            style={{
                                backgroundColor: 'var(--color-bg-card)',
                                border: '1px solid var(--color-border-slate)',
                                fontFamily: 'var(--font-family-poppins)',
                                color: 'var(--color-text-primary)'
                            }}
                        />
                    </div>

                    {/* Business Name */}
                    <div className="flex flex-col items-start gap-[6px] w-full">
                        <label htmlFor="businessName" className="font-normal text-[14px] leading-[21px]" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-text-primary)' }}>
                            Business Name *
                        </label>
                        <input
                            id="businessName"
                            name="businessName"
                            type="text"
                            value={formData.businessName}
                            onChange={handleChange}
                            className="w-full h-[44px] px-4 rounded-[8px] text-[14px] focus:outline-none focus:ring-2 transition-all"
                            style={{
                                backgroundColor: 'var(--color-bg-card)',
                                border: '1px solid var(--color-border-slate)',
                                fontFamily: 'var(--font-family-poppins)',
                                color: 'var(--color-text-primary)'
                            }}
                        />
                    </div>

                    {/* Company ID (Tenant ID) */}
                    <div className="flex flex-col items-start gap-[6px] w-full">
                        <label htmlFor="companyId" className="font-normal text-[14px] leading-[21px]" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-text-primary)' }}>
                            Company ID * <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>(untuk link chat)</span>
                        </label>
                        <input
                            id="companyId"
                            name="companyId"
                            type="text"
                            placeholder="contoh: toko_baju, bank_abc"
                            value={formData.companyId}
                            onChange={handleChange}
                            className="w-full h-[44px] px-4 rounded-[8px] text-[14px] focus:outline-none focus:ring-2 transition-all"
                            style={{
                                backgroundColor: 'var(--color-bg-card)',
                                border: '1px solid var(--color-border-slate)',
                                fontFamily: 'var(--font-family-poppins)',
                                color: 'var(--color-text-primary)'
                            }}
                        />
                        <p className="text-xs m-0" style={{ color: 'var(--color-text-secondary)' }}>
                            Link chat kamu: localhost:3000/chat/<span style={{ color: '#00C0E8' }}>{formData.companyId || 'company_id'}</span>
                        </p>
                    </div>
                    <div className="flex flex-col items-start gap-[6px] w-full">
                        <label htmlFor="password" className="font-normal text-[14px] leading-[21px]" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-text-primary)' }}>
                            Password *
                        </label>
                        <div className="relative w-full">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full h-[44px] px-4 pr-12 rounded-[8px] text-[14px] focus:outline-none focus:ring-2 transition-all"
                                style={{
                                    backgroundColor: 'var(--color-bg-card)',
                                    border: '1px solid var(--color-border-slate)',
                                    fontFamily: 'var(--font-family-poppins)',
                                    color: 'var(--color-text-primary)'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                {showPassword ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="flex flex-col items-start gap-[6px] w-full">
                        <label htmlFor="confirmPassword" className="font-normal text-[14px] leading-[21px]" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-text-primary)' }}>
                            Confirm Password *
                        </label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="w-full h-[44px] px-4 rounded-[8px] text-[14px] focus:outline-none focus:ring-2 transition-all"
                            style={{
                                backgroundColor: 'var(--color-bg-card)',
                                border: '1px solid var(--color-border-slate)',
                                fontFamily: 'var(--font-family-poppins)',
                                color: 'var(--color-text-primary)'
                            }}
                        />
                    </div>

                    {/* Register Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-[50px] rounded-[8px] font-bold text-[18px] leading-[27px] text-center border-none cursor-pointer hover:opacity-90 transition-all duration-300 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            backgroundColor: 'var(--color-button-primary)',
                            fontFamily: 'var(--font-family-poppins)',
                            color: 'var(--color-text-primary)'
                        }}
                    >
                        {isLoading ? 'Registering...' : 'Register'}
                    </button>
                </form>

                {/* Login Link */}
                <div className="flex flex-row items-center justify-center gap-2">
                    <p className="font-normal text-[14px] leading-[21px] m-0" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-text-primary)' }}>
                        Already have an account?
                    </p>
                    <Link href="/" className="font-normal text-[14px] leading-[21px] no-underline hover:underline transition-all" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-button-primary)' }}>
                        Login
                    </Link>
                </div>
            </div>
        </main>
    );
}

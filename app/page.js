'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!username || !password) {
      alert('Please fill in all fields');
      return;
    }
    console.log('Login attempt:', { username, password });
    alert(`Login attempt with username: ${username}`);
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
      <div className="flex flex-col items-center p-[50px] gap-[25px] w-full max-w-[520px] rounded-[20px]" style={{ backgroundColor: 'var(--color-bg-card)' }}>
        {/* Header with Logo and LOGIN text */}
        <div className="flex flex-col items-center w-full gap-4">
          {/* Logo */}
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

          {/* LOGIN Text */}
          <h1 className="font-bold text-[24px] leading-8 tracking-wide m-0" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-button-primary)' }}>
            LOGIN
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col items-start gap-[20px] w-full">
          {/* Username */}
          <div className="flex flex-col items-start gap-[8px] w-full">
            <label htmlFor="username" className="font-normal text-[16px] leading-[24px]" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-text-primary)' }}>
              Username :
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder=""
              className="w-full h-[48px] px-5 rounded-[8px] text-[15px] leading-[22px] focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border-slate)',
                fontFamily: 'var(--font-family-poppins)',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col items-start gap-[8px] w-full">
            <label htmlFor="password" className="font-normal text-[16px] leading-[24px]" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-text-primary)' }}>
              Password :
            </label>
            <div className="relative w-full">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                className="w-full h-[48px] px-5 pr-12 rounded-[8px] text-[15px] leading-[22px] focus:outline-none focus:ring-2 transition-all"
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
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full h-[50px] rounded-[8px] font-bold text-[18px] leading-[27px] text-center border-none cursor-pointer hover:opacity-90 transition-all duration-300 mt-2"
            style={{
              backgroundColor: 'var(--color-button-primary)',
              fontFamily: 'var(--font-family-poppins)',
              color: 'var(--color-text-primary)'
            }}
          >
            Login
          </button>
        </form>

        {/* Register Link */}
        <div className="flex flex-row items-center justify-center gap-2">
          <p className="font-normal text-[14px] leading-[21px] m-0" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-text-primary)' }}>
            Don't Have an Account?
          </p>
          <Link href="/register" className="font-normal text-[14px] leading-[21px] no-underline hover:underline transition-all" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-button-primary)' }}>
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}

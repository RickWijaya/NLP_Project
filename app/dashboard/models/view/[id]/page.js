'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function ViewModelPage({ params }) {
    const router = useRouter();
    // Sample data - in real app, fetch based on params.id
    const botData = {
        name: 'User1',
        status: 'active',
        previewLink: 'localhost:3000/chat/kathy1',
        model: 'Local',
        documents: [
            { name: 'FileName.pdf', size: '9000mb' },
            { name: 'FileName.csv', size: '9000mb' },
            { name: 'FileName.word', size: '9000mb' },
        ]
    };

    return (
        <>
            {/* Header Bar */}
            <div className="w-full" style={{ backgroundColor: 'var(--color-bg-card)', boxShadow: 'var(--shadow-cyan-glow)' }}>
                <div className="flex flex-row justify-between items-center p-[10px_20px] gap-6 w-full h-[66px]">
                    {/* Left Side - Back Button + Title */}
                    <div className="flex flex-row items-start p-[10px_20px] gap-[10px] h-[46px]">
                        <button onClick={() => router.back()} className="w-7 h-7 flex items-center justify-center text-[#E5E7EB] hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor" />
                            </svg>
                        </button>
                        <h1 className="font-medium text-[22px] leading-7 m-0" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-text-primary)' }}>
                            Manage Your Model
                        </h1>
                    </div>

                    {/* Right Side - User Profile + Logout */}
                    <div className="flex flex-row items-center p-0 gap-4 h-[46px]">
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
                            className="flex justify-center items-center p-4 w-10 h-10 rounded-full bg-transparent border-none cursor-pointer hover:opacity-80 transition-all duration-300"
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

            {/* Main Content */}
            <div className="flex-1 p-[30px]">
                {/* View Bot Header */}
                <button onClick={() => router.back()} className="flex flex-row items-center p-[10px] gap-[10px] w-[140px] h-[43px] mb-[10px] bg-transparent border-none cursor-pointer hover:opacity-80 transition-opacity">
                    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="#E5E7EB" />
                    </svg>
                    <h2 className="font-bold text-[20px] leading-5 tracking-[-0.006em] text-white m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                        View Bot
                    </h2>
                </button>

                {/* Content Card */}
                <div className="flex flex-row items-start p-5 gap-[10px] w-full max-w-[1080px] mx-auto rounded-[20px]" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                    <div className="flex flex-col items-start p-[0_16px] gap-[10px] w-full">
                        {/* Bot Name */}
                        <div className="flex flex-col items-end p-0 gap-2 w-full">
                            <h3 className="w-full font-bold text-[20px] leading-5 tracking-[-0.006em] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                {botData.name}
                            </h3>
                        </div>

                        {/* Status Badge */}
                        <div className="flex flex-row items-center p-[10px_0] gap-[10px] w-full h-[25px]">
                            <div className="flex flex-row items-center p-[8px_0] w-full h-[30px]">
                                <div className="box-border flex flex-row justify-center items-center p-[4px_8px] gap-1 w-11 h-6 rounded-full" style={{ border: '1px solid var(--color-button-primary)' }}>
                                    <span className="font-semibold text-[12px] leading-4 text-center tracking-[-0.005em]" style={{ fontFamily: 'var(--font-family-jakarta)', color: 'var(--color-button-primary)' }}>
                                        {botData.status === 'active' ? 'Aktif' : 'Non Aktif'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Preview Link Section */}
                        <div className="flex flex-col items-start p-0 gap-2 w-full mt-4">
                            <div className="flex flex-col items-start p-[10px] gap-[10px] w-full">
                                <label className="font-medium text-[14px] leading-5 tracking-[-0.006em] text-white" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                    Preview Link
                                </label>
                                <div className="box-border flex flex-col items-start p-0 gap-4 w-full rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                                    <div className="flex flex-row items-center p-[0_10px] gap-4 w-full h-[31px] rounded-[20px]">
                                        <span className="flex-1 font-medium text-[14px] leading-5 tracking-[-0.006em] text-[#E5E7EB]" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                            {botData.previewLink}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AI Model Section */}
                        <div className="flex flex-col items-start p-0 gap-2 w-full">
                            <div className="flex flex-col items-start p-[10px] gap-[10px] w-full">
                                <label className="font-medium text-[14px] leading-5 tracking-[-0.006em] text-white" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                    AI Model
                                </label>
                                <div className="box-border flex flex-col items-start p-0 gap-4 w-full rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                                    <div className="flex flex-row items-center p-[0_10px] gap-4 w-full h-[31px] rounded-[20px]">
                                        <span className="flex-1 font-medium text-[14px] leading-5 tracking-[-0.006em] text-[#E5E7EB]" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                            {botData.model}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Document Section */}
                        <div className="flex flex-col items-start p-0 gap-2 w-full mt-4">
                            <div className="flex flex-row items-center p-0 gap-4 w-full h-5">
                                <h3 className="flex-1 font-medium text-[14px] leading-5 tracking-[-0.006em] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                    Document
                                </h3>
                            </div>

                            {/* Document Cards */}
                            <div className="box-border flex flex-row items-start p-[10px] gap-[10px] w-full h-[148px]" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                                {botData.documents.map((doc, index) => (
                                    <div key={index} className="box-border flex flex-col justify-center items-center p-[10px] gap-[5px] w-[95px] h-32 rounded-[10px]" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                                        {/* File Icon */}
                                        <svg width="74" height="74" viewBox="0 0 74 74" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="12" y="6" width="50" height="62" rx="4" stroke="#E5E7EB" strokeWidth="4" fill="none" />
                                            <line x1="20" y1="20" x2="54" y2="20" stroke="#E5E7EB" strokeWidth="3" />
                                            <line x1="20" y1="30" x2="54" y2="30" stroke="#E5E7EB" strokeWidth="3" />
                                            <line x1="20" y1="40" x2="44" y2="40" stroke="#E5E7EB" strokeWidth="3" />
                                        </svg>

                                        {/* File Name */}
                                        <p className="font-medium text-[8px] leading-5 tracking-[-0.006em] text-white m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                            {doc.name}
                                        </p>

                                        {/* File Size */}
                                        <p className="font-medium text-[8px] leading-5 text-center tracking-[-0.006em] m-0" style={{ fontFamily: 'var(--font-family-jakarta)', color: 'var(--color-text-secondary)' }}>
                                            {doc.size}
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

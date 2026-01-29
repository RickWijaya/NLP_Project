'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AddModelPage() {
    const router = useRouter();
    const [botName, setBotName] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('');
    const [files, setFiles] = useState([]); // Store uploaded files in an array

    // Handle file change
    const handleFileChange = (e) => {
        const selectedFiles = e.target.files;
        if (selectedFiles && selectedFiles.length > 0) {
            const fileArray = Array.from(selectedFiles).map(file => ({
                file,
                name: file.name,
                icon: getFileIcon(file.type),
            }));
            setFiles(prevFiles => [...prevFiles, ...fileArray]);
        }
    };

    // Function to determine the file icon based on the file type
    const getFileIcon = (fileType) => {
        if (fileType.includes('pdf')) return '/pdficon.png'; // Reference file from public folder
        if (fileType.includes('word')) return '/wordicon.png'; // Reference file from public folder
        return '/texticon.png'; // Default for .txt files
    };

    // Handle file removal
    const handleRemoveFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log({ botName, apiKey, model, files });
        // Handle form submission
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
                        <h1 className="font-medium text-[22px] leading-7 m-0" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-text-primary)' }} >
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

            {/* Main Content */}
            <div className="flex-1 p-[30px]">
                {/* Add New Bot Header */}
                <button onClick={() => router.back()} className="flex flex-row items-center p-[10px] gap-[10px] w-[176px] h-[43px] mb-[10px] bg-transparent border-none cursor-pointer hover:opacity-80 transition-opacity">
                    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="#E5E7EB" />
                    </svg>
                    <h2 className="font-bold text-[20px] leading-5 tracking-[-0.006em] text-white m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                        Add new bot
                    </h2>
                </button>

                {/* Form Card */}
                <div className="flex flex-row items-start p-5 gap-[10px] w-full max-w-[1080px] mx-auto rounded-[20px]" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                    <form onSubmit={handleSubmit} className="flex flex-col items-start p-[0_16px] gap-[10px] w-full">
                        {/* Bot Name Input */}
                        <div className="flex flex-col items-end p-0 gap-2 w-full">
                            <div className="flex flex-col items-end p-0 gap-4 w-full">
                                <label className="w-full font-medium text-[14px] leading-5 tracking-[-0.006em] text-[#E5E7EB]" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                    Bot Name
                                </label>
                                <div className="box-border flex flex-row items-center p-3 gap-3 w-full h-12 min-h-12 rounded-lg" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                                    <input
                                        type="text"
                                        placeholder="Enter bot name"
                                        value={botName}
                                        onChange={(e) => setBotName(e.target.value)}
                                        className="w-full h-[22px] bg-transparent border-none outline-none font-medium text-[16px] leading-[22px] tracking-[-0.007em]"
                                        style={{ fontFamily: 'var(--font-family-jakarta)', color: 'var(--color-text-primary)' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* API Key Input */}
                        <div className="flex flex-col items-end p-0 gap-2 w-full">
                            <div className="flex flex-col items-end p-0 gap-4 w-full">
                                <label className="w-full font-medium text-[14px] leading-5 tracking-[-0.006em] text-[#E5E7EB]" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                    Key
                                </label>
                                <div className="box-border flex flex-row items-center p-3 gap-3 w-full h-12 min-h-12 rounded-lg" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                                    <input
                                        type="text"
                                        placeholder="Enter API key"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="w-full h-[22px] bg-transparent border-none outline-none font-medium text-[16px] leading-[22px] tracking-[-0.007em]"
                                        style={{ fontFamily: 'var(--font-family-jakarta)', color: 'var(--color-text-primary)' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Model Dropdown */}
                        <div className="flex flex-col items-end p-0 gap-2 w-full">
                            <div className="flex flex-col items-end p-0 gap-4 w-full">
                                <label className="w-full font-medium text-[14px] leading-5 tracking-[-0.006em] text-[#E5E7EB]" style={{ fontFamily: 'var(--font-family-jakarta)' }}>
                                    Model
                                </label>
                                <div className="box-border flex flex-row items-center p-3 gap-3 w-full h-12 min-h-12 rounded-lg relative" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                                    <select
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        className="w-full h-[36px] bg-transparent border-none outline-none font-medium text-[16px] leading-[22px] tracking-[-0.007em] appearance-none cursor-pointer"
                                        style={{
                                            fontFamily: 'var(--font-family-jakarta)',
                                            color: model ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                            backgroundColor: 'var(--color-bg-dark-primary)',
                                            border: '1px solid var(--color-border-slate)',
                                            borderRadius: '8px',
                                            padding: '0px 10px',
                                        }}
                                    >
                                        <option value="">Select model</option>
                                        <option value="local">Local</option>
                                        <option value="grok">Grok</option>
                                    </select>

                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute right-3 pointer-events-none" style={{ transform: 'rotate(-90deg)' }}>
                                        <path d="M12.5 15l-5-5 5-5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Document Upload */}
                        <div className="flex flex-col items-end p-0 gap-2 w-full mt-4">
                            <div className="flex flex-col items-start p-0 gap-4 w-full">
                                <div className="flex flex-row items-center p-0 gap-4 w-full h-10">
                                    <h3 className="flex-1 font-medium text-[14px] leading-5 tracking-[-0.006em] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }} >
                                        Document
                                    </h3>
                                    <button
                                        type="button"
                                        className="flex flex-row justify-center items-center p-[10px_16px] gap-2 w-[117px] h-10 rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity"
                                        style={{ backgroundColor: 'var(--color-button-primary)', fontFamily: 'var(--font-family-jakarta)' }}
                                        onClick={() => document.getElementById('file-upload').click()}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="10" cy="10" r="9" stroke="white" strokeWidth="2" />
                                            <path d="M10 6v8M6 10h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                        <span className="font-bold text-[14px] leading-5 tracking-[-0.006em] text-white">Add File</span>
                                    </button>
                                </div>

                                {/* File List */}
                                <div className="box-border flex flex-col items-start p-6 gap-[10px] w-full h-[162px] rounded-[32px]" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px dashed var(--color-border-slate)' }}>
                                    <div className="flex flex-col items-center p-0 gap-6 w-full">
                                        {files.length > 0 && files.map((file, index) => (
                                            <div key={index} className="flex flex-row items-center justify-between w-full p-2">
                                                <div className="flex flex-row items-center gap-2">
                                                    <div className="w-6 h-6">
                                                        <Image src={file.icon} alt="file icon" width={24} height={24} />
                                                    </div>
                                                    <p className="font-medium text-[14px] leading-5 tracking-[-0.006em] text-[#E5E7EB]">{file.name}</p>
                                                </div>
                                                <button onClick={() => handleRemoveFile(index)} className="text-red-500">Remove</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <input
                                    id="file-upload"
                                    type="file"
                                    accept=".pdf,.doc,.docx,.txt"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end w-full mt-6">
                            <button
                                type="submit"
                                className="flex flex-row justify-center items-center p-[10px_16px] gap-2 w-[150px] h-10 rounded-lg border-none cursor-pointer hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: 'var(--color-button-primary)', fontFamily: 'var(--font-family-jakarta)' }}
                            >
                                <span className="font-bold text-[14px] leading-5 tracking-[-0.006em] text-white">Save Model</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

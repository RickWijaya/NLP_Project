'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const API_URL = 'http://127.0.0.1:8000';

export default function ModelsPage() {
    const router = useRouter();
    const [username, setUsername] = useState('Admin');
    const [loading, setLoading] = useState(true);
    const [apiModels, setApiModels] = useState([]);
    const [localModels, setLocalModels] = useState([]);
    const [currentSettings, setCurrentSettings] = useState(null);
    const [activeTab, setActiveTab] = useState('api');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [token, setToken] = useState('');
    const [downloadingModels, setDownloadingModels] = useState(new Set());

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUsername = localStorage.getItem('username');

        if (!storedToken) {
            router.push('/');
            return;
        }

        setToken(storedToken);
        setUsername(storedUsername || 'Admin');
        fetchModels(storedToken);
        fetchCurrentSettings(storedToken);
    }, [router]);

    const fetchModels = async (authToken) => {
        try {
            const response = await fetch(`${API_URL}/admin/available-models`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setApiModels(data.api_models || []);
                setLocalModels(data.local_models || []);
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('Fetch models failed with status:', response.status, errorData);
                setError(`Server returned ${response.status}: ${errorData.detail || 'Failed to load models'}`);
            }
        } catch (err) {
            console.error('Failed to fetch models:', err);
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const fetchCurrentSettings = async (authToken) => {
        try {
            const response = await fetch(`${API_URL}/admin/settings`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setCurrentSettings(data);
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        }
    };

    const handleSelectModel = async (modelKey, modelType) => {
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`${API_URL}/admin/settings`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model_type: modelType,
                    api_model: modelType === 'api' ? modelKey : currentSettings?.api_model,
                    local_model: modelType === 'local' ? modelKey : currentSettings?.local_model
                })
            });

            if (response.ok) {
                setSuccess(`Successfully switched to ${modelKey}!`);
                await fetchCurrentSettings(token);
                setTimeout(() => setSuccess(''), 3000);
            } else {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to update model');
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('tenant_id');
        router.push('/');
    };

    const isCurrentModel = (modelKey, modelType) => {
        if (!currentSettings) return false;
        if (currentSettings.model_type !== modelType) return false;
        if (modelType === 'api') return currentSettings.api_model === modelKey;
        if (modelType === 'local') return currentSettings.local_model === modelKey;
        return false;
    };

    const handleDownloadModel = async (modelKey) => {
        setError('');
        setSuccess('');

        // Add to downloading set
        setDownloadingModels(prev => new Set([...prev, modelKey]));

        try {
            const response = await fetch(`${API_URL}/admin/models/download`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ model_key: modelKey })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.status === 'already_downloaded') {
                    setSuccess(`Model ${modelKey} is already downloaded!`);
                    // Refresh models list
                    await fetchModels(token);
                } else if (data.status === 'downloading') {
                    setSuccess(`Download started for ${modelKey}. This may take several minutes...`);
                    // Poll for completion
                    pollDownloadStatus(modelKey);
                }
            } else {
                throw new Error(data.detail || 'Failed to start download');
            }
        } catch (err) {
            setError(err.message);
            setDownloadingModels(prev => {
                const newSet = new Set(prev);
                newSet.delete(modelKey);
                return newSet;
            });
        }
    };

    const pollDownloadStatus = async (modelKey) => {
        // Poll every 5 seconds to check if model is downloaded
        const checkStatus = async () => {
            try {
                const response = await fetch(`${API_URL}/admin/available-models`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    const model = data.local_models?.find(m => m.key === modelKey);
                    if (model?.is_downloaded) {
                        setLocalModels(data.local_models || []);
                        setDownloadingModels(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(modelKey);
                            return newSet;
                        });
                        setSuccess(`Model ${modelKey} downloaded successfully!`);
                        return true;
                    }
                }
            } catch (err) {
                console.error('Error checking download status:', err);
            }
            return false;
        };

        // Check every 5 seconds for up to 10 minutes
        let attempts = 0;
        const maxAttempts = 120; // 10 minutes

        const interval = setInterval(async () => {
            attempts++;
            const done = await checkStatus();
            if (done || attempts >= maxAttempts) {
                clearInterval(interval);
                if (attempts >= maxAttempts) {
                    setError(`Download timeout for ${modelKey}. Please check server logs.`);
                    setDownloadingModels(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(modelKey);
                        return newSet;
                    });
                }
            }
        }, 5000);
    };

    return (
        <div className="w-full">
            {/* Header Bar */}
            <div className="w-full" style={{ backgroundColor: 'var(--color-bg-card)', boxShadow: 'var(--shadow-cyan-glow)' }}>
                <div className="flex flex-row justify-between items-center p-[10px_30px] min-h-[66px]">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="p-2 rounded-lg hover:bg-white/10 transition-all" style={{ color: 'var(--color-text-secondary)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </Link>
                        <h1 className="font-semibold text-[22px] m-0" style={{ fontFamily: 'var(--font-family-poppins)', color: 'var(--color-text-primary)' }}>
                            🤖 AI Models
                        </h1>
                    </div>
                    <div className="flex flex-row items-center gap-4">
                        <div className="flex flex-row items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                                <Image src="/kathy-avatar.png" alt="Admin" width={40} height={40} className="w-full h-full object-cover" />
                            </div>
                            <p className="font-bold text-[16px] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>{username}</p>
                        </div>
                        <button onClick={handleLogout} className="p-2 rounded-lg border-none cursor-pointer hover:bg-white/10" style={{ backgroundColor: 'transparent', color: 'var(--color-destructive)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="currentColor" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-8 max-w-5xl mx-auto">
                {/* Current Model Info */}
                {currentSettings && (
                    <div className="mb-8 p-6 rounded-2xl" style={{ backgroundColor: 'var(--color-bg-card)', border: '2px solid var(--color-button-primary)' }}>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                                ✓
                            </div>
                            <div>
                                <p className="text-sm m-0 mb-1" style={{ color: 'var(--color-text-secondary)' }}>Currently Active Model</p>
                                <p className="text-xl font-bold text-white m-0">
                                    {currentSettings.model_type === 'api' ? currentSettings.api_model : currentSettings.local_model}
                                </p>
                                <p className="text-sm m-0 mt-1" style={{ color: 'var(--color-button-primary)' }}>
                                    {currentSettings.model_type === 'api' ? '☁️ Cloud API' : '💻 Local Model'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success/Error Messages */}
                {success && (
                    <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', border: '1px solid var(--color-button-primary)' }}>
                        <p className="m-0" style={{ color: 'var(--color-button-primary)' }}>✓ {success}</p>
                    </div>
                )}
                {error && (
                    <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-destructive)' }}>
                        <p className="m-0" style={{ color: 'var(--color-destructive)' }}>✕ {error}</p>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('api')}
                        className="px-6 py-3 rounded-xl font-medium transition-all border-none cursor-pointer"
                        style={{
                            backgroundColor: activeTab === 'api' ? 'var(--color-button-primary)' : 'var(--color-bg-card)',
                            color: activeTab === 'api' ? 'white' : 'var(--color-text-secondary)'
                        }}
                    >
                        ☁️ API Models ({apiModels.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('local')}
                        className="px-6 py-3 rounded-xl font-medium transition-all border-none cursor-pointer"
                        style={{
                            backgroundColor: activeTab === 'local' ? 'var(--color-button-primary)' : 'var(--color-bg-card)',
                            color: activeTab === 'local' ? 'white' : 'var(--color-text-secondary)'
                        }}
                    >
                        💻 Local Models ({localModels.length})
                    </button>
                </div>

                {/* Models Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--color-button-primary)' }}></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeTab === 'api' ? (
                            apiModels.length > 0 ? apiModels.map((model) => (
                                <div
                                    key={model.key}
                                    className="p-5 rounded-xl transition-all hover:scale-[1.02]"
                                    style={{
                                        backgroundColor: 'var(--color-bg-card)',
                                        border: isCurrentModel(model.key, 'api') ? '2px solid var(--color-button-primary)' : '1px solid var(--color-border-slate)'
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-lg font-semibold text-white m-0" style={{ fontFamily: 'var(--font-family-poppins)' }}>
                                                {model.name}
                                            </h3>
                                            <p className="text-sm m-0 mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                                {model.description}
                                            </p>
                                        </div>
                                        {isCurrentModel(model.key, 'api') && (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#22C55E' }}>
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <code className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-bg-dark-primary)', color: 'var(--color-text-secondary)' }}>
                                            {model.key}
                                        </code>
                                        {isCurrentModel(model.key, 'api') ? (
                                            <span
                                                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                                                style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#22C55E' }}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <path d="M20 6L9 17l-5-5" />
                                                </svg>
                                                Selected
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleSelectModel(model.key, 'api')}
                                                className="px-4 py-2 rounded-lg border-none cursor-pointer transition-all hover:opacity-80"
                                                style={{ backgroundColor: 'var(--color-button-primary)', color: 'white' }}
                                            >
                                                Use This Model
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-2 text-center py-12 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}>
                                    No API models available
                                </div>
                            )
                        ) : (
                            localModels.length > 0 ? localModels.map((model) => (
                                <div
                                    key={model.key}
                                    className="p-5 rounded-xl transition-all hover:scale-[1.02]"
                                    style={{
                                        backgroundColor: 'var(--color-bg-card)',
                                        border: isCurrentModel(model.key, 'local') ? '2px solid var(--color-button-primary)' : '1px solid var(--color-border-slate)'
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-lg font-semibold text-white m-0" style={{ fontFamily: 'var(--font-family-poppins)' }}>
                                                {model.name}
                                            </h3>
                                            <p className="text-sm m-0 mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                                {model.description}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {model.is_downloaded && (
                                                <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#3B82F6' }}>
                                                    Downloaded
                                                </span>
                                            )}
                                            {isCurrentModel(model.key, 'local') && (
                                                <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#22C55E' }}>
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <code className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-bg-dark-primary)', color: 'var(--color-text-secondary)' }}>
                                                {model.key}
                                            </code>
                                            {model.size && (
                                                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                                    {model.size}
                                                </span>
                                            )}
                                        </div>
                                        {model.is_downloaded && (
                                            isCurrentModel(model.key, 'local') ? (
                                                <span
                                                    className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                                                    style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#22C55E' }}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                        <path d="M20 6L9 17l-5-5" />
                                                    </svg>
                                                    Selected
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleSelectModel(model.key, 'local')}
                                                    className="px-4 py-2 rounded-lg border-none cursor-pointer transition-all hover:opacity-80"
                                                    style={{ backgroundColor: 'var(--color-button-primary)', color: 'white' }}
                                                >
                                                    Use This Model
                                                </button>
                                            )
                                        )}
                                        {!model.is_downloaded && (
                                            <button
                                                onClick={() => handleDownloadModel(model.key)}
                                                disabled={downloadingModels.has(model.key)}
                                                className="px-4 py-2 rounded-lg border-none cursor-pointer transition-all hover:opacity-80 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                style={{ backgroundColor: '#3B82F6', color: 'white' }}
                                            >
                                                {downloadingModels.has(model.key) ? (
                                                    <>
                                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                        </svg>
                                                        Downloading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                                                        </svg>
                                                        Download
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-2 text-center py-12 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}>
                                    No local models available
                                </div>
                            )
                        )}
                    </div>
                )}

                {/* Info Card */}
                <div className="mt-8 p-6 rounded-2xl" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-slate)' }}>
                    <h4 className="text-lg font-semibold text-white mb-3" style={{ fontFamily: 'var(--font-family-poppins)' }}>
                        💡 About AI Models
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                            <p className="font-medium text-white m-0 mb-2">☁️ API Models (Groq)</p>
                            <p className="text-sm m-0" style={{ color: 'var(--color-text-secondary)' }}>
                                Fast, powerful cloud-based models. Requires internet connection. Best for production use.
                            </p>
                        </div>
                        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-dark-primary)' }}>
                            <p className="font-medium text-white m-0 mb-2">💻 Local Models (Ollama)</p>
                            <p className="text-sm m-0" style={{ color: 'var(--color-text-secondary)' }}>
                                Run on your machine. No internet needed. Best for privacy and offline use.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

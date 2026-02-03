'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, auth } from '@/app/lib/api';

export default function SettingsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Settings state
    const [settings, setSettings] = useState({
        model_type: 'api',
        api_model: 'llama-3.3-70b-versatile',
        local_model: 'tinyllama',
        temperature: 0.7,
        max_new_tokens: 512,
        top_p: 0.9,
        top_k: 50,
        min_p: 0.0,
        repetition_penalty: 1.1,
        top_k_chunks: 5,
        relevance_threshold: 0.1,
        system_prompt: '',
        no_context_prompt: ''
    });

    // Available models
    const [availableModels, setAvailableModels] = useState({
        api_models: [],
        local_models: [],
        local_llm_available: false
    });

    useEffect(() => {
        if (!auth.isAuthenticated()) {
            router.push('/');
            return;
        }
        fetchSettings();
        fetchAvailableModels();
    }, [router]);

    const fetchSettings = async () => {
        try {
            const data = await adminApi.getSettings();
            setSettings(data);
        } catch (err) {
            console.error('Failed to fetch settings:', err);
            if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                router.push('/');
            } else {
                setError('Failed to load settings');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAvailableModels = async () => {
        try {
            const data = await adminApi.getAvailableModels();
            setAvailableModels(data);
        } catch (err) {
            console.error('Failed to fetch models:', err);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        setSuccess('');

        try {
            // Exclude read-only fields
            const { tenant_id, id, created_at, updated_at, ...settingsToSave } = settings;
            await adminApi.updateSettings(settingsToSave);
            setSuccess('Settings saved successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to save settings');
        } finally {
            setIsSaving(false);
            // Scroll to top so notification is visible
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">AI Settings</h1>
                <p className="text-gray-400">Configure your chatbot's AI model and behavior</p>
            </div>

            {/* Alerts */}
            {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500 text-red-400">
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-6 p-4 rounded-lg bg-green-500/20 border border-green-500 text-green-400">
                    {success}
                </div>
            )}

            {/* Model Selection - Link to Models Page */}
            <div className="bg-[#1E1E2E] rounded-xl p-6 mb-6 border border-gray-700">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    AI Model
                </h2>

                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50 border border-gray-600">
                    <div>
                        <p className="text-white font-medium">
                            {settings.model_type === 'api' ? '☁️ API Model' : '💻 Local Model'}
                        </p>
                        <p className="text-gray-400 text-sm">
                            {settings.model_type === 'api' ? settings.api_model : settings.local_model}
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard/models')}
                        className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-all flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Change Model
                    </button>
                </div>
            </div>

            {/* Generation Parameters */}
            <div className="bg-[#1E1E2E] rounded-xl p-6 mb-6 border border-gray-700">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Generation Parameters
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Temperature */}
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">
                            Temperature: {settings.temperature}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={settings.temperature}
                            onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Precise (0)</span>
                            <span>Creative (2)</span>
                        </div>
                    </div>

                    {/* Max Tokens */}
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">
                            Max Tokens: {settings.max_new_tokens}
                        </label>
                        <input
                            type="range"
                            min="64"
                            max="4096"
                            step="64"
                            value={settings.max_new_tokens}
                            onChange={(e) => handleChange('max_new_tokens', parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>64</span>
                            <span>4096</span>
                        </div>
                    </div>

                    {/* Top P */}
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">
                            Top P: {settings.top_p}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={settings.top_p}
                            onChange={(e) => handleChange('top_p', parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                    </div>

                    {/* Top K */}
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">
                            Top K: {settings.top_k}
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="100"
                            step="1"
                            value={settings.top_k}
                            onChange={(e) => handleChange('top_k', parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                    </div>

                    {/* Repetition Penalty */}
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">
                            Repetition Penalty: {settings.repetition_penalty}
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="2"
                            step="0.05"
                            value={settings.repetition_penalty}
                            onChange={(e) => handleChange('repetition_penalty', parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                    </div>
                </div>
            </div>

            {/* Retrieval Settings */}
            <div className="bg-[#1E1E2E] rounded-xl p-6 mb-6 border border-gray-700">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    RAG Retrieval Settings
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top K Chunks */}
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">
                            Top K Chunks: {settings.top_k_chunks}
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="20"
                            step="1"
                            value={settings.top_k_chunks}
                            onChange={(e) => handleChange('top_k_chunks', parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Number of document chunks to retrieve</p>
                    </div>

                    {/* Relevance Threshold */}
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">
                            Relevance Threshold: {settings.relevance_threshold}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={settings.relevance_threshold}
                            onChange={(e) => handleChange('relevance_threshold', parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Minimum similarity score (0 = all, 1 = exact match)</p>
                    </div>
                </div>
            </div>

            {/* Prompt Customization */}
            <div className="bg-[#1E1E2E] rounded-xl p-6 mb-6 border border-gray-700">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Prompt Customization
                </h2>

                {/* System Prompt */}
                <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-2">System Prompt</label>
                    <textarea
                        value={settings.system_prompt || ''}
                        onChange={(e) => handleChange('system_prompt', e.target.value)}
                        placeholder="Enter a custom system prompt to define your AI's personality and behavior..."
                        rows={4}
                        className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to use default system prompt</p>
                </div>

                {/* No Context Prompt */}
                <div>
                    <label className="block text-gray-400 text-sm mb-2">No Context Fallback Prompt</label>
                    <textarea
                        value={settings.no_context_prompt || ''}
                        onChange={(e) => handleChange('no_context_prompt', e.target.value)}
                        placeholder="Response when no relevant documents are found..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">Message shown when AI can't find relevant information</p>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`px-8 py-3 rounded-lg font-semibold text-white transition-all ${isSaving
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-purple-500/25'
                        }`}
                >
                    {isSaving ? (
                        <span className="flex items-center gap-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Saving...
                        </span>
                    ) : (
                        '💾 Save Settings'
                    )}
                </button>
            </div>
        </div>
    );
}

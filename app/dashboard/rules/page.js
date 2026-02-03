'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const API_URL = 'http://127.0.0.1:8000';

export default function RulesPage() {
    const router = useRouter();
    const [username, setUsername] = useState('Admin');
    const [loading, setLoading] = useState(true);
    const [rules, setRules] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [token, setToken] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [formData, setFormData] = useState({
        trigger_text: '',
        answer_text: '',
        match_type: 'contains',
        is_active: true
    });

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUsername = localStorage.getItem('username');

        if (!storedToken) {
            router.push('/');
            return;
        }

        setToken(storedToken);
        setUsername(storedUsername || 'Admin');
        fetchRules(storedToken);
    }, [router]);

    const fetchRules = async (authToken) => {
        try {
            const response = await fetch(`${API_URL}/admin/qa-rules/`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRules(data);
            } else {
                setError('Failed to fetch rules');
            }
        } catch (err) {
            console.error('Failed to fetch rules:', err);
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const url = editingRule
                ? `${API_URL}/admin/qa-rules/${editingRule.id}`
                : `${API_URL}/admin/qa-rules/`;

            const method = editingRule ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setSuccess(editingRule ? 'Rule updated successfully!' : 'Rule created successfully!');
                fetchRules(token);
                handleCloseModal();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                const data = await response.json();
                setError(data.detail || 'Operation failed');
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this rule?')) return;

        try {
            const response = await fetch(`${API_URL}/admin/qa-rules/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok || response.status === 204) {
                setSuccess('Rule deleted successfully!');
                fetchRules(token);
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError('Failed to delete rule');
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleOpenModal = (rule = null) => {
        if (rule) {
            setEditingRule(rule);
            setFormData({
                trigger_text: rule.trigger_text,
                answer_text: rule.answer_text,
                match_type: rule.match_type,
                is_active: rule.is_active
            });
        } else {
            setEditingRule(null);
            setFormData({
                trigger_text: '',
                answer_text: '',
                match_type: 'contains',
                is_active: true
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingRule(null);
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
                            📋 Q&A Rules
                        </h1>
                    </div>
                    <div className="flex flex-row items-center gap-4">
                        <div className="flex flex-row items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                                <Image src="/kathy-avatar.png" alt="Admin" width={40} height={40} className="w-full h-full object-cover" />
                            </div>
                            <p className="font-bold text-[16px] text-[#E5E7EB] m-0" style={{ fontFamily: 'var(--font-family-jakarta)' }}>{username}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-8 max-w-6xl mx-auto">
                {/* Actions */}
                <div className="flex justify-between items-center mb-8">
                    <p className="text-gray-400">Define hardcoded answers for specific questions.</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-6 py-3 rounded-xl font-medium text-white transition-all hover:opacity-90 border-none cursor-pointer flex items-center gap-2"
                        style={{ backgroundColor: 'var(--color-button-primary)' }}
                    >
                        <span>+</span> Add New Rule
                    </button>
                </div>

                {/* Messages */}
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

                {/* Rules Table */}
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Loading rules...</div>
                    ) : rules.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                            <p className="text-xl mb-4">No rules defined yet.</p>
                            <button
                                onClick={() => handleOpenModal()}
                                className="text-indigo-400 hover:text-indigo-300 underline"
                            >
                                Create your first rule
                            </button>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    <th className="p-5 font-semibold text-gray-300">Trigger Text</th>
                                    <th className="p-5 font-semibold text-gray-300">Answer</th>
                                    <th className="p-5 font-semibold text-gray-300">Match</th>
                                    <th className="p-5 font-semibold text-gray-300">Status</th>
                                    <th className="p-5 font-semibold text-right text-gray-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rules.map((rule) => (
                                    <tr key={rule.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="p-5 font-medium text-white max-w-[200px] truncate" title={rule.trigger_text}>
                                            {rule.trigger_text}
                                        </td>
                                        <td className="p-5 text-gray-400 max-w-[300px] truncate" title={rule.answer_text}>
                                            {rule.answer_text}
                                        </td>
                                        <td className="p-5">
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                {rule.match_type}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${rule.is_active
                                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                    : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                                }`}>
                                                {rule.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right">
                                            <button
                                                onClick={() => handleOpenModal(rule)}
                                                className="px-3 py-1 text-sm text-indigo-400 hover:text-indigo-300 mr-2"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(rule.id)}
                                                className="px-3 py-1 text-sm text-red-400 hover:text-red-300"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: '#1E1E1E' }}>
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">
                                {editingRule ? 'Edit Rule' : 'New Q&A Rule'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-white">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Trigger Text (User Question)</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.trigger_text}
                                    onChange={(e) => setFormData({ ...formData, trigger_text: e.target.value })}
                                    placeholder="e.g., Who is the dean?"
                                    className="w-full p-3 rounded-xl bg-black/20 border border-white/10 text-white focus:border-indigo-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">The bot will look for this text in the user's message.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Answer Text</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={formData.answer_text}
                                    onChange={(e) => setFormData({ ...formData, answer_text: e.target.value })}
                                    placeholder="The prepared answer..."
                                    className="w-full p-3 rounded-xl bg-black/20 border border-white/10 text-white focus:border-indigo-500 outline-none resize-none"
                                />
                            </div>

                            <div className="flex gap-6">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Match Type</label>
                                    <select
                                        value={formData.match_type}
                                        onChange={(e) => setFormData({ ...formData, match_type: e.target.value })}
                                        className="w-full p-3 rounded-xl bg-black/20 border border-white/10 text-white focus:border-indigo-500 outline-none"
                                    >
                                        <option value="contains">Contains (Fuzzy)</option>
                                        <option value="exact">Exact Match</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                                    <select
                                        value={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                                        className="w-full p-3 rounded-xl bg-black/20 border border-white/10 text-white focus:border-indigo-500 outline-none"
                                    >
                                        <option value="true">Active</option>
                                        <option value="false">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-5 py-2 rounded-lg text-gray-300 hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 rounded-lg text-white font-medium transition-opacity hover:opacity-90"
                                    style={{ backgroundColor: 'var(--color-button-primary)' }}
                                >
                                    {editingRule ? 'Save Changes' : 'Create Rule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

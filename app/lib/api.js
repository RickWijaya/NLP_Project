/**
 * Centralized API Configuration and Utilities
 * This file provides a single source of truth for API configuration
 * and common fetch utilities with authentication handling.
 */

// API Base URL - Change this for production deployment
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

/**
 * Get authorization headers with the stored token
 * @returns {Object} Headers object with Authorization
 */
export const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

/**
 * Get authorization headers for file uploads (no Content-Type)
 * @returns {Object} Headers object with Authorization only
 */
export const getUploadHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
        'Authorization': `Bearer ${token}`
    };
};

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/admin/stats')
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_URL}${endpoint}`;
    const headers = options.isUpload ? getUploadHeaders() : getAuthHeaders();

    const config = {
        ...options,
        headers: {
            ...headers,
            ...options.headers
        }
    };

    // Remove Content-Type for FormData uploads
    if (options.isUpload) {
        delete config.headers['Content-Type'];
    }

    return fetch(url, config);
};

/**
 * Handle API response and throw on error
 * @param {Response} response - Fetch response
 * @returns {Promise<Object>} Parsed JSON response
 */
export const handleResponse = async (response) => {
    const data = await response.json();

    if (!response.ok) {
        const errorMessage = typeof data.detail === 'string'
            ? data.detail
            : JSON.stringify(data.detail || data);
        throw new Error(errorMessage);
    }

    return data;
};

/**
 * Authenticated GET request
 * @param {string} endpoint - API endpoint
 * @returns {Promise<Object>} Response data
 */
export const apiGet = async (endpoint) => {
    const response = await apiRequest(endpoint);
    return handleResponse(response);
};

/**
 * Authenticated POST request
 * @param {string} endpoint - API endpoint
 * @param {Object} body - Request body
 * @returns {Promise<Object>} Response data
 */
export const apiPost = async (endpoint, body) => {
    const response = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
    });
    return handleResponse(response);
};

/**
 * Authenticated PUT request
 * @param {string} endpoint - API endpoint
 * @param {Object} body - Request body
 * @returns {Promise<Object>} Response data
 */
export const apiPut = async (endpoint, body) => {
    const response = await apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body)
    });
    return handleResponse(response);
};

/**
 * Authenticated DELETE request
 * @param {string} endpoint - API endpoint
 * @returns {Promise<Object>} Response data
 */
export const apiDelete = async (endpoint) => {
    const response = await apiRequest(endpoint, {
        method: 'DELETE'
    });
    return handleResponse(response);
};

/**
 * Upload file with authentication
 * @param {string} endpoint - API endpoint
 * @param {FormData} formData - Form data with file
 * @param {string} method - HTTP method (POST or PUT)
 * @returns {Promise<Object>} Response data
 */
export const apiUpload = async (endpoint, formData, method = 'POST') => {
    const response = await apiRequest(endpoint, {
        method,
        body: formData,
        isUpload: true
    });
    return handleResponse(response);
};

/**
 * Public API request (no authentication)
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export const publicApiRequest = async (endpoint, options = {}) => {
    const url = `${API_URL}${endpoint}`;
    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
};

// Auth utilities
export const auth = {
    /**
     * Login user and store credentials
     */
    login: async (username, password) => {
        const response = await publicApiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        const data = await handleResponse(response);

        if (typeof window !== 'undefined') {
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('username', username);
            localStorage.setItem('tenant_id', data.tenant_id || 'default_tenant');
            localStorage.setItem('is_super_admin', data.is_super_admin ? 'true' : 'false');
        }

        return data;
    },

    /**
     * Register new user
     */
    register: async (userData) => {
        const response = await publicApiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        return handleResponse(response);
    },

    /**
     * Logout user and clear credentials
     */
    logout: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('tenant_id');
            localStorage.removeItem('is_super_admin');
        }
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated: () => {
        if (typeof window !== 'undefined') {
            return !!localStorage.getItem('token');
        }
        return false;
    },

    /**
     * Check if user is super admin
     */
    isSuperAdmin: () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('is_super_admin') === 'true';
        }
        return false;
    },

    /**
     * Get current user info
     */
    getUser: () => {
        if (typeof window !== 'undefined') {
            return {
                token: localStorage.getItem('token'),
                username: localStorage.getItem('username'),
                tenantId: localStorage.getItem('tenant_id'),
                isSuperAdmin: localStorage.getItem('is_super_admin') === 'true'
            };
        }
        return null;
    }
};

// Admin API endpoints
export const adminApi = {
    getStats: () => apiGet('/admin/stats'),
    getDocuments: (page = 1, pageSize = 20) => apiGet(`/admin/documents?page=${page}&page_size=${pageSize}`),
    getDocument: (id) => apiGet(`/admin/documents/${id}`),
    uploadDocument: (formData) => apiUpload('/admin/documents', formData),
    updateDocument: (id, formData) => apiUpload(`/admin/documents/${id}`, formData, 'PUT'),
    deleteDocument: (id) => apiDelete(`/admin/documents/${id}`),
    getSettings: () => apiGet('/admin/settings'),
    updateSettings: (settings) => apiPut('/admin/settings', settings),
    getAvailableModels: () => apiGet('/admin/available-models')
};

// Chat API endpoints
export const chatApi = {
    sendMessage: (tenantId, question, sessionId = null, conversationHistory = []) => {
        return publicApiRequest('/chat/public', {
            method: 'POST',
            body: JSON.stringify({
                tenant_id: tenantId,
                question,
                session_id: sessionId,
                conversation_history: conversationHistory
            })
        }).then(handleResponse);
    },
    getSessions: (tenantId) => apiGet(`/chat/sessions?tenant_id=${tenantId}`),
    getSession: (sessionId) => apiGet(`/chat/sessions/${sessionId}`),
    createSession: (tenantId, title) => apiPost('/chat/sessions', { tenant_id: tenantId, title }),
    deleteSession: (sessionId) => apiDelete(`/chat/sessions/${sessionId}`),
    uploadDocument: (tenantId, formData) => {
        return fetch(`${API_URL}/chat/upload?tenant_id=${tenantId}`, {
            method: 'POST',
            body: formData
        }).then(handleResponse);
    }
};

// Analytics API endpoints  
export const analyticsApi = {
    getSummary: () => apiGet('/analytics/summary'),

    // Superadmin endpoints
    getSuperadminStats: () => apiGet('/analytics/superadmin/stats'),
    getTenants: () => apiGet('/analytics/superadmin/tenants'),
    toggleTenant: (tenantId) => apiPut(`/analytics/superadmin/tenants/${tenantId}/toggle`, {})
};

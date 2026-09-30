/**
 * Centralized API Client Service
 * Dynamically resolves API base URL from environment (Vite) with local dev fallback.
 */

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Helper to build headers with automatic JWT injection from localStorage
 */
export const getAuthHeaders = (additionalHeaders = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Standardized API client
 */
export const apiClient = {
  get: async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(options.headers),
      ...options,
    });
    return res;
  },

  post: async (endpoint, data = null, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(options.headers),
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
    return res;
  },

  put: async (endpoint, data = null, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(options.headers),
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
    return res;
  },

  delete: async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(options.headers),
      ...options,
    });
    return res;
  },
};

export default apiClient;

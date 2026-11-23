// ============================================================
// LEARN: axios is an HTTP client library
// It's better than fetch() because:
// 1. Automatically converts JSON
// 2. Supports request/response INTERCEPTORS
// 3. Better error handling
// 4. Request cancellation
//
// Interceptors = middleware for HTTP requests
// This file sets up a "base" axios instance all API calls use
// ============================================================

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// REQUEST INTERCEPTOR
// Runs before EVERY request is sent
// Attaches the JWT token to every request automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR
// Runs after EVERY response comes back
// Handles 401 (token expired) globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid → redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

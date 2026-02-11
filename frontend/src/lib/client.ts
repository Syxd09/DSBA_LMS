/**
 * EduMetrics API Client Configuration
 * Centralized Axios instance with interceptors
 */
import axios, { AxiosInstance, AxiosError } from 'axios';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Token expired or invalid - clear and redirect to login
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            window.location.href = '/auth';
        }
        return Promise.reject(error);
    }
);

import axios from 'axios';

// Vite proxy should forward /api to backend, or use absolute URL
// For development, we assume backend runs on localhost:3000
// But usually in Vite setup:
// "/api": { target: "http://localhost:3000", changeOrigin: true }

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 403) {
            // Clear invalid token and redirect to login
            localStorage.removeItem('token');
            // Use window.location for hard redirect to ensure state clear
            if (!window.location.pathname.includes('/auth')) {
                window.location.href = '/auth';
            }
        }
        return Promise.reject(error);
    }
);

export default api;

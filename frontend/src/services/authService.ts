/**
 * Auth Service
 * Phase 1 Refactor: Extracted from api.ts
 */
import { apiClient } from '@/lib/client';

export const authApi = {
    login: async (email: string, password: string) => {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await apiClient.post('/auth/login', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        // Store token
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        return response.data;
    },

    signup: async (email: string, password: string, fullName: string, autoLogin: boolean = true) => {
        const response = await apiClient.post('/auth/signup', {
            email,
            password,
            full_name: fullName
        });

        if (autoLogin) {
            localStorage.setItem('access_token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        return response.data;
    },

    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
    },

    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        try {
            return user ? JSON.parse(user) : null;
        } catch (e) {
            console.error('Failed to parse user from localStorage', e);
            localStorage.removeItem('user'); // Clear invalid data
            return null;
        }
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('access_token');
    }
};

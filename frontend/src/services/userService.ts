/**
 * User Service
 * Handles User Management and Profiles
 * Phase 1 Refactor: Extracted from api.ts
 */
import { apiClient } from '@/lib/client';

export const usersApi = {
    list: (params?: { role?: string; skip?: number; limit?: number }) =>
        apiClient.get('/users', { params }).then(r => r.data),

    get: (userId: string) =>
        apiClient.get(`/users/${userId}`).then(r => r.data),

    updateRole: (userId: string, role: string) =>
        apiClient.put(`/users/${userId}/role`, { role }).then(r => r.data),

    updateProfile: (data: { full_name?: string; avatar_url?: string }) =>
        apiClient.put('/users/me/profile', data).then(r => r.data),

    changePassword: (data: { current_password: string; new_password: string }) =>
        apiClient.post('/users/me/password', data).then(r => r.data),

    // Principal Actions
    delete: (userId: string) => apiClient.delete(`/users/${userId}`),

    resetPassword: (userId: string, data: { new_password: string }) =>
        apiClient.post(`/users/${userId}/reset-password`, data).then(r => r.data),
};

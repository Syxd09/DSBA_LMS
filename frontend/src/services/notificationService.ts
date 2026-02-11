/**
 * Notification Service
 * Handles User Notifications
 * Phase 1 Refactor: Extracted from api.ts
 */
import { apiClient } from '@/lib/client';

export const notificationsApi = {
    list: (params?: { skip?: number; limit?: number }) =>
        apiClient.get('/notifications', { params }).then(r => r.data),

    getUnreadCount: () =>
        apiClient.get('/notifications/unread-count').then(r => r.data),

    markAsRead: (id: string) =>
        apiClient.put(`/notifications/${id}/read`).then(r => r.data),

    markAllAsRead: () =>
        apiClient.post('/notifications/mark-all-read').then(r => r.data),
};

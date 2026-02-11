/**
 * Promotion Service
 * Handles Semester Promotions
 * Phase 1 Refactor: Created to support Cohorts.tsx
 */
import { apiClient } from '@/lib/client';

export const promotionsApi = {
    // Preview promotion eligibility
    preview: (cohortId: string) =>
        apiClient.get(`/promotions/preview/${cohortId}`).then(r => r.data),

    // Execute promotion
    execute: (cohortId: string, data: { confirm: boolean; approval_notes?: string; override_detained?: string[] }) =>
        apiClient.post(`/promotions/promote/${cohortId}`, data).then(r => r.data),

    // Get promotion history
    history: (cohortId: string) =>
        apiClient.get(`/promotions/history/${cohortId}`).then(r => r.data),

    // Get specific promotion details
    get: (promotionId: string) =>
        apiClient.get(`/promotions/${promotionId}`).then(r => r.data),

    // Rollback promotion (Principal only)
    rollback: (promotionId: string, reason: string) =>
        apiClient.post(`/promotions/${promotionId}/rollback?reason=${encodeURIComponent(reason)}`).then(r => r.data),
};

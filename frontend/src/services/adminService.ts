/**
 * Admin Service
 * Handles System Audits and Administrative Tasks
 * Phase 1 Refactor: Extracted from api.ts
 */
import { apiClient } from '@/lib/client';

export const auditApi = {
    list: (params?: { table_name?: string; action?: string; limit?: number }) =>
        apiClient.get('/audit', { params }).then(r => r.data),
};

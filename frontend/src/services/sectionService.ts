/**
 * Section Service
 * Handles Cohort Sections
 * Phase 1 Refactor: Created to support Cohorts.tsx
 */
import { apiClient } from '@/lib/client';

export const sectionsApi = {
    // List sections for a cohort
    list: (cohortId: string) =>
        apiClient.get(`/sections/by-cohort/${cohortId}`).then(r => r.data),

    // Create a new section
    create: (cohortId: string, data: { name: string }) =>
        apiClient.post(`/sections/by-cohort/${cohortId}`, data).then(r => r.data),

    // Delete a section
    delete: (sectionId: string) =>
        apiClient.delete(`/sections/${sectionId}`).then(r => r.data),
};

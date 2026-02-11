/**
 * Unit Service
 * Handles Units and Topics Management
 * Phase 1 Refactor: Created to support Units.tsx
 */
import { apiClient } from '@/lib/client';

export const unitsApi = {
    // List units for an offering
    list: (offeringId: string, includeTopics: boolean = false) =>
        apiClient.get(`/units/by-offering/${offeringId}`, { params: { include_topics: includeTopics } }).then(r => r.data),

    // Create a new unit
    create: (offeringId: string, data: { unit_no: number; name: string }) =>
        apiClient.post(`/units/by-offering/${offeringId}`, data).then(r => r.data),

    // Get a specific unit
    get: (unitId: string) =>
        apiClient.get(`/units/${unitId}`).then(r => r.data),

    // Update a unit
    update: (unitId: string, data: { unit_no?: number; name?: string }) =>
        apiClient.put(`/units/${unitId}`, data).then(r => r.data),

    // Delete a unit
    delete: (unitId: string) =>
        apiClient.delete(`/units/${unitId}`).then(r => r.data),

    // Reorder units
    reorder: (offeringId: string, unitIds: string[]) =>
        apiClient.post(`/units/by-offering/${offeringId}/reorder`, { unit_ids: unitIds }).then(r => r.data),
};

export const topicsApi = {
    // List topics for a unit
    list: (unitId: string) =>
        apiClient.get(`/units/${unitId}/topics`).then(r => r.data),

    // Create a topic
    create: (unitId: string, data: { name: string }) =>
        apiClient.post(`/units/${unitId}/topics`, data).then(r => r.data),

    // Bulk create topics
    bulkCreate: (unitId: string, topics: Array<{ name: string }>) =>
        apiClient.post(`/units/${unitId}/topics/bulk`, { topics }).then(r => r.data),

    // Update a topic
    update: (unitId: string, topicId: string, data: { name: string }) =>
        apiClient.put(`/units/${unitId}/topics/${topicId}`, data).then(r => r.data),

    // Delete a topic
    delete: (unitId: string, topicId: string) =>
        apiClient.delete(`/units/${unitId}/topics/${topicId}`).then(r => r.data),
};

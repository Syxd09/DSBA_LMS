/**
 * External Exam Service
 * Handles External Exam Management and Marks Import
 * Phase 6.2: External exam management and marks import
 */
import { apiClient } from '@/lib/client';

export const externalExamsApi = {
    // List external exams for an offering
    list: (offeringId: string) =>
        apiClient.get(`/external/offering/${offeringId}`).then(r => r.data),

    // Create a new external exam
    create: (data: { offering_id: string; cohort_id: string; max_marks?: number }) =>
        apiClient.post('/external', data).then(r => r.data),

    // Import bulk marks (from CSV)
    importMarks: (examId: string, data: Array<{ usn: string; marks: number }>) =>
        apiClient.post(`/external/${examId}/marks/bulk`, { marks: data }).then(r => r.data),

    // Get marks for an exam
    getMarks: (examId: string) =>
        apiClient.get(`/external/${examId}/marks`).then(r => r.data),

    // Lock an exam
    lock: (examId: string) =>
        apiClient.put(`/external/${examId}/lock`).then(r => r.data),
};

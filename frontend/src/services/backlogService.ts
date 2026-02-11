/**
 * Backlog Service
 * Handles Backlog Management and Analytics
 * Phase 1 Refactor: Created to support BacklogManagement.tsx
 */
import { apiClient } from '@/lib/client';

export const backlogsApi = {
    // List students with backlogs
    list: (params: { cohort_id?: string; semester?: number; is_cleared?: boolean; result?: string; usn?: string; limit?: number; page?: number }) =>
        apiClient.get('/backlog/students', { params }).then(r => r.data),

    // Get backlog history for a student
    getHistory: (studentUsn: string) =>
        apiClient.get(`/backlog/student/${studentUsn}`).then(r => r.data),

    // Record a new backlog attempt
    record: (data: { student_usn: string; offering_id: string; exam_type: string; semester_attempted: number; academic_year: string; external_marks?: number; internal_marks_carried?: number; result?: string; grade?: string }) =>
        apiClient.post('/backlog/attempt', data).then(r => r.data),

    // Update a backlog attempt
    update: (attemptId: string, data: Partial<{ external_marks: number; result: string; grade: string; is_cleared: boolean }>) =>
        apiClient.patch(`/backlog/attempt/${attemptId}`, data).then(r => r.data),

    // Get backlog analytics
    analytics: (params?: { cohort_id?: string; academic_year?: string }) =>
        apiClient.get('/backlog/analytics', { params }).then(r => r.data),
};

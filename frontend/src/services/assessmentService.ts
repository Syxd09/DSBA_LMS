/**
 * Assessment Service
 * Handles Assignments, Attendance, and Activity Marks
 * Phase 1 Refactor: Extracted from api.ts
 */
import { apiClient } from '@/lib/client';

export const assessmentApi = {
    // ==== Assignments ====
    // List assignments for an offering
    listAssignments: (offeringId: string) =>
        apiClient.get(`/assessment/offering/${offeringId}/assignments`).then(r => r.data),

    // Create assignment (HOD+)
    createAssignment: (offeringId: string, data: {
        assignment_no: number;
        title?: string;
        max_marks?: number;
        due_before_exam?: 'INT1' | 'INT2';
    }) =>
        apiClient.post(`/assessment/offering/${offeringId}/assignments`, data).then(r => r.data),

    // Get marks for an assignment
    getAssignmentMarks: (assignmentId: string) =>
        apiClient.get(`/assessment/assignment/${assignmentId}/marks`).then(r => r.data),

    // Bulk save marks for an assignment
    saveAssignmentMarks: (assignmentId: string, marks: Array<{ usn: string; marks: number }>) =>
        apiClient.post(`/assessment/assignment/${assignmentId}/marks`, { marks }).then(r => r.data),

    // ==== Attendance ====
    // Get attendance marks for an offering
    getAttendance: (offeringId: string) =>
        apiClient.get(`/assessment/offering/${offeringId}/attendance`).then(r => r.data),

    // Bulk import attendance marks
    importAttendance: (offeringId: string, marks: Array<{ usn: string; marks: number }>) =>
        apiClient.post(`/assessment/offering/${offeringId}/attendance/bulk`, { marks }).then(r => r.data),

    // ==== Activity ====
    // Get activity marks for an offering
    getActivity: (offeringId: string) =>
        apiClient.get(`/assessment/offering/${offeringId}/activity`).then(r => r.data),

    // Bulk import activity marks
    importActivity: (offeringId: string, marks: Array<{ usn: string; marks: number }>) =>
        apiClient.post(`/assessment/offering/${offeringId}/activity/bulk`, { marks }).then(r => r.data),
};

export const assignmentsApi = {
    list: (params?: { teacher_id?: string; subject_id?: string; cohort_id?: string }) =>
        apiClient.get('/assignments', { params }).then(r => r.data),

    create: (data: { teacher_id: string; subject_id: string; cohort_id: string; academic_year: string }) =>
        apiClient.post('/assignments', data).then(r => r.data),

    delete: (id: string) => apiClient.delete(`/assignments/${id}`),
};

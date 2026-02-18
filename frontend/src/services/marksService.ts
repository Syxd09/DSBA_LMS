/**
 * Marks Service
 * Handles Exams, Marks Entry, Grading, and CO-PO Mappings
 * Phase 1 Refactor: Extracted from api.ts
 */
import { apiClient } from '@/lib/client';
import { Exam, StudentMark } from '@/types/marks';

// Exams API
export const examsApi = {
    list: (params?: { subject_id?: string; cohort_id?: string; offering_id?: string; status_filter?: string }) =>
        apiClient.get<Exam[]>('/exams', { params }).then(r => r.data),

    create: (data: { subject_id: string; cohort_id: string; exam_type: string; max_marks: number }) =>
        apiClient.post<Exam>('/exams', data).then(r => r.data),

    get: (id: string) => apiClient.get<Exam>(`/exams/${id}`).then(r => r.data),

    updateStructure: (id: string, sections: any[], confirmWipeMarks: boolean = false) =>
        apiClient.put(`/exams/${id}/structure`, { sections }, {
            params: { confirm_wipe_marks: confirmWipeMarks }
        }).then(r => r.data),

    publish: (id: string) => apiClient.post(`/exams/${id}/publish`).then(r => r.data),

    // Exam workflow endpoints
    submit: (id: string) => apiClient.post(`/exams/${id}/submit`).then(r => r.data),

    approve: (id: string) => apiClient.post(`/exams/${id}/approve`).then(r => r.data),

    lock: (id: string) => apiClient.post(`/exams/${id}/lock`).then(r => r.data),

    unlock: (id: string, reason: string) =>
        apiClient.post(`/exams/${id}/unlock`, null, { params: { reason } }).then(r => r.data),

    reject: (id: string, reason: string) =>
        apiClient.post(`/exams/${id}/reject`, { reason }).then(r => r.data),

    revert: (id: string, reason: string) =>
        apiClient.post(`/exams/${id}/revert`, null, { params: { reason } }).then(r => r.data),

    delete: (id: string) => apiClient.delete(`/exams/${id}`),
};

// Marks API
export const marksApi = {
    getExamMarks: (examId: string) =>
        apiClient.get<StudentMark[]>(`/marks/exam/${examId}`).then(r => r.data),

    saveMarks: (examId: string, marks: Array<{ student_id: string; sub_question_id: string; marks: number }>) =>
        apiClient.post(`/marks/exam/${examId}`, { exam_id: examId, marks }).then(r => r.data),

    computeMarks: (examId: string) =>
        apiClient.post(`/marks/compute/${examId}`).then(r => r.data),

    getStudentMarks: (studentId: string) =>
        apiClient.get(`/marks/student/${studentId}`).then(r => r.data),

    downloadMarksTemplate: (examId: string) =>
        apiClient.get(`/marks/template/${examId}`, {
            responseType: 'blob'
        }).then(r => r.data),

    importMarks: (examId: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post<{ success: boolean; imported_marks: number; errors: string[] }>(
            `/marks/import/${examId}`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        ).then(r => r.data);
    },
};

// Grading API
export const gradingApi = {
    // Grade Scales
    getScales: () => apiClient.get('/grading/scales').then(r => r.data),
    createScale: (data: { name: string; description?: string }) =>
        apiClient.post('/grading/scales', data).then(r => r.data),

    // Grading Rules
    getRules: () => apiClient.get('/grading/rules').then(r => r.data),
    createRule: (data: { grade_scale_id: string; grade: string; min_percentage: number; max_percentage: number; grade_point: number; description?: string }) =>
        apiClient.post('/grading/rules', data).then(r => r.data),
    deleteRule: (id: string) => apiClient.delete(`/grading/rules/${id}`),

    calculateGrades: (cohortId: string, subjectId: string) =>
        apiClient.post('/grading/calculate', { cohort_id: cohortId, subject_id: subjectId }).then(r => r.data),

    getFinalMarks: (params?: { cohort_id?: string; subject_id?: string }) =>
        apiClient.get('/grading/final-marks', { params }).then(r => r.data),
};

// CO-PO Mapping API
export const coPoMappingApi = {
    list: (params?: { offering_id?: string; program_id?: string }) =>
        apiClient.get('/mappings/co-po', { params }).then(r => r.data),

    getMatrix: (offeringId: string) =>
        apiClient.get(`/mappings/co-po/matrix/${offeringId}`).then(r => r.data),

    saveMapping: (data: { co_id: string; po_id: string; correlation_level: number }) =>
        apiClient.post('/mappings/co-po', data).then(r => r.data),

    bulkSave: (mappings: Array<{ co_id: string; po_id: string; correlation_level: number }>) =>
        apiClient.post('/mappings/co-po/bulk', { mappings }).then(r => r.data),

    deleteMapping: (mappingId: string) =>
        apiClient.delete(`/mappings/co-po/${mappingId}`),

    getTraceability: (programId: string) =>
        apiClient.get(`/mappings/traceability/${programId}`).then(r => r.data),
};

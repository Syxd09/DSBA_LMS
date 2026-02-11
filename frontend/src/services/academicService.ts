/**
 * Academic Service
 * Handles Subjects, Departments, Programs, Cohorts, Enrollments
 * Phase 1 Refactor: Extracted from api.ts
 */
import { apiClient } from '@/lib/client';
import { Program, Department, Cohort, Subject, SubjectOffering } from '@/types/academic';

// Departments API
export const departmentsApi = {
    list: () => apiClient.get<Department[]>('/departments').then(r => r.data),

    create: (data: { name: string; code: string; hod_id?: string }) =>
        apiClient.post<Department>('/departments', data).then(r => r.data),

    get: (id: string) => apiClient.get<Department>(`/departments/${id}`).then(r => r.data),

    update: (id: string, data: { name?: string; code?: string; hod_id?: string }) =>
        apiClient.put<Department>(`/departments/${id}`, data).then(r => r.data),

    delete: (id: string) => apiClient.delete(`/departments/${id}`),
};

// Programs API
export const programsApi = {
    list: (params?: { department_id?: string }) =>
        apiClient.get<Program[]>('/programs', { params }).then(r => r.data),

    create: (data: { name: string; code: string; department_id?: string; duration_years?: number }) =>
        apiClient.post<Program>('/programs', data).then(r => r.data),

    get: (id: string) => apiClient.get<Program>(`/programs/${id}`).then(r => r.data),

    update: (id: string, data: { name?: string; code?: string; department_id?: string; duration_years?: number }) =>
        apiClient.put<Program>(`/programs/${id}`, data).then(r => r.data),

    delete: (id: string) => apiClient.delete(`/programs/${id}`),

    // Program Outcomes (PO) CRUD
    listOutcomes: (programId: string) =>
        apiClient.get(`/programs/${programId}/outcomes`).then(r => r.data),

    createOutcome: (programId: string, data: { po_number: number; description: string }) =>
        apiClient.post(`/programs/${programId}/outcomes`, { ...data, program_id: programId }).then(r => r.data),

    updateOutcome: (programId: string, poId: string, data: { description?: string; threshold?: number }) =>
        apiClient.put(`/programs/${programId}/outcomes/${poId}`, data).then(r => r.data),

    deleteOutcome: (programId: string, poId: string) =>
        apiClient.delete(`/programs/${programId}/outcomes/${poId}`),
};

// Cohorts API
export const cohortsApi = {
    list: (params?: { program_id?: string }) =>
        apiClient.get<Cohort[]>('/cohorts', { params }).then(r => r.data),

    create: (data: { program_id: string; year: number; name: string; current_semester?: number }) =>
        apiClient.post<Cohort>('/cohorts', data).then(r => r.data),

    get: (id: string) => apiClient.get<Cohort>(`/cohorts/${id}`).then(r => r.data),

    update: (id: string, data: { name?: string; current_semester?: number }) =>
        apiClient.put<Cohort>(`/cohorts/${id}`, data).then(r => r.data),

    delete: (id: string) => apiClient.delete(`/cohorts/${id}`),
};

// Subjects API
export const subjectsApi = {
    list: async (params?: { semester?: number }) => {
        const { data } = await apiClient.get<Subject[]>('/subjects', { params });
        return data;
    },
    get: async (id: string) => {
        const { data } = await apiClient.get<Subject>(`/subjects/${id}`);
        return data;
    },
    create: async (subject: { name: string; code: string; credits: number; semester: number }) => {
        const { data } = await apiClient.post<Subject>('/subjects', subject);
        return data;
    },
    update: async (id: string, subject: Partial<{ name: string; code: string; credits: number; semester: number }>) => {
        const { data } = await apiClient.put<Subject>(`/subjects/${id}`, subject);
        return data;
    },
    delete: async (id: string) => {
        const { data } = await apiClient.delete(`/subjects/${id}`);
        return data;
    },
    getOutcomes: async (subjectId: string) => {
        const { data } = await apiClient.get(`/subjects/${subjectId}/outcomes`);
        return data;
    },
    createOutcome: async (subjectId: string, outcome: { co_number: number; description: string; bloom_level: string }) => {
        const { data } = await apiClient.post(`/subjects/${subjectId}/outcomes`, outcome);
        return data;
    },
    updateOutcome: async (subjectId: string, coId: string, outcome: { co_number?: number; description?: string; bloom_level?: string }) => {
        const { data } = await apiClient.put(`/subjects/${subjectId}/outcomes/${coId}`, outcome);
        return data;
    },
    deleteOutcome: async (subjectId: string, coId: string) => {
        const { data } = await apiClient.delete(`/subjects/${subjectId}/outcomes/${coId}`);
        return data;
    },
};

// Subject Offerings API
export const offeringsApi = {
    list: (params?: { cohort_id?: string; subject_id?: string }) =>
        apiClient.get<SubjectOffering[]>('/offerings', { params }).then(r => r.data),

    get: (id: string) => apiClient.get<SubjectOffering>(`/offerings/${id}`).then(r => r.data),

    create: (data: { subject_id: string; cohort_id: string; semester_no: number; is_elective?: boolean }) =>
        apiClient.post<SubjectOffering>('/offerings', data).then(r => r.data),

    getOutcomes: (offeringId: string) =>
        apiClient.get(`/offerings/${offeringId}/outcomes`).then(r => r.data),

    createOutcome: (offeringId: string, data: { co_number: number; description: string; bloom_level: string }) =>
        apiClient.post(`/offerings/${offeringId}/outcomes`, data).then(r => r.data),

    updateOutcome: (offeringId: string, coId: string, data: { co_number?: number; description?: string; bloom_level?: string }) =>
        apiClient.put(`/offerings/${offeringId}/outcomes/${coId}`, data).then(r => r.data),

    deleteOutcome: (offeringId: string, coId: string) =>
        apiClient.delete(`/offerings/${offeringId}/outcomes/${coId}`),
};

// Enrollments API
export const enrollmentsApi = {
    list: (params?: { cohort_id?: string; usn?: string }) =>
        apiClient.get('/enrollments', { params }).then(r => r.data),

    create: (data: { usn: string; name: string; cohort_id: string; email?: string; section_id?: string; admission_semester?: number; status?: string }) =>
        apiClient.post('/enrollments', data).then(r => r.data),

    get: (usn: string) => apiClient.get(`/enrollments/${usn}`).then(r => r.data),

    update: (usn: string, data: Partial<{ name: string; email: string; cohort_id: string; section_id: string; admission_semester: number; status: string }>) =>
        apiClient.put(`/enrollments/${usn}`, data).then(r => r.data),

    delete: (usn: string) => apiClient.delete(`/enrollments/${usn}`),

    bulkUpload: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post('/enrollments/bulk-upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }).then(r => r.data);
    },
};

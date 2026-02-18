import { apiClient } from '@/lib/client';

export interface Regulation {
    id: string;
    name: string;
    code: string;
    year: number;
    description?: string;
    is_active: boolean;
    bloom_version: 'old' | 'revised';
    internal_weightage: number;
    external_weightage: number;
    created_at: string;
}

export interface RegulationCreate {
    name: string;
    code: string;
    year: number;
    college_id: string;
    description?: string;
    bloom_version?: string;
    internal_weightage?: number;
    external_weightage?: number;
}

export interface CurriculumVersion {
    id: string;
    program_id: string;
    regulation_id: string;
    version_name: string;
    effective_from: number;
    is_active: boolean;
}

export interface SubjectCreate {
    name: string;
    code: string;
    credits: number;
    semester: number;
    subject_type: string;
}

export const regulationsApi = {
    list: (activeOnly = false) =>
        apiClient.get<Regulation[]>('/regulations', { params: { active_only: activeOnly } }).then(r => r.data),

    create: (data: RegulationCreate) =>
        apiClient.post<Regulation>('/regulations', data).then(r => r.data),

    get: (id: string) =>
        apiClient.get<Regulation>(`/regulations/${id}`).then(r => r.data),

    update: (id: string, data: Partial<RegulationCreate>) =>
        apiClient.put<Regulation>(`/regulations/${id}`, data).then(r => r.data),

    // Curriculum endpoints
    getProgramCurriculum: (regulationId: string, programId: string) =>
        apiClient.get<CurriculumVersion[]>(`/regulations/${regulationId}/programs/${programId}/curriculum`).then(r => r.data),

    createProgramCurriculum: (regulationId: string, programId: string, data: { version_name: string; effective_from: number }) =>
        apiClient.post<CurriculumVersion>(`/regulations/${regulationId}/programs/${programId}/curriculum`, data).then(r => r.data),

    addSubjectToCurriculum: (regulationId: string, versionId: string, data: SubjectCreate) =>
        apiClient.post(`/regulations/${regulationId}/curriculum/${versionId}/subjects`, data).then(r => r.data),

    getCurriculumSubjects: (regulationId: string, versionId: string, semester?: number) =>
        apiClient.get(`/regulations/${regulationId}/curriculum/${versionId}/subjects`, { params: { semester } }).then(r => r.data),
};

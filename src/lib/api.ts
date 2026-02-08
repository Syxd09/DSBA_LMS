/**
 * EduMetrics API Client
 * Replaces direct Supabase calls with REST API calls to the backend
 */
import axios, { AxiosInstance, AxiosError } from 'axios';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Token expired or invalid - clear and redirect to login
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            window.location.href = '/auth';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    login: async (email: string, password: string) => {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await apiClient.post('/auth/login', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        // Store token
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        return response.data;
    },

    signup: async (email: string, password: string, fullName: string, autoLogin: boolean = true) => {
        const response = await apiClient.post('/auth/signup', {
            email,
            password,
            full_name: fullName
        });

        if (autoLogin) {
            localStorage.setItem('access_token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }

        return response.data;
    },

    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
    },

    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('access_token');
    }
};

// Users API
export const usersApi = {
    list: (params?: { role?: string; skip?: number; limit?: number }) =>
        apiClient.get('/users', { params }).then(r => r.data),

    get: (userId: string) =>
        apiClient.get(`/users/${userId}`).then(r => r.data),

    updateRole: (userId: string, role: string) =>
        apiClient.put(`/users/${userId}/role`, { role }).then(r => r.data),

    updateProfile: (data: { full_name?: string; avatar_url?: string }) =>
        apiClient.put('/users/me/profile', data).then(r => r.data),

    changePassword: (data: { current_password: string; new_password: string }) =>
        apiClient.post('/users/me/password', data).then(r => r.data),
};

// Departments API
export const departmentsApi = {
    list: () => apiClient.get('/departments').then(r => r.data),

    create: (data: { name: string; code: string; hod_id?: string }) =>
        apiClient.post('/departments', data).then(r => r.data),

    get: (id: string) => apiClient.get(`/departments/${id}`).then(r => r.data),

    update: (id: string, data: { name?: string; code?: string; hod_id?: string }) =>
        apiClient.put(`/departments/${id}`, data).then(r => r.data),

    delete: (id: string) => apiClient.delete(`/departments/${id}`),
};

// Programs API
export const programsApi = {
    list: (params?: { department_id?: string }) =>
        apiClient.get('/programs', { params }).then(r => r.data),

    create: (data: { name: string; code: string; department_id?: string; duration_years?: number }) =>
        apiClient.post('/programs', data).then(r => r.data),

    get: (id: string) => apiClient.get(`/programs/${id}`).then(r => r.data),

    update: (id: string, data: { name?: string; code?: string; department_id?: string; duration_years?: number }) =>
        apiClient.put(`/programs/${id}`, data).then(r => r.data),

    delete: (id: string) => apiClient.delete(`/programs/${id}`),
};

// Cohorts API
export const cohortsApi = {
    list: (params?: { program_id?: string }) =>
        apiClient.get('/cohorts', { params }).then(r => r.data),

    create: (data: { program_id: string; year: number; name: string; current_semester?: number }) =>
        apiClient.post('/cohorts', data).then(r => r.data),

    get: (id: string) => apiClient.get(`/cohorts/${id}`).then(r => r.data),

    update: (id: string, data: { name?: string; current_semester?: number }) =>
        apiClient.put(`/cohorts/${id}`, data).then(r => r.data),

    delete: (id: string) => apiClient.delete(`/cohorts/${id}`),
};

// Enrollments API
// Enrollments API (Now managing Students directly)
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

// Assignments API (Teacher-Subject)
export const assignmentsApi = {
    list: (params?: { teacher_id?: string; subject_id?: string; cohort_id?: string }) =>
        apiClient.get('/assignments', { params }).then(r => r.data),

    create: (data: { teacher_id: string; subject_id: string; cohort_id: string; academic_year: string }) =>
        apiClient.post('/assignments', data).then(r => r.data),

    delete: (id: string) => apiClient.delete(`/assignments/${id}`),
};

// Audit API
export const auditApi = {
    list: (params?: { table_name?: string; action?: string; limit?: number }) =>
        apiClient.get('/audit', { params }).then(r => r.data),
};

// Subjects API
export const subjectsApi = {
    list: async (params?: { semester?: number }) => {
        const { data } = await apiClient.get('/subjects', { params });
        return data;
    },
    get: async (id: string) => {
        const { data } = await apiClient.get(`/subjects/${id}`);
        return data;
    },
    create: async (subject: { name: string; code: string; credits: number; semester: number }) => {
        const { data } = await apiClient.post('/subjects', subject);
        return data;
    },
    update: async (id: string, subject: Partial<{ name: string; code: string; credits: number; semester: number }>) => {
        const { data } = await apiClient.put(`/subjects/${id}`, subject);
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

// Exams API
export const examsApi = {
    list: (params?: { subject_id?: string; cohort_id?: string; status_filter?: string }) =>
        apiClient.get('/exams', { params }).then(r => r.data),

    create: (data: { subject_id: string; cohort_id: string; exam_type: string; max_marks: number }) =>
        apiClient.post('/exams', data).then(r => r.data),

    get: (id: string) => apiClient.get(`/exams/${id}`).then(r => r.data),

    updateStructure: (id: string, sections: any[]) =>
        apiClient.put(`/exams/${id}/structure`, { sections }).then(r => r.data),

    publish: (id: string) => apiClient.post(`/exams/${id}/publish`).then(r => r.data),

    // PHASE 1: Exam workflow endpoints
    submit: (id: string) => apiClient.post(`/exams/${id}/submit`).then(r => r.data),

    approve: (id: string) => apiClient.post(`/exams/${id}/approve`).then(r => r.data),

    lock: (id: string) => apiClient.post(`/exams/${id}/lock`).then(r => r.data),

    unlock: (id: string, reason: string) =>
        apiClient.post(`/exams/${id}/unlock`, null, { params: { reason } }).then(r => r.data),

    delete: (id: string) => apiClient.delete(`/exams/${id}`),
};

// Marks API
export const marksApi = {
    getExamMarks: (examId: string) =>
        apiClient.get(`/marks/exam/${examId}`).then(r => r.data),

    saveMarks: (examId: string, marks: Array<{ student_id: string; sub_question_id: string; marks: number }>) =>
        apiClient.post(`/marks/exam/${examId}`, { exam_id: examId, marks }).then(r => r.data),

    computeMarks: (examId: string) =>
        apiClient.post(`/marks/compute/${examId}`).then(r => r.data),

    getStudentMarks: (studentId: string) =>
        apiClient.get(`/marks/student/${studentId}`).then(r => r.data),
};

// Grading API
export const gradingApi = {
    getRules: () => apiClient.get('/grading/rules').then(r => r.data),

    createRule: (data: { grade: string; min_percentage: number; max_percentage: number; grade_point: number }) =>
        apiClient.post('/grading/rules', data).then(r => r.data),

    deleteRule: (id: string) => apiClient.delete(`/grading/rules/${id}`),

    calculateGrades: (cohortId: string, subjectId: string) =>
        apiClient.post('/grading/calculate', { cohort_id: cohortId, subject_id: subjectId }).then(r => r.data),

    getFinalMarks: (params?: { cohort_id?: string; subject_id?: string }) =>
        apiClient.get('/grading/final-marks', { params }).then(r => r.data),
};

// Analytics API
export const analyticsApi = {
    getCOAttainment: (subjectId: string) =>
        apiClient.get(`/analytics/co-attainment/${subjectId}`).then(r => r.data),

    getBloomDistribution: (examId: string) =>
        apiClient.get(`/analytics/bloom/${examId}`).then(r => r.data),

    getSubjectPerformance: (cohortId: string) =>
        apiClient.get(`/analytics/subject-performance/${cohortId}`).then(r => r.data),

    getDepartmentStats: () =>
        apiClient.get('/analytics/department-stats').then(r => r.data),

    // PSO Analytics (Phase 5)
    getPSOAttainment: (programId: string) =>
        apiClient.get(`/analytics/pso-attainment/${programId}`).then(r => r.data),

    getPOPSOComparison: (programId: string) =>
        apiClient.get(`/analytics/po-pso-comparison/${programId}`).then(r => r.data),
};

// Role-Scoped Analytics API (Phase 3)
export const roleAnalyticsApi = {
    // Student analytics (own data only)
    getStudentPerformance: (regulationYear: number = 2021) =>
        apiClient.get('/analytics/role/student/performance', {
            params: { regulation_year: regulationYear }
        }).then(r => r.data),

    getStudentCOProfile: (offeringId: string) =>
        apiClient.get(`/analytics/role/student/co-profile/${offeringId}`).then(r => r.data),

    getTopicHeatmap: (offeringId: string) =>
        apiClient.get(`/analytics/role/student/topic-heatmap/${offeringId}`).then(r => r.data),

    // Faculty analytics (assigned subjects)
    getSubjectHealth: (offeringId: string) =>
        apiClient.get(`/analytics/role/faculty/subject-health/${offeringId}`).then(r => r.data),

    getQuestionAnalysis: (examId: string) =>
        apiClient.get(`/analytics/role/faculty/question-analysis/${examId}`).then(r => r.data),

    getAtRiskStudents: (offeringId: string, threshold: number = 50) =>
        apiClient.get(`/analytics/role/faculty/at-risk-students/${offeringId}`, {
            params: { threshold }
        }).then(r => r.data),

    getTopicCoverage: (offeringId: string) =>
        apiClient.get(`/analytics/role/faculty/topic-coverage/${offeringId}`).then(r => r.data),

    // HOD analytics (department-scoped)
    getDepartmentHealth: () =>
        apiClient.get('/analytics/role/hod/department-health').then(r => r.data),

    getBatchComparison: (batchYears: number[]) =>
        apiClient.get('/analytics/role/hod/batch-comparison', {
            params: { batch_years: batchYears }
        }).then(r => r.data),

    // Principal analytics (institution-wide)
    getInstitutionOverview: () =>
        apiClient.get('/analytics/role/principal/institution-overview').then(r => r.data),

    getDepartmentComparison: () =>
        apiClient.get('/analytics/role/principal/department-comparison').then(r => r.data),

    // Principal comprehensive analytics
    getComprehensiveAnalytics: () =>
        apiClient.get('/analytics/role/principal/comprehensive').then(r => r.data),

    getAccreditationReadiness: () =>
        apiClient.get('/analytics/role/principal/accreditation-readiness').then(r => r.data),

    // HOD teacher effectiveness
    getTeacherEffectiveness: () =>
        apiClient.get('/analytics/role/hod/teacher-effectiveness').then(r => r.data),
};

// Export API (for downloading data in various formats)
export const exportApi = {
    // Student exports
    studentPerformance: (format: string = 'xlsx') =>
        apiClient.get('/export/student/performance', { params: { format }, responseType: 'blob' }),

    studentTopicHeatmap: (offeringId: string, format: string = 'xlsx') =>
        apiClient.get(`/export/student/topic-heatmap/${offeringId}`, { params: { format }, responseType: 'blob' }),

    // Teacher exports
    atRiskStudents: (offeringId: string, threshold: number = 50, format: string = 'xlsx') =>
        apiClient.get(`/export/teacher/at-risk-students/${offeringId}`, {
            params: { threshold, format },
            responseType: 'blob'
        }),

    questionAnalysis: (examId: string, format: string = 'xlsx') =>
        apiClient.get(`/export/teacher/question-analysis/${examId}`, { params: { format }, responseType: 'blob' }),

    // HOD exports
    departmentHealth: (format: string = 'xlsx') =>
        apiClient.get('/export/hod/department-health', { params: { format }, responseType: 'blob' }),

    batchComparison: (batchYears: number[], format: string = 'xlsx') =>
        apiClient.get('/export/hod/batch-comparison', {
            params: { batch_years: batchYears, format },
            responseType: 'blob'
        }),

    // Principal exports
    institutionOverview: (format: string = 'xlsx') =>
        apiClient.get('/export/principal/institution-overview', { params: { format }, responseType: 'blob' }),

    departmentComparison: (format: string = 'xlsx') =>
        apiClient.get('/export/principal/department-comparison', { params: { format }, responseType: 'blob' }),
};

// Dashboard API
export const dashboardApi = {
    getPrincipalDashboard: () =>
        apiClient.get('/dashboard/principal').then(r => r.data),

    getHODDashboard: () =>
        apiClient.get('/dashboard/hod').then(r => r.data),

    getTeacherDashboard: () =>
        apiClient.get('/dashboard/teacher').then(r => r.data),

    getStudentDashboard: () =>
        apiClient.get('/dashboard/student').then(r => r.data),
};

// Templates API (Phase 2C reports)
export const templatesApi = {
    getCOAttainmentReport: (offeringId: string, format: 'json' | 'pdf' | 'xlsx' = 'json') =>
        apiClient.get(`/templates/reports/co-attainment/${offeringId}`, {
            params: { format },
            responseType: format !== 'json' ? 'blob' : 'json'
        }).then(r => r.data),

    getPOMatrixReport: (programId: string, academicYear: string, format: 'json' | 'pdf' | 'xlsx' = 'json') =>
        apiClient.get(`/templates/reports/po-matrix/${programId}`, {
            params: { academic_year: academicYear, format },
            responseType: format !== 'json' ? 'blob' : 'json'
        }).then(r => r.data),

    // PSO Matrix Report (Phase 5)
    getPSOMatrixReport: (programId: string, academicYear: string, format: 'json' | 'pdf' | 'xlsx' = 'json') =>
        apiClient.get(`/templates/reports/pso-matrix/${programId}`, {
            params: { academic_year: academicYear, format },
            responseType: format !== 'json' ? 'blob' : 'json'
        }).then(r => r.data),

    getStudentPerformanceReport: (studentId: string, format: 'json' | 'pdf' | 'xlsx' = 'json') =>
        apiClient.get(`/templates/reports/student-performance/${studentId}`, {
            params: { format },
            responseType: format !== 'json' ? 'blob' : 'json'
        }).then(r => r.data),

    // NAAC Reports (Phase 5)
    getNAACCriterion2Report: (programId: string, academicYear: string, format: 'json' | 'pdf' = 'json') =>
        apiClient.get(`/templates/reports/naac/criterion-2/${programId}`, {
            params: { academic_year: academicYear, format, year: parseInt(academicYear) },
            responseType: format !== 'json' ? 'blob' : 'json'
        }).then(r => r.data),

    getNAACCriterion3Report: (programId: string, academicYear: string, format: 'json' | 'pdf' = 'json') =>
        apiClient.get(`/templates/reports/naac/criterion-3/${programId}`, {
            params: { year: parseInt(academicYear), format },
            responseType: format !== 'json' ? 'blob' : 'json'
        }).then(r => r.data),

    getNBASARReport: (programId: string, academicYear: string, format: 'json' | 'pdf' = 'json') =>
        apiClient.get(`/templates/reports/nba/sar/${programId}`, {
            params: { year: parseInt(academicYear), format },
            responseType: format !== 'json' ? 'blob' : 'json'
        }).then(r => r.data),
};

// Backlogs API (Phase 2)
export const backlogsApi = {
    // List backlogs with filters
    list: (params?: {
        usn?: string;
        offering_id?: string;
        cohort_id?: string;
        result?: string;
        skip?: number;
        limit?: number;
    }) =>
        apiClient.get('/backlogs', { params }).then(r => r.data),

    // Get student backlog summary
    getStudentSummary: (usn: string) =>
        apiClient.get(`/backlogs/student/${usn}/summary`).then(r => r.data),

    // Record a new backlog attempt
    record: (data: {
        student_usn: string;
        offering_id: string;
        exam_type: string;
        semester_attempted: number;
        academic_year?: string;
        external_marks?: number;
        internal_marks_carried?: number;
    }) =>
        apiClient.post('/backlogs/record', data).then(r => r.data),

    // Update backlog result
    updateResult: (id: string, data: {
        external_marks: number;
        result?: string;
        grade?: string;
    }) =>
        apiClient.put(`/backlogs/${id}/result`, data).then(r => r.data),

    // Get cohort backlog analytics
    getCohortAnalytics: (cohortId: string) =>
        apiClient.get(`/backlogs/cohort/${cohortId}/analytics`).then(r => r.data),
};

// Promotions API (Phase 2)
export const promotionsApi = {
    // List promotions with filters
    list: (params?: {
        cohort_id?: string;
        academic_year?: string;
        status?: string;
        skip?: number;
        limit?: number;
    }) =>
        apiClient.get('/promotions', { params }).then(r => r.data),

    // Get cohort eligibility for promotion
    getEligibility: (cohortId: string) =>
        apiClient.get(`/promotions/cohort/${cohortId}/eligibility`).then(r => r.data),

    // Execute semester promotion
    execute: (data: {
        cohort_id: string;
        academic_year: string;
        approval_notes?: string;
    }) =>
        apiClient.post('/promotions/execute', data).then(r => r.data),

    // Get promotion details
    get: (id: string) =>
        apiClient.get(`/promotions/${id}`).then(r => r.data),

    // Rollback a promotion (Principal only)
    rollback: (id: string, reason: string) =>
        apiClient.post(`/promotions/${id}/rollback`, { reason }).then(r => r.data),
};


// Subject Offerings API (Phase A Remediation: CO Versioning)
export const offeringsApi = {
    list: (params?: { cohort_id?: string; subject_id?: string }) =>
        apiClient.get('/offerings', { params }).then(r => r.data),

    get: (id: string) => apiClient.get(`/offerings/${id}`).then(r => r.data),

    getOutcomes: (offeringId: string) =>
        apiClient.get(`/offerings/${offeringId}/outcomes`).then(r => r.data),

    createOutcome: (offeringId: string, data: { co_number: number; description: string; bloom_level: string }) =>
        apiClient.post(`/offerings/${offeringId}/outcomes`, data).then(r => r.data),

    updateOutcome: (offeringId: string, coId: string, data: { co_number?: number; description?: string; bloom_level?: string }) =>
        apiClient.put(`/offerings/${offeringId}/outcomes/${coId}`, data).then(r => r.data),

    deleteOutcome: (offeringId: string, coId: string) =>
        apiClient.delete(`/offerings/${offeringId}/outcomes/${coId}`),
};

// External Exams API (Phase B Fix: External Results)
export const externalExamsApi = {
    // Create external exam for an offering
    create: (data: { offering_id: string; cohort_id: string; max_marks?: number }) =>
        apiClient.post('/external', data).then(r => r.data),

    // List external exams for an offering
    list: (offeringId: string) =>
        apiClient.get(`/external/offering/${offeringId}`).then(r => r.data),

    // Bulk import external marks
    importMarks: (examId: string, marks: Array<{ usn: string; marks: number }>) =>
        apiClient.post(`/external/${examId}/marks/bulk`, { marks }).then(r => r.data),

    // Get external marks for an exam
    getMarks: (examId: string) =>
        apiClient.get(`/external/${examId}/marks`).then(r => r.data),

    // Lock external exam (no further edits)
    lock: (examId: string) =>
        apiClient.put(`/external/${examId}/lock`).then(r => r.data),
};

// Units API (Phase F-01: Unit Management)
export const unitsApi = {
    // List units for an offering
    list: (offeringId: string, includeTopics: boolean = false) =>
        apiClient.get(`/units/by-offering/${offeringId}`, {
            params: { include_topics: includeTopics }
        }).then(r => r.data),

    // Get single unit with topics
    get: (unitId: string) =>
        apiClient.get(`/units/${unitId}`).then(r => r.data),

    // Create unit for an offering
    create: (offeringId: string, data: { unit_no: number; name: string }) =>
        apiClient.post(`/units/by-offering/${offeringId}`, data).then(r => r.data),

    // Update unit
    update: (unitId: string, data: { unit_no?: number; name?: string }) =>
        apiClient.put(`/units/${unitId}`, data).then(r => r.data),

    // Delete unit (HOD+ only)
    delete: (unitId: string) =>
        apiClient.delete(`/units/${unitId}`),

    // Reorder units
    reorder: (offeringId: string, unitIds: string[]) =>
        apiClient.post(`/units/by-offering/${offeringId}/reorder`, { unit_ids: unitIds }).then(r => r.data),
};

// Topics API (Phase F-01: Topic Management)
export const topicsApi = {
    // List topics for a unit
    list: (unitId: string) =>
        apiClient.get(`/units/${unitId}/topics`).then(r => r.data),

    // Create topic for a unit
    create: (unitId: string, data: { name: string }) =>
        apiClient.post(`/units/${unitId}/topics`, data).then(r => r.data),

    // Bulk create topics
    createBulk: (unitId: string, topics: Array<{ name: string }>) =>
        apiClient.post(`/units/${unitId}/topics/bulk`, { topics }).then(r => r.data),

    // Update topic
    update: (unitId: string, topicId: string, data: { name?: string }) =>
        apiClient.put(`/units/${unitId}/topics/${topicId}`, data).then(r => r.data),

    // Delete topic (HOD+ only)
    delete: (unitId: string, topicId: string) =>
        apiClient.delete(`/units/${unitId}/topics/${topicId}`),
};

// Assessment Components API (F-03: Assignment, Attendance, Activity)
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

// Insights API (B-02: Rule-based personalized insights)
export const insightsApi = {
    // Get student insights (optionally scoped to an offering)
    getStudentInsights: (offeringId?: string) => {
        const params = offeringId ? { offering_id: offeringId } : {};
        return apiClient.get('/analytics/role/student/insights', { params }).then(r => r.data);
    },
};

// Topic Coverage API (B-03: Topics taught vs assessed)
export const topicCoverageApi = {
    // Get topic coverage for an offering (Faculty+)
    getOfferingCoverage: (offeringId: string) =>
        apiClient.get(`/analytics/role/faculty/topic-coverage/${offeringId}`).then(r => r.data),

    // Get student's topic-wise performance heatmap
    getStudentTopicHeatmap: (usn: string, offeringId: string) =>
        apiClient.get(`/analytics/topic-heatmap/${usn}/${offeringId}`).then(r => r.data),
};

export default apiClient;






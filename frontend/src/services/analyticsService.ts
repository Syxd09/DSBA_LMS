/**
 * Analytics Service
 * Handles Analytics, Dashboards, and Reports
 * Phase 1 Refactor: Extracted from api.ts
 */
import { apiClient } from '@/lib/client';

// Analytics API
export const analyticsApi = {
    getCOAttainment: (subjectId: string) =>
        apiClient.get(`/analytics/co/offering/${subjectId}`).then(r => r.data),

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

    getStudentInsights: (offeringId?: string) =>
        apiClient.get('/analytics/role/student/insights', {
            params: { offering_id: offeringId }
        }).then(r => r.data),

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

    // Advanced Metrics - Teacher
    getQPQI: (examId: string) =>
        apiClient.get(`/analytics/role/faculty/qpqi/${examId}`).then(r => r.data),

    getStudentConsistency: (offeringId: string, studentId: string) =>
        apiClient.get(`/analytics/role/faculty/consistency/${offeringId}/${studentId}`).then(r => r.data),

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

    getCourseAttainmentGap: (offeringId: string) =>
        apiClient.get(`/analytics/role/hod/course-gap/${offeringId}`).then(r => r.data),

    // Principal comprehensive analytics
    getComprehensiveAnalytics: () =>
        apiClient.get('/analytics/role/principal/comprehensive').then(r => r.data),

    getAccreditationReadiness: () =>
        apiClient.get('/analytics/role/principal/accreditation-readiness').then(r => r.data),

    // HOD teacher effectiveness
    getTeacherEffectiveness: () =>
        apiClient.get('/analytics/role/hod/teacher-effectiveness').then(r => r.data),

    // Principal year-on-year trend
    getYearOnYearTrend: (years?: number[]) =>
        apiClient.get('/analytics/role/principal/year-on-year-trend', {
            params: years ? { years } : {}
        }).then(r => r.data),
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

// Export API
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

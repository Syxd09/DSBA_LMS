import { apiClient } from '@/lib/client';

export const templatesApi = {
    // CO Attainment Report
    getCOAttainmentReport: (offeringId: string, format: 'pdf' | 'json' = 'pdf') =>
        apiClient.get(`/templates/co-attainment/${offeringId}`, {
            params: { format },
            responseType: 'blob'
        }).then(r => r.data),

    // Student Performance Report
    getStudentPerformanceReport: (studentId: string) =>
        apiClient.get(`/templates/student-performance/${studentId}`, {
            responseType: 'blob'
        }).then(r => r.data),

    // PO Matrix Report
    getPOMatrixReport: (programId: string, year: string, format: 'json' | 'pdf' = 'pdf') =>
        apiClient.get(`/templates/po-matrix/${programId}`, {
            params: { year, format },
            responseType: format === 'json' ? 'json' : 'blob'
        }).then(r => r.data),

    // PSO Matrix Report
    getPSOMatrixReport: (programId: string, year: string, format: 'json' | 'pdf' = 'pdf') =>
        apiClient.get(`/templates/pso-matrix/${programId}`, {
            params: { year, format },
            responseType: format === 'json' ? 'json' : 'blob'
        }).then(r => r.data),

    // NAAC Reports
    getNAACCriterion2Report: (programId: string, year: string, format: 'json' | 'pdf' = 'pdf') =>
        apiClient.get(`/templates/naac/crit2/${programId}`, {
            params: { year, format },
            responseType: format === 'json' ? 'json' : 'blob'
        }).then(r => r.data),

    getNAACCriterion3Report: (programId: string, year: string, format: 'json' | 'pdf' = 'pdf') =>
        apiClient.get(`/templates/naac/crit3/${programId}`, {
            params: { year, format },
            responseType: format === 'json' ? 'json' : 'blob'
        }).then(r => r.data),

    // NBA SAR
    getNBASARReport: (programId: string, year: string, format: 'json' | 'pdf' = 'pdf') =>
        apiClient.get(`/templates/nba/sar/${programId}`, {
            params: { year, format },
            responseType: format === 'json' ? 'json' : 'blob'
        }).then(r => r.data),

    // Generate Custom Report (if applicable)
    generateReport: (reportType: string, params: any) =>
        apiClient.post(`/templates/generate`, { report_type: reportType, ...params }, {
            responseType: 'blob'
        }).then(r => r.data),
};

import {
    FeedbackTemplate,
    TeacherStudentFeedback,
    FeedbackInput,
    StudentAnalyticsResponse,
    DepartmentAnalytics,
    CollegeAnalytics,
    RecalculateResponse
} from '../types/feedback.types';
import api from '../lib/api';

const feedbackApi = api;

// ============================================================================
// TEMPLATE APIs
// ============================================================================

export const feedbackTemplateApi = {
    /**
     * List all active templates (role-filtered by backend)
     */
    list: async (): Promise<FeedbackTemplate[]> => {
        const response = await feedbackApi.get('/feedback-templates');
        return response.data.templates; // Backend returns {templates: [...]}
    },

    /**
     * Get template details with categories
     */
    get: async (id: string): Promise<FeedbackTemplate> => {
        const response = await feedbackApi.get(`/feedback-templates/${id}`);
        return response.data;
    },

    /**
     * Create new template (Admin/Principal only)
     */
    create: async (data: Partial<FeedbackTemplate>): Promise<FeedbackTemplate> => {
        const response = await feedbackApi.post('/feedback-templates', data);
        return response.data;
    },

    /**
     * Update template (Admin only)
     */
    update: async (id: string, data: Partial<FeedbackTemplate>): Promise<FeedbackTemplate> => {
        const response = await feedbackApi.put(`/feedback-templates/${id}`, data);
        return response.data;
    },

    /**
     * Toggle template status (Admin/Principal)
     */
    toggleStatus: async (id: string): Promise<FeedbackTemplate> => {
        // First fetch current template to determine current status
        const current = await feedbackApi.get(`/feedback-templates/${id}`);
        const response = await feedbackApi.patch(`/feedback-templates/${id}/status`, {
            isActive: !current.data.isActive
        });
        return response.data;
    }
};

// ============================================================================
// FEEDBACK APIs
// ============================================================================

export const teacherFeedbackApi = {
    /**
     * Create new feedback (DRAFT status)
     */
    create: async (data: FeedbackInput): Promise<TeacherStudentFeedback> => {
        const response = await feedbackApi.post('/teacher-feedback', data);
        return response.data;
    },

    /**
     * Get feedback by ID
     */
    get: async (id: string): Promise<TeacherStudentFeedback> => {
        const response = await feedbackApi.get(`/teacher-feedback/${id}`);
        return response.data;
    },

    /**
     * Update feedback (DRAFT only)
     */
    update: async (id: string, data: Partial<FeedbackInput>): Promise<TeacherStudentFeedback> => {
        const response = await feedbackApi.put(`/teacher-feedback/${id}`, data);
        return response.data;
    },

    /**
     * Submit feedback for approval (DRAFT → SUBMITTED)
     */
    submit: async (id: string): Promise<TeacherStudentFeedback> => {
        const response = await feedbackApi.post(`/teacher-feedback/${id}/submit`);
        return response.data;
    },

    /**
     * Approve feedback (HOD/Principal - SUBMITTED → APPROVED)
     */
    approve: async (id: string): Promise<TeacherStudentFeedback> => {
        const response = await feedbackApi.post(`/teacher-feedback/${id}/approve`);
        return response.data;
    },

    /**
     * Lock feedback permanently (Principal/Admin - APPROVED → LOCKED)
     */
    lock: async (id: string): Promise<TeacherStudentFeedback> => {
        const response = await feedbackApi.post(`/teacher-feedback/${id}/lock`);
        return response.data;
    },

    /**
     * Get teacher's own feedbacks with filters
     */
    getMyFeedbacks: async (filters?: {
        subjectId?: string;
        semester?: number;
        cohortId?: string;
        status?: string;
    }): Promise<{ feedbacks: TeacherStudentFeedback[] }> => {
        const response = await feedbackApi.get('/teacher-feedback/teacher/me', { params: filters });
        return response.data;
    },

    /**
     * Get student's feedbacks
     */
    getStudentFeedbacks: async (
        studentId: string,
        filters?: { subjectId?: string; semester?: number }
    ): Promise<{ feedbacks: TeacherStudentFeedback[] }> => {
        const response = await feedbackApi.get(`/teacher-feedback/student/${studentId}`, {
            params: filters
        });
        return response.data;
    },

    /**
     * Get pending approvals (HOD/Principal/Admin)
     * Returns SUBMITTED feedback awaiting approval
     */
    getPendingApprovals: async (filters?: {
        departmentId?: string;
    }): Promise<{ feedbacks: TeacherStudentFeedback[] }> => {
        const response = await feedbackApi.get('/teacher-feedback/pending-approvals', {
            params: filters
        });
        return response.data;
    },

    /**
     * Get final approvals (Principal/Admin)
     * Returns APPROVED feedback awaiting lock
     */
    getFinalApprovals: async (filters?: {
        departmentId?: string;
    }): Promise<{ feedbacks: TeacherStudentFeedback[] }> => {
        const response = await feedbackApi.get('/teacher-feedback/final-approvals', {
            params: filters
        });
        return response.data;
    },

    /**
     * Delete feedback (DRAFT only or Admin)
     */
    delete: async (id: string): Promise<{ message: string }> => {
        const response = await feedbackApi.delete(`/teacher-feedback/${id}`);
        return response.data;
    }
};

// ============================================================================
// ANALYTICS APIs
// ============================================================================

export const feedbackAnalyticsApi = {
    /**
     * Get student analytics
     */
    getStudentAnalytics: async (
        studentId: string,
        filters?: { subjectId?: string; semester?: number }
    ): Promise<StudentAnalyticsResponse> => {
        const response = await feedbackApi.get(`/feedback-analytics/student/${studentId}`, {
            params: filters
        });
        return response.data;
    },

    /**
     * Get department analytics (HOD/Principal/Admin)
     */
    getDepartmentAnalytics: async (
        departmentId: string,
        filters?: {
            semester?: number;
            cohortId?: string;
            teacherId?: string;
        }
    ): Promise<DepartmentAnalytics> => {
        const response = await feedbackApi.get(`/feedback-analytics/department/${departmentId}`, {
            params: filters
        });
        return response.data;
    },

    /**
     * Get college-wide analytics (Principal/Admin)
     */
    getCollegeAnalytics: async (filters?: {
        semester?: number;
        departmentId?: string;
    }): Promise<CollegeAnalytics> => {
        const response = await feedbackApi.get('/feedback-analytics/college', {
            params: filters
        });
        return response.data;
    },

    /**
     * Manual recalculation (Admin only)
     */
    recalculate: async (options: {
        studentId?: string;
        subjectId?: string;
        semester?: number;
        departmentId?: string;
        forceAll?: boolean;
    }): Promise<RecalculateResponse> => {
        const response = await feedbackApi.post('/feedback-analytics/recalculate', options);
        return response.data;
    }
};

// ============================================================================
// ERROR HANDLING WRAPPER
// ============================================================================

/**
 * Wrap API calls with standardized error handling
 */
export async function apiCall<T>(promise: Promise<T>): Promise<T> {
    try {
        return await promise;
    } catch (error: any) {
        // Handle specific HTTP error codes
        if (error.response?.status === 403) {
            throw new Error('Access denied. You do not have permission to perform this action.');
        } else if (error.response?.status === 404) {
            throw new Error('Resource not found.');
        } else if (error.response?.status === 409) {
            throw new Error('Feedback already exists for this student in this subject and semester.');
        } else if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        } else {
            throw new Error('An unexpected error occurred. Please try again.');
        }
    }
}

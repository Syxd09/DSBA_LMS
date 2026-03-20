// ============================================================================
// FEEDBACK SYSTEM TYPES
// ============================================================================

export type FeedbackStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'LOCKED';

export interface FeedbackTemplate {
    id: string;
    name: string;
    description?: string;
    departmentId?: string;
    programId?: string;
    isActive: boolean;
    isDefault: boolean;
    createdBy: string;
    categories: FeedbackTemplateCategory[];
    department?: { id: string; name: string };
    program?: { id: string; name: string };
    createdAt: string;
    updatedAt: string;
}


export interface FeedbackCategoryOption {
    id: string;
    categoryId: string;
    label: string;
    points: number;
    order: number;
    createdAt: string;
}

export interface FeedbackTemplateCategory {
    id: string;
    templateId: string;
    name: string;
    description?: string;
    question: string;
    displayOrder: number;
    options?: FeedbackCategoryOption[];
    createdAt: string;
    updatedAt: string;
}


export interface CategoryRatingInput {
    categoryId: string;
    rating: number; // 1-5
}

export interface FeedbackInput {
    studentId: string;
    subjectId: string;
    semester: number;
    cohortId: string;
    templateId: string; // Locked after creation
    starRating: number; // 1-5
    reviewText: string;
    categoryRatings: CategoryRatingInput[];
}

export interface TeacherStudentFeedback {
    id: string;
    teacherId: string;
    studentId: string;
    subjectId: string;
    departmentId?: string; // From subject relation, for filtering
    semester: number;
    cohortId: string;
    templateId: string;
    starRating: number;
    reviewText: string;
    status: FeedbackStatus;
    submittedAt?: string;
    approvedBy?: string;
    approvedAt?: string;
    lockedAt?: string;
    createdAt: string;
    updatedAt: string;

    // Relations
    teacher?: {
        id: string;
        fullName: string;
        email: string;
    };
    student?: {
        id: string;
        fullName: string;
        email: string;
        departmentId?: string;
    };
    subject?: {
        id: string;
        name: string;
        code: string;
        departmentId?: string;
    };
    cohort?: {
        id: string;
        name: string;
        year: number;
    };
    department?: {
        id: string;
        name: string;
    };
    template?: {
        id: string;
        name: string;
    };
    approver?: {
        id: string;
        fullName: string;
    };
    categoryRatings?: FeedbackCategoryRating[];
}

export interface FeedbackCategoryRating {
    id: string;
    feedbackId: string;
    categoryId: string;
    rating: number;
    category?: {
        id: string;
        name: string;
        displayOrder: number;
    };
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'STABLE';
export type MarksBand = 'HIGH' | 'MEDIUM' | 'LOW';

export interface CategoryInsight {
    categoryName: string;
    rating: number;
    interpretation: 'Strength' | 'Satisfactory' | 'Needs Improvement';
}

export interface StudentAnalytics {
    feedbackId: string;
    subject: {
        id: string;
        name: string;
        code: string;
    };
    semester: number;
    teacher: {
        id?: string;
        name?: string;
        fullName?: string; // Backend uses fullName
    };
    cohort?: {
        id: string;
        name: string;
    };
    starRating: number;
    avgMarks: number | null;
    marksBand: MarksBand | null;
    feedbackScore: number;
    alignmentIndex: number | null;
    riskLevel: RiskLevel;
    categoryInsights: CategoryInsight[];
    calculatedAt: string;
    isStale: boolean;
}

export interface DepartmentAnalytics {
    departmentId: string;
    departmentName: string;
    summary: {
        totalFeedback: number;
        avgFeedbackScore: number;
        avgMarks: number;
        avgAlignmentIndex: number;
        riskDistribution: {
            CRITICAL: number;
            HIGH: number;
            MODERATE: number;
            STABLE: number;
        };
        bandDistribution: {
            HIGH: number;
            MEDIUM: number;
            LOW: number;
        };
    };
    atRiskStudents: AtRiskStudent[];
}

export interface AtRiskStudent {
    studentId: string;
    studentName: string;
    subjectId: string;
    subjectName: string;
    riskLevel: RiskLevel;
    avgMarks: number | null;
    alignmentIndex: number | null;
}

export interface CollegeAnalytics {
    summary: {
        totalFeedback: number;
        avgFeedbackScore: number;
        avgMarks: number;
        avgAlignmentIndex: number;
        totalDepartments: number; // Added for Principal dashboard
        riskDistribution: {
            CRITICAL: number;
            HIGH: number;
            MODERATE: number;
            STABLE: number;
        };
    };
    departmentBreakdown: DepartmentBreakdown[]; // Renamed for clarity
    atRiskStudents: AtRiskStudentWithDepartment[]; // Added for college-wide view
}

export interface DepartmentBreakdown {
    departmentId: string;
    departmentName: string;
    totalFeedback: number;
    avgFeedbackScore: number;
    avgMarks: number;
    atRiskCount: number; // Added for quick reference
}

export interface AtRiskStudentWithDepartment extends AtRiskStudent {
    departmentId: string;
    departmentName: string;
}

// Legacy type for backward compatibility
export interface DepartmentComparison {
    departmentId: string;
    departmentName: string;
    totalStudents: number;
    avgFeedbackScore: number;
    avgMarks: number;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface AnalyticsFilters {
    semester?: number;
    subjectId?: string;
    cohortId?: string;
    teacherId?: string;
    departmentId?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface StudentAnalyticsResponse {
    studentId: string;
    analytics: StudentAnalytics[];
}

export interface RecalculateResponse {
    message: string;
    count: number;
    duration: string;
    mode: 'force' | 'stale-only';
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface FeedbackFormState {
    studentId: string;
    subjectId: string;
    semester: number;
    cohortId: string;
    templateId: string; // Immutable after creation
    starRating: number;
    reviewText: string;
    categoryRatings: Map<string, number>; // categoryId -> rating
}

export interface FeedbackValidationError {
    field: string;
    message: string;
}

/**
 * Shared constants for the application
 * Use these instead of magic strings throughout the codebase
 */

// Role constants (match Prisma enum)
export const ROLES = {
    ADMIN: 'ADMIN',
    PRINCIPAL: 'PRINCIPAL',
    HOD: 'HOD',
    TEACHER: 'TEACHER',
    STUDENT: 'STUDENT',
} as const;

// Exam status constants
export const EXAM_STATUS = {
    DRAFT: 'DRAFT',
    PENDING_APPROVAL: 'PENDING_APPROVAL',
    PUBLISHED: 'PUBLISHED',
    LOCKED: 'LOCKED',
} as const;

// Enrollment status constants
export const ENROLLMENT_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    GRADUATED: 'graduated',
    DROPPED: 'dropped',
} as const;

// Approval status constants
export const APPROVAL_STATUS = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
} as const;

// Attainment status constants
export const ATTAINMENT_STATUS = {
    DRAFT: 'DRAFT',
    CALCULATED: 'CALCULATED',
    UNDER_REVIEW: 'UNDER_REVIEW',
    APPROVED: 'APPROVED',
    LOCKED: 'LOCKED',
} as const;

// Selection mode constants
export const SELECTION_MODE = {
    FIRST_N: 'FIRST_N',
    BEST_N: 'BEST_N',
} as const;

// Workflow type constants
export const WORKFLOW_TYPE = {
    MARKS_APPROVAL: 'MARKS_APPROVAL',
    PROMOTION_APPROVAL: 'PROMOTION_APPROVAL',
    COPO_APPROVAL: 'COPO_APPROVAL',
} as const;

// Bloom levels
export const BLOOM_LEVELS = [
    'Remember',
    'Understand',
    'Apply',
    'Analyze',
    'Evaluate',
    'Create',
] as const;

// Message types
export const MESSAGE_TYPE = {
    TEXT: 'TEXT',
    ANNOUNCEMENT: 'ANNOUNCEMENT',
} as const;

// Grade defaults
export const GRADE_DEFAULTS = {
    PENDING: 'PENDING',
    UNGRADED: 'UNGRADED',
} as const;

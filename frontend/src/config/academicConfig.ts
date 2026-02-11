/**
 * Academic Configuration Constants
 * Centralizes hardcoded values used across the frontend.
 */

export const AcademicConfig = {
    // Pass/Fail Thresholds
    PASS_PERCENTAGE_THRESHOLD: 50, // Standard pass mark
    DISTINCTION_THRESHOLD: 75,

    // Analytics Thresholds
    AT_RISK_THRESHOLD: 60, // Students below this need attention
    CO_ATTAINMENT_TARGET: 60, // Target % for CO attainment
    DEPARTMENT_HEALTH_THRESHOLD: 75, // Department pass percentage for healthy status
    ACCREDITATION_READINESS_THRESHOLD: 80, // Score required for green status
    CLASS_AVERAGE_TARGET: 70, // Target class average

    // Pagination
    DEFAULT_PAGE_SIZE: 50,

    // timeouts
    AUTO_SAVE_DEBOUNCE_MS: 1000,

    // Exam Durations (in minutes)
    DEFAULT_EXAM_DURATION: 90,
};

export const ExamTypes = {
    internal: ['IA1', 'IA2'],
    assignment: ['ASSIGNMENT1', 'ASSIGNMENT2'],
    external: ['EXT'],
};

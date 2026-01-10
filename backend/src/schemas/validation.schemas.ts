import { z } from 'zod';

/**
 * Enterprise-grade validation schemas using Zod
 * Comprehensive input validation for all critical endpoints
 */

// Mark Entry Validation
export const markEntrySchema = z.object({
    examId: z.string().uuid('Invalid exam ID'),
    studentId: z.string().uuid('Invalid student ID'),
    subQuestionId: z.string().uuid('Invalid sub-question ID'),
    marks: z.number()
        .min(0, 'Marks cannot be negative')
        .max(100, 'Marks cannot exceed 100')
        .finite('Marks must be a valid number'),
    enteredBy: z.string().uuid('Invalid user ID').optional()
});

// Bulk Marks Entry
export const bulkMarksSchema = z.object({
    examId: z.string().uuid('Invalid exam ID'),
    marks: z.array(markEntrySchema).min(1, 'At least one mark entry required')
});

// Calculation Request Validation
export const calculationRequestSchema = z.object({
    subjectId: z.string().uuid('Invalid subject ID'),
    cohortId: z.string().uuid('Invalid cohort ID'),
    semester: z.number().int().min(1).max(8, 'Semester must be between 1 and 8'),
    academicYear: z.string().regex(/^\d{4}-\d{2}$/, 'Academic year must be in format YYYY-YY'),
    targetPercent: z.number()
        .min(0, 'Target percent must be positive')
        .max(100, 'Target percent cannot exceed 100')
        .default(60)
});

// Exam Creation Validation
export const examCreationSchema = z.object({
    name: z.string()
        .min(1, 'Exam name is required')
        .max(255, 'Exam name too long'),
    subjectId: z.string().uuid('Invalid subject ID'),
    cohortId: z.string().uuid('Invalid cohort ID'),
    semester: z.number().int().min(1).max(8),
    maxMarks: z.number()
        .positive('Max marks must be positive')
        .max(1000, 'Max marks seems unreasonably high'),
    examDate: z.string().datetime().optional(),
    type: z.enum(['INTERNAL', 'EXTERNAL', 'ASSIGNMENT', 'PRACTICAL']).optional()
});

// User Creation/Update Validation
export const userSchema = z.object({
    email: z.string().email('Invalid email address'),
    fullName: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name too long'),
    role: z.enum(['STUDENT', 'TEACHER', 'HOD', 'PRINCIPAL', 'ADMIN']),
    departmentId: z.string().uuid('Invalid department ID').optional(),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain uppercase letter')
        .regex(/[a-z]/, 'Password must contain lowercase letter')
        .regex(/[0-9]/, 'Password must contain number')
        .optional() // Optional for updates
});

// Subject Creation Validation
export const subjectSchema = z.object({
    code: z.string()
        .min(2, 'Subject code required')
        .max(20, 'Subject code too long')
        .regex(/^[A-Z0-9-]+$/, 'Subject code must be uppercase alphanumeric'),
    name: z.string()
        .min(3, 'Subject name too short')
        .max(200, 'Subject name too long'),
    credits: z.number()
        .int()
        .min(1, 'Credits must be at least 1')
        .max(10, 'Credits cannot exceed 10'),
    programId: z.string().uuid(),
    semester: z.number().int().min(1).max(8),
    academicYear: z.string().regex(/^\d{4}-\d{2}$/)
});

// Enrollment Validation
export const enrollmentSchema = z.object({
    studentId: z.string().uuid(),
    cohortId: z.string().uuid(),
    semester: z.number().int().min(1).max(8),
    enrollmentDate: z.string().datetime().optional()
});

// CO-PO Mapping Validation
export const coPoMappingSchema = z.object({
    coId: z.string().uuid('Invalid CO ID'),
    poId: z.string().uuid('Invalid PO ID'),
    correlationLevel: z.number()
        .int()
        .min(0, 'Correlation must be 0 (none) or positive')
        .max(3, 'Correlation level cannot exceed 3 (high)'),
    justification: z.string().max(500, 'Justification too long').optional()
});

// Question Creation Validation
export const questionSchema = z.object({
    examId: z.string().uuid(),
    section: z.string().min(1).max(10),
    questionNumber: z.number().int().positive(),
    coId: z.string().uuid().optional(),
    bloomLevel: z.enum(['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE']).optional(),
    marks: z.number().positive()
});

// Attainment Approval Validation
export const attainmentApprovalSchema = z.object({
    subjectId: z.string().uuid(),
    cohortId: z.string().uuid(),
    coId: z.string().uuid(),
    semester: z.number().int().min(1).max(8),
    academicYear: z.string().regex(/^\d{4}-\d{2}$/),
    remarks: z.string().max(500).optional()
});

export type MarkEntry = z.infer<typeof markEntrySchema>;
export type CalculationRequest = z.infer<typeof calculationRequestSchema>;
export type ExamCreation = z.infer<typeof examCreationSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type SubjectInput = z.infer<typeof subjectSchema>;

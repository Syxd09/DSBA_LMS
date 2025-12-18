import { z } from 'zod';

/**
 * Zod validation schemas for API requests
 * These ensure type-safe input validation at runtime
 */

// ============== ENUMS ==============

export const RoleSchema = z.enum(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER', 'STUDENT']);

export const BloomLevelSchema = z.enum(['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']);

export const ExamStatusSchema = z.enum(['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'LOCKED']);

export const SelectionModeSchema = z.enum(['FIRST_N', 'BEST_N']);

// ============== COMMON ==============

export const PaginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

export const IdParamSchema = z.object({
    id: z.string().uuid('Invalid ID format'),
});

// ============== AUTH ==============

export const LoginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const RegisterSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

// ============== USERS ==============

export const CreateUserSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
    role: RoleSchema.optional().default('STUDENT'),
    departmentId: z.string().uuid().nullable().optional(),
});

export const UpdateUserSchema = z.object({
    fullName: z.string().min(2).max(100).optional(),
    role: RoleSchema.optional(),
    departmentId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
});

// ============== DEPARTMENTS ==============

export const CreateDepartmentSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    code: z.string().min(2, 'Code must be at least 2 characters').max(10).toUpperCase(),
    hodId: z.string().uuid().nullable().optional(),
});

export const UpdateDepartmentSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    code: z.string().min(2).max(10).toUpperCase().optional(),
    hodId: z.string().uuid().nullable().optional(),
});

// ============== PROGRAMS ==============

export const CreateProgramSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    code: z.string().min(2, 'Code must be at least 2 characters').max(10).toUpperCase(),
    departmentId: z.string().uuid('Invalid department ID'),
    durationYears: z.coerce.number().int().min(1).max(6).default(3),
});

export const UpdateProgramSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    code: z.string().min(2).max(10).toUpperCase().optional(),
    departmentId: z.string().uuid().optional(),
    durationYears: z.coerce.number().int().min(1).max(6).optional(),
});

// ============== COHORTS ==============

export const CreateCohortSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    programId: z.string().uuid('Invalid program ID'),
    year: z.coerce.number().int().min(2000).max(2100),
    currentSemester: z.coerce.number().int().min(1).max(12).default(1),
});

export const UpdateCohortSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    programId: z.string().uuid().optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    currentSemester: z.coerce.number().int().min(1).max(12).optional(),
});

// ============== SUBJECTS ==============

export const CreateSubjectSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    code: z.string().min(2, 'Code must be at least 2 characters').max(20).toUpperCase(),
    curriculumVersionId: z.string().uuid('Invalid curriculum version ID'),
    semester: z.coerce.number().int().min(1).max(12),
    credits: z.coerce.number().int().min(1).max(10).default(3),
});

// ============== COURSE OUTCOMES ==============

export const CreateCourseOutcomeSchema = z.object({
    subjectId: z.string().uuid('Invalid subject ID'),
    coNumber: z.coerce.number().int().min(1).max(20),
    description: z.string().min(10, 'Description must be at least 10 characters').max(500),
    bloomLevel: BloomLevelSchema,
});

// ============== EXAMS ==============

export const CreateExamSchema = z.object({
    subjectId: z.string().uuid('Invalid subject ID'),
    cohortId: z.string().uuid('Invalid cohort ID'),
    examType: z.string().min(2, 'Exam type is required').max(50),
    maxMarks: z.coerce.number().int().positive().max(200).default(30),
});

export const UpdateExamStructureSchema = z.object({
    sections: z.array(z.object({
        name: z.string().min(1).max(50),
        sequence: z.number().int().positive(),
        maxMarks: z.number().int().positive(),
        selectionMode: SelectionModeSchema.default('FIRST_N'),
        requiredQuestions: z.number().int().positive().default(1),
        questions: z.array(z.object({
            sequence: z.number().int().positive(),
            maxMarks: z.number().int().positive(),
            bloomLevel: BloomLevelSchema,
            coId: z.string().uuid().nullable().optional(),
            isOptional: z.boolean().default(false),
            subQuestions: z.array(z.object({
                label: z.string().min(1).max(10),
                maxMarks: z.number().int().positive(),
                bloomLevel: BloomLevelSchema,
                coId: z.string().uuid().nullable().optional(),
            })).optional(),
        })),
    })),
});

// ============== MARKS ==============

export const SaveMarksSchema = z.object({
    examId: z.string().uuid('Invalid exam ID'),
    marks: z.array(z.object({
        studentId: z.string().uuid('Invalid student ID'),
        subQuestionId: z.string().uuid('Invalid sub-question ID'),
        marks: z.coerce.number().min(0).max(100),
    })),
});

// ============== ENROLLMENTS ==============

export const EnrollStudentSchema = z.object({
    studentId: z.string().uuid('Invalid student ID'),
    cohortId: z.string().uuid('Invalid cohort ID'),
    departmentId: z.string().uuid('Invalid department ID'),
    rollNumber: z.string().min(2, 'Roll number is required').max(20),
    semester: z.coerce.number().int().min(1).max(12).default(1),
});

export const BulkEnrollSchema = z.object({
    cohortId: z.string().uuid('Invalid cohort ID'),
    departmentId: z.string().uuid('Invalid department ID'),
    students: z.array(z.object({
        email: z.string().email(),
        fullName: z.string().min(2).max(100),
        rollNumber: z.string().min(2).max(20),
    })).min(1, 'At least one student is required'),
});

// ============== TEACHER ASSIGNMENTS ==============

export const CreateAssignmentSchema = z.object({
    teacherId: z.string().uuid('Invalid teacher ID'),
    subjectId: z.string().uuid('Invalid subject ID'),
    cohortId: z.string().uuid('Invalid cohort ID'),
    departmentId: z.string().uuid('Invalid department ID'),
    semester: z.coerce.number().int().min(1).max(12).default(1),
    academicYear: z.string().regex(/^\d{4}-\d{2}$/, 'Academic year must be in format YYYY-YY'),
});

// ============== FEEDBACK ==============

export const SubmitFeedbackSchema = z.object({
    examId: z.string().uuid('Invalid exam ID'),
    teacherId: z.string().uuid('Invalid teacher ID'),
    rating: z.coerce.number().int().min(1).max(10),
    improvements: z.array(z.string()).default([]),
    comment: z.string().max(1000).optional(),
});

// ============== MESSAGING ==============

export const CreateGroupSchema = z.object({
    name: z.string().min(2).max(50),
    type: z.enum(['DEPT', 'ALL', 'CUSTOM']),
    memberIds: z.array(z.string().uuid()).optional(),
});

export const SendMessageSchema = z.object({
    content: z.string().min(1, 'Message cannot be empty').max(5000),
    type: z.enum(['TEXT', 'ANNOUNCEMENT']).default('TEXT'),
});

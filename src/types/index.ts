/**
 * Shared type definitions for frontend
 * These types match the Prisma schema and API responses
 */

// ============== ENUMS ==============

export type Role = 'ADMIN' | 'PRINCIPAL' | 'HOD' | 'TEACHER' | 'STUDENT';
export type RoleLowercase = 'admin' | 'principal' | 'hod' | 'teacher' | 'student';

export type ExamStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'LOCKED';

export type SelectionMode = 'FIRST_N' | 'BEST_N';

export type BloomLevel = 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type WorkflowType = 'MARKS_APPROVAL' | 'PROMOTION_APPROVAL' | 'COPO_APPROVAL';

export type AttainmentStatus = 'DRAFT' | 'CALCULATED' | 'UNDER_REVIEW' | 'APPROVED' | 'LOCKED';

// ============== BASE MODELS ==============

export interface User {
    id: string;
    email: string;
    fullName: string;
    role: Role;
    isActive: boolean;
    departmentId?: string | null;
    avatarUrl?: string | null;
    mobileNumber?: string | null;
    createdAt: string;
    department?: Department;
}

export interface Department {
    id: string;
    name: string;
    code: string;
    hodId?: string | null;
    createdAt: string;
    hod?: User;
    _count?: {
        users: number;
        programs: number;
        studentEnrollments: number;
    };
}

export interface Program {
    id: string;
    name: string;
    code: string;
    departmentId: string;
    durationYears: number;
    createdAt: string;
    department?: Department;
    _count?: {
        cohorts: number;
        curriculums: number;
    };
}

export interface Cohort {
    id: string;
    programId: string;
    year: number;
    name: string;
    currentSemester: number;
    createdAt: string;
    program?: Program;
    _count?: {
        enrollments: number;
        exams: number;
    };
}

export interface CurriculumVersion {
    id: string;
    programId: string;
    versionName: string;
    effectiveFrom: number;
    isActive: boolean;
    createdAt: string;
    program?: Program;
}

export interface Subject {
    id: string;
    name: string;
    code: string;
    credits: number;
    semester: number;
    curriculumVersionId: string;
    createdAt: string;
    curriculum?: CurriculumVersion;
}

export interface CourseOutcome {
    id: string;
    subjectId: string;
    coNumber: number;
    description: string;
    bloomLevel: BloomLevel;
    createdAt: string;
    subject?: Subject;
}

export interface ProgramOutcome {
    id: string;
    programId: string;
    poNumber: number;
    description: string;
    createdAt: string;
    program?: Program;
}

export interface CoPoMapping {
    id: string;
    coId: string;
    poId: string;
    correlationLevel: number;
    co?: CourseOutcome;
    po?: ProgramOutcome;
}

// ============== EXAM MODELS ==============

export interface Exam {
    id: string;
    subjectId: string;
    cohortId: string;
    examType: string;
    maxMarks: number;
    status: ExamStatus;
    teacherId?: string | null;
    createdAt: string;
    publishedAt?: string | null;
    subject?: Subject;
    cohort?: Cohort;
    sections?: ExamSection[];
}

export interface ExamSection {
    id: string;
    examId: string;
    name: string;
    sequence: number;
    requiredQuestions: number;
    selectionMode: SelectionMode;
    maxMarks: number;
    createdAt: string;
    questions?: Question[];
}

export interface Question {
    id: string;
    sectionId: string;
    sequence: number;
    maxMarks: number;
    coId?: string | null;
    bloomLevel: BloomLevel;
    isOptional: boolean;
    groupKey?: string | null;
    createdAt: string;
    co?: CourseOutcome;
    subQuestions?: SubQuestion[];
}

export interface SubQuestion {
    id: string;
    questionId: string;
    label: string;
    maxMarks: number;
    coId?: string | null;
    bloomLevel: BloomLevel;
    createdAt: string;
    co?: CourseOutcome;
}

// ============== ENROLLMENT & ASSIGNMENT ==============

export interface StudentEnrollment {
    id: string;
    studentId: string;
    cohortId: string;
    departmentId: string;
    semester: number;
    registrationNumber: string;
    status: string;
    createdAt: string;
    student?: User;
    cohort?: Cohort;
    department?: Department;
}

export interface TeacherAssignment {
    id: string;
    teacherId: string;
    subjectId: string;
    cohortId: string;
    departmentId: string;
    semester: number;
    academicYear: string;
    createdAt: string;
    teacher?: User;
    subject?: Subject;
    cohort?: Cohort;
    department?: Department;
}

// ============== MARKS & RESULTS ==============

export interface StudentMark {
    id: string;
    examId: string;
    studentId: string;
    subQuestionId: string;
    marks: number;
    enteredBy?: string | null;
    enteredAt: string;
}

export interface FinalMark {
    id: string;
    studentId: string;
    subjectId: string;
    cohortId: string;
    internal1: number;
    internal2: number;
    bestInternal: number;
    externalMarks: number;
    totalMarks: number;
    percentage: number;
    grade: string;
    gradePoint: number;
    status: string;
    computedAt: string;
}

export interface SemesterResult {
    id: string;
    studentId: string;
    cohortId: string;
    semester: number;
    totalCredits: number;
    earnedCredits: number;
    sgpa: number;
    cgpa: number;
    status: string;
    createdAt: string;
}

// ============== ATTAINMENT ==============

export interface COAttainment {
    id: string;
    subjectId: string;
    cohortId: string;
    coId: string;
    semester: number;
    academicYear: string;
    targetPercent: number;
    achievedPercent: number;
    studentCount: number;
    passCount: number;
    status: AttainmentStatus;
    calculatedAt?: string | null;
    submittedAt?: string | null;
    approvedBy?: string | null;
    approvedAt?: string | null;
    lockedAt?: string | null;
    createdAt: string;
    subject?: Subject;
    cohort?: Cohort;
    co?: CourseOutcome;
}

// ============== WORKFLOW & FEEDBACK ==============

export interface ApprovalRequest {
    id: string;
    workflowType: WorkflowType;
    entityId: string;
    requesterId: string;
    approverId?: string | null;
    status: ApprovalStatus;
    comments?: string | null;
    createdAt: string;
    requester?: User;
    approver?: User;
}

export interface Feedback {
    id: string;
    studentId: string;
    teacherId: string;
    examId: string;
    rating: number;
    improvements: string[];
    comment?: string | null;
    isPublished: boolean;
    createdAt: string;
}

// ============== MESSAGING ==============

export interface MessageGroup {
    id: string;
    name: string;
    type: string;
    createdAt: string;
}

export interface Message {
    id: string;
    groupId: string;
    senderId: string;
    content: string;
    type: 'TEXT' | 'ANNOUNCEMENT';
    createdAt: string;
    sender?: User;
}

// ============== GRADING ==============

export interface GradingRule {
    id: string;
    departmentId?: string | null;
    minPercentage: number;
    maxPercentage: number;
    grade: string;
    gradePoint: number;
    createdAt: string;
}

// ============== AUDIT ==============

export interface AuditLog {
    id: string;
    userId?: string | null;
    action: string;
    tableName: string;
    recordId?: string | null;
    oldData?: Record<string, unknown> | null;
    newData?: Record<string, unknown> | null;
    ipAddress?: string | null;
    createdAt: string;
    user?: User;
}

import { z } from 'zod';

export const createAssignmentSchema = z.object({
    body: z.object({
        teacherId: z.string().uuid({ message: "Invalid Teacher ID" }),
        subjectId: z.string().uuid({ message: "Invalid Subject ID" }),
        cohortId: z.string().uuid({ message: "Invalid Cohort ID" }),
        departmentId: z.string().uuid({ message: "Invalid Department ID" }).optional(),
        semester: z.number().int().min(1).max(8).optional(), // Optional but must be 1-8 if present
        academicYear: z.string().regex(/^\d{4}(-\d{2,4})?$/, { message: "Invalid Academic Year format (e.g. 2024 or 2024-25)" }).optional()
    }),
});

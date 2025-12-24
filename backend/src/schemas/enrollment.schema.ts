import { z } from 'zod';

export const enrollStudentSchema = z.object({
    body: z.object({
        cohortId: z.string().uuid({ message: "Invalid Cohort ID" }),
        departmentId: z.string().uuid({ message: "Invalid Department ID" }),
        semester: z.number().int().min(1).max(8).optional(),
        rollNumber: z.string().min(1, "Roll Number is required"),
        fullName: z.string().min(1, "Full Name is required"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 chars").optional(),
        mobileNumber: z.string().optional()
    }),
});

export const bulkEnrollSchema = z.object({
    body: z.object({
        cohortId: z.string().uuid({ message: "Invalid Cohort ID" }),
        departmentId: z.string().uuid({ message: "Invalid Department ID" }),
        semester: z.number().int().min(1).max(8).optional(),
        students: z.array(z.object({
            rollNumber: z.string().min(1),
            fullName: z.string().min(1),
            email: z.string().email(),
            mobileNumber: z.string().optional()
        })).min(1, "At least one student is required for bulk enrollment")
    }),
});

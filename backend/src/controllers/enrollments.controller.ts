import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';
import bcrypt from 'bcrypt';

// Get enrollments with context filtering
export const getEnrollments = async (req: AuthRequest, res: Response) => {
    try {
        const { cohortId, departmentId, semester } = req.query;
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.userId;

        // Build where clause based on context
        const where: import('@prisma/client').Prisma.StudentEnrollmentWhereInput = {};

        if (cohortId) where.cohortId = String(cohortId);
        if (departmentId) where.departmentId = String(departmentId);
        if (semester) where.semester = Number(semester);

        // RBAC: HOD sees only their department
        if (userRole === 'HOD') {
            const hodUser = await prisma.user.findUnique({
                where: { id: userId },
                include: { departmentLed: true }
            });
            if (hodUser?.departmentLed) {
                where.departmentId = hodUser.departmentLed.id;
            }
        }

        // RBAC: Teacher sees only students in their assigned cohorts
        if (userRole === 'TEACHER') {
            const assignments = await prisma.teacherAssignment.findMany({
                where: { teacherId: userId },
                select: { cohortId: true }
            });
            const assignedCohortIds = assignments.map(a => a.cohortId);

            // If specific cohort requested, ensure it's assigned
            if (cohortId && !assignedCohortIds.includes(String(cohortId))) {
                return res.json([]);
            }

            // Otherwise filter by all assigned cohorts if no specific cohort requested
            // Note: If departmentId is provided but no cohort, we still restrict to assigned cohorts within that dept
            if (!cohortId) {
                where.cohortId = { in: assignedCohortIds };
            }
        }

        // RBAC: Student sees only their own enrollments
        if (userRole === 'STUDENT') {
            where.studentId = userId;
        }

        const enrollments = await prisma.studentEnrollment.findMany({
            where,
            include: {
                student: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        mobileNumber: true
                    }
                },
                cohort: {
                    select: {
                        id: true,
                        name: true,
                        currentSemester: true,
                        program: { select: { id: true, name: true, code: true } }
                    }
                },
                department: {
                    select: { id: true, name: true, code: true }
                }
            },
            orderBy: { rollNumber: 'asc' }
        });

        res.json(enrollments);
    } catch (error) {
        console.error('Error fetching enrollments:', error);
        res.status(500).json({ message: 'Error fetching enrollments', error: String(error) });
    }
};

// Get students by class context (department + cohort + semester)
export const getStudentsByClass = async (req: AuthRequest, res: Response) => {
    try {
        const { departmentId, cohortId, semester } = req.query;

        if (!cohortId) {
            return res.status(400).json({ message: 'Cohort ID is required' });
        }

        const where: import('@prisma/client').Prisma.StudentEnrollmentWhereInput = { cohortId: String(cohortId) };
        if (departmentId) where.departmentId = String(departmentId);
        if (semester) where.semester = Number(semester);

        const students = await prisma.studentEnrollment.findMany({
            where,
            include: {
                student: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        mobileNumber: true
                    }
                }
            },
            orderBy: { rollNumber: 'asc' }
        });

        res.json(students);
    } catch (error) {
        console.error('Error fetching students by class:', error);
        res.status(500).json({ message: 'Error fetching students', error: String(error) });
    }
};

// Enroll a single student (with auto-create user)
export const enrollStudent = async (req: AuthRequest, res: Response) => {
    try {
        const { cohortId, departmentId, semester, rollNumber, fullName, email, mobileNumber, password } = req.body;

        if (!cohortId || !departmentId || !rollNumber || !fullName || !email) {
            return res.status(400).json({
                message: 'Cohort ID, Department ID, Roll Number, Full Name, and Email are required'
            });
        }

        // Check if user exists
        let user = await prisma.user.findUnique({ where: { email } });

        // Create user if not exists
        if (!user) {
            const hashedPassword = await bcrypt.hash(password || 'Student@123', 10);
            user = await prisma.user.create({
                data: {
                    email,
                    fullName,
                    password: hashedPassword,
                    role: 'STUDENT',
                    mobileNumber: mobileNumber || null,
                    departmentId
                }
            });
        }

        // Check for existing enrollment
        const existingEnrollment = await prisma.studentEnrollment.findFirst({
            where: {
                OR: [
                    { studentId: user.id, cohortId, semester: semester || 1 },
                    { rollNumber }
                ]
            }
        });

        if (existingEnrollment) {
            return res.status(400).json({
                message: existingEnrollment.rollNumber === rollNumber
                    ? 'Roll number already exists'
                    : 'Student already enrolled in this cohort/semester'
            });
        }

        // Create enrollment
        const enrollment = await prisma.studentEnrollment.create({
            data: {
                studentId: user.id,
                cohortId,
                departmentId,
                semester: semester || 1,
                rollNumber,
                status: 'active'
            },
            include: {
                student: { select: { fullName: true, email: true, mobileNumber: true } },
                department: { select: { name: true, code: true } }
            }
        });

        res.status(201).json(enrollment);
    } catch (error: unknown) {
        console.error('Error enrolling student:', error);
        if ((error as any).code === 'P2002') {
            return res.status(400).json({ message: 'Roll number or student already enrolled' });
        }
        res.status(500).json({ message: 'Error enrolling student', error: String(error) });
    }
};

// Bulk enroll students (with auto-create users)
export const bulkEnroll = async (req: AuthRequest, res: Response) => {
    try {
        const { cohortId, departmentId, semester, students } = req.body;

        if (!cohortId || !departmentId || !students || !Array.isArray(students)) {
            return res.status(400).json({ message: 'Cohort ID, Department ID, and students array required' });
        }

        const results = {
            success: 0,
            created: 0,
            errors: [] as { row: number; email: string; error: string }[]
        };

        for (let i = 0; i < students.length; i++) {
            const s = students[i];
            try {
                if (!s.email || !s.rollNumber) {
                    results.errors.push({
                        row: i + 1,
                        email: s.email || 'N/A',
                        error: 'Email and Roll Number are required'
                    });
                    continue;
                }

                // Find or create user
                let user = await prisma.user.findUnique({ where: { email: s.email } });

                if (!user) {
                    const hashedPassword = await bcrypt.hash('Student@123', 10);
                    user = await prisma.user.create({
                        data: {
                            email: s.email,
                            fullName: s.fullName || s.email.split('@')[0],
                            password: hashedPassword,
                            role: 'STUDENT',
                            mobileNumber: s.mobileNumber || null,
                            departmentId
                        }
                    });
                    results.created++;
                }

                // Check for existing enrollment
                const existingEnrollment = await prisma.studentEnrollment.findFirst({
                    where: {
                        OR: [
                            { studentId: user.id, cohortId, semester: semester || 1 },
                            { rollNumber: s.rollNumber }
                        ]
                    }
                });

                if (existingEnrollment) {
                    results.errors.push({
                        row: i + 1,
                        email: s.email,
                        error: existingEnrollment.rollNumber === s.rollNumber
                            ? 'Roll number already exists'
                            : 'Student already enrolled in this cohort/semester'
                    });
                    continue;
                }

                // Create enrollment
                await prisma.studentEnrollment.create({
                    data: {
                        studentId: user.id,
                        cohortId,
                        departmentId,
                        semester: semester || 1,
                        rollNumber: s.rollNumber,
                        status: 'active'
                    }
                });
                results.success++;
            } catch (error: unknown) {
                console.error(`Error enrolling ${s.email}:`, error);
                results.errors.push({
                    row: i + 1,
                    email: s.email,
                    error: (error as any).message || 'Unknown error'
                });
            }
        }

        res.json({
            message: `Enrolled ${results.success} students, created ${results.created} new users`,
            ...results
        });
    } catch (error) {
        console.error('Error processing bulk enrollment:', error);
        res.status(500).json({ message: 'Error processing bulk enrollment', error: String(error) });
    }
};

// Delete enrollment
export const deleteEnrollment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.studentEnrollment.delete({
            where: { id }
        });

        res.json({ message: 'Enrollment deleted successfully' });
    } catch (error) {
        console.error('Error deleting enrollment:', error);
        res.status(500).json({ message: 'Error deleting enrollment', error: String(error) });
    }
};

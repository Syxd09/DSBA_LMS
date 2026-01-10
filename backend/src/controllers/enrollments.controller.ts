import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';
import bcrypt from 'bcrypt';
import { AuditService } from '../services/audit.service';

// Get enrollments with context filtering
export const getEnrollments = async (req: AuthRequest, res: Response) => {
    try {
        const { cohortId, departmentId, semester } = req.query;
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.userId;

        // Build where clause based on context
        const where: import('@prisma/client').Prisma.StudentEnrollmentWhereInput = {};

        if (cohortId) where.cohortId = cohortId as string;
        if (departmentId) where.departmentId = departmentId as string;
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

        // RBAC: Teacher sees only students in their assigned cohorts AND semesters
        if (userRole === 'TEACHER') {
            const assignments = await prisma.teacherAssignment.findMany({
                where: { teacherId: userId },
                select: { cohortId: true, departmentId: true, semester: true }
            });



            if (assignments.length === 0 && !userRole.includes('ADMIN')) {
                return res.json([]);
            }

            // STRICT FILTERING: Match both Cohort and Semester.
            // A teacher assigned to "Cohort A, Sem 2" sees students currently in "Cohort A, Sem 2".
            const orConditions = assignments.map(a => ({
                cohortId: a.cohortId,
                semester: a.semester
            }));

            if (orConditions.length > 0) {
                where.OR = orConditions;
            }
            // If query params are provided, they must ALSO match one of the assignments
            if (cohortId || semester) {
                // Check if the requested combination is valid for this teacher
                const requestedCohort = cohortId ? String(cohortId) : null;
                const requestedSemester = semester ? Number(semester) : null;

                const isValidRequest = assignments.some(a =>
                    (!requestedCohort || a.cohortId === requestedCohort) &&
                    (!requestedSemester || a.semester === requestedSemester)
                );

                if (!isValidRequest) {
                    return res.json([]);
                }
            }

            // Apply strict filtering to the query (Cohort + Semester)
            where.OR = orConditions;

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

// Get students assigned to teacher (based on teacher assignments)
export const getTeacherStudents = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Teachers can only see their own assigned students
        const teacherId = user.role === 'TEACHER' ? user.userId : req.query.teacherId as string;

        if (!teacherId) {
            return res.status(400).json({ message: 'Teacher ID required' });
        }

        // Get all subjects assigned to this teacher
        const teacherAssignments = await prisma.teacherAssignment.findMany({
            where: { teacherId },
            include: {
                subject: true,
                cohort: true
            }
        });

        if (teacherAssignments.length === 0) {
            return res.json({ students: [] });
        }

        // Get unique cohort IDs
        const cohortIds = [...new Set(teacherAssignments.map(ta => ta.cohortId))];

        // Get all students enrolled in these cohorts
        const enrollments = await prisma.studentEnrollment.findMany({
            where: {
                cohortId: { in: cohortIds },
                status: 'active'
            },
            include: {
                student: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                        departmentId: true
                    }
                },
                cohort: {
                    select: {
                        id: true,
                        name: true,
                        year: true,
                        currentSemester: true
                    }
                }
            },
            orderBy: [
                { cohort: { year: 'desc' } },
                { rollNumber: 'asc' }
            ]
        });

        // Format response with assignment context
        const students = enrollments.map(enrollment => ({
            id: enrollment.student.id,
            email: enrollment.student.email,
            fullName: enrollment.student.fullName,
            rollNumber: enrollment.rollNumber,
            cohort: enrollment.cohort,
            semester: enrollment.semester,
            // Add subjects this teacher teaches to this student
            assignedSubjects: teacherAssignments
                .filter(ta => ta.cohortId === enrollment.cohortId)
                .map(ta => ({
                    id: ta.subject.id,
                    code: ta.subject.code,
                    name: ta.subject.name
                }))
        }));

        return res.json({ students });

    } catch (error: any) {
        console.error('Error fetching teacher students:', error);
        return res.status(500).json({
            message: 'Failed to fetch assigned students',
            error: error.message
        });
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

        // Validate Strict Context
        const cohort = await prisma.cohort.findUnique({
            where: { id: cohortId },
            include: { program: true }
        });

        if (!cohort) {
            return res.status(404).json({ message: 'Cohort not found' });
        }

        if (cohort.program.departmentId !== departmentId) {
            return res.status(400).json({
                message: 'Invalid Context: Selected Cohort does not belong to the selected Department'
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

            // Audit Log for User Creation
            if (req.user?.userId) {
                await AuditService.log(req.user.userId, 'USER_CREATED', 'User', user.id, {
                    email: user.email,
                    role: user.role,
                    reason: 'Auto-created during enrollment'
                });
            }
        }

        if (!user) {
            return res.status(500).json({ message: 'Failed to create or find user' });
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

        // Audit Log for Enrollment
        if (req.user?.userId) {
            await AuditService.log(req.user.userId, 'STUDENT_ENROLLED', 'StudentEnrollment', enrollment.id, {
                rollNumber: enrollment.rollNumber,
                studentName: enrollment.student.fullName
            });
        }

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

        // Audit Log
        if (req.user?.userId) {
            await AuditService.log(req.user.userId, 'ENROLLMENT_DELETED', 'StudentEnrollment', id, {
                deletedEnrollmentId: id
            });
        }

        res.json({ message: 'Enrollment deleted successfully', id });
    } catch (error: any) {
        console.error('Error deleting enrollment:', error);
        res.status(500).json({ message: 'Failed to delete enrollment', error: error.message });
    }
};

/**
 * Get active semesters (semesters with enrolled students) for a cohort
 * This enables smart semester filtering in the frontend
 */
export const getActiveSemesters = async (req: AuthRequest, res: Response) => {
    try {
        console.log('📊 getActiveSemesters called');
        console.log('Query params:', req.query);
        console.log('User:', req.user);

        const { cohortId, programId } = req.query;

        if (!cohortId) {
            console.log('❌ No cohortId provided');
            return res.status(400).json({
                success: false,
                message: 'cohortId is required'
            });
        }

        // Build where clause
        const where: any = {
            cohortId: cohortId as string
        };

        // Optional: filter by program if provided
        if (programId) {
            where.cohort = {
                programId: programId as string
            };
        }

        console.log('🔍 Querying with where:', JSON.stringify(where));

        // Get distinct semesters where students are enrolled
        const enrollments = await prisma.studentEnrollment.findMany({
            where,
            select: {
                semester: true
            },
            distinct: ['semester']
        });

        console.log('📝 Found enrollments:', enrollments);

        // Extract and sort semester numbers
        const semesters = enrollments
            .map(e => e.semester)
            .filter(sem => sem !== null && sem !== undefined)
            .sort((a, b) => a - b);

        console.log('✅ Returning semesters:', semesters);

        return res.json({
            success: true,
            semesters,
            count: semesters.length
        });

    } catch (error: any) {
        console.error('💥 Error fetching active semesters:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch active semesters',
            error: error.message
        });
    }
};

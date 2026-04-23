
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

// Get assignments with context filtering
export const getAssignments = async (req: AuthRequest, res: Response) => {
    try {
        const { teacherId, subjectId, cohortId, departmentId, semester, academicYear } = req.query;
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.userId;

        const where: import('@prisma/client').Prisma.TeacherAssignmentWhereInput = {};
        if (teacherId) where.teacherId = String(teacherId);
        if (subjectId) where.subjectId = String(subjectId);
        if (cohortId) where.cohortId = String(cohortId);
        if (departmentId) where.departmentId = String(departmentId);
        if (semester) where.semester = Number(semester);
        if (academicYear) where.academicYear = String(academicYear);

        // RBAC: Teacher sees only their own assignments
        if (userRole === 'TEACHER') {
            where.teacherId = userId;
        }

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

        const assignments = await prisma.teacherAssignment.findMany({
            where,
            include: {
                teacher: { select: { id: true, fullName: true, registrationNumber: true, email: true } },
                subject: { select: { id: true, name: true, code: true, semester: true } },
                cohort: { select: { id: true, name: true, currentSemester: true } },
                department: { select: { id: true, name: true, code: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // M-3 Optimization: Fetch all student counts in one query instead of N (one per assignment)
        // Group by cohortId, departmentId, and semester to match assignment structure
        const classCombos = assignments.map(a => ({
            cohortId: a.cohortId,
            departmentId: a.departmentId,
            semester: a.semester
        }));

        // Remove duplicates to minimize the IN clause
        const uniqueCohorts = [...new Set(classCombos.map(c => c.cohortId))];

        const studentCounts = await prisma.studentEnrollment.groupBy({
            by: ['cohortId', 'departmentId', 'semester'],
            where: {
                cohortId: { in: uniqueCohorts },
                status: 'active'
            },
            _count: { _all: true }
        });

        // Map counts back to assignments
        const enrichedAssignments = assignments.map(a => {
            const countObj = studentCounts.find(c => 
                c.cohortId === a.cohortId && 
                c.departmentId === a.departmentId && 
                c.semester === a.semester
            );
            return {
                ...a,
                studentCount: countObj?._count._all || 0
            };
        });

        res.json(enrichedAssignments);
    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ message: 'Error fetching assignments', error: String(error) });
    }
};

// Get teachers by class context (department + cohort + semester)
export const getTeachersByClass = async (req: AuthRequest, res: Response) => {
    try {
        const { departmentId, cohortId, semester } = req.query;

        if (!cohortId) {
            return res.status(400).json({ message: 'Cohort ID is required' });
        }

        const where: import('@prisma/client').Prisma.TeacherAssignmentWhereInput = { cohortId: String(cohortId) };
        if (departmentId) where.departmentId = String(departmentId);
        if (semester) where.semester = Number(semester);

        const teachers = await prisma.teacherAssignment.findMany({
            where,
            include: {
                teacher: {
                    select: {
                        id: true,
                        fullName: true, registrationNumber: true,
                        email: true
                    }
                },
                subject: {
                    select: {
                        id: true,
                        name: true,
                        code: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(teachers);
    } catch (error) {
        console.error('Error fetching teachers by class:', error);
        res.status(500).json({ message: 'Error fetching teachers', error: String(error) });
    }
};

// Preview Assignment - Check student count before creating
export const getAssignmentPreview = async (req: AuthRequest, res: Response) => {
    try {
        const { cohortId, departmentId, semester } = req.query;

        if (!cohortId || !departmentId || !semester) {
            return res.status(400).json({ message: 'Cohort, Department, and Semester are required' });
        }

        const studentCount = await prisma.studentEnrollment.count({
            where: {
                cohortId: String(cohortId),
                departmentId: String(departmentId),
                semester: Number(semester),
                status: 'active'
            }
        });

        const cohort = await prisma.cohort.findUnique({
            where: { id: String(cohortId) },
            select: { name: true }
        });

        res.json({
            count: studentCount,
            cohortName: cohort?.name || 'Unknown Cohort',
            semester: semester
        });

    } catch (error) {
        console.error('Error fetching assignment preview:', error);
        res.status(500).json({ message: 'Error fetching preview' });
    }
};

// Create assignment with strict validation
export const createAssignment = async (req: AuthRequest, res: Response) => {
    try {
        let { teacherId, subjectId, cohortId, departmentId, semester, academicYear } = req.body;
        console.log('DEBUG: createAssignment start', { teacherId, subjectId, cohortId, departmentId, semester, academicYear });

        if (!teacherId || !subjectId || !cohortId) {
            return res.status(400).json({
                message: 'Teacher ID, Subject ID, and Cohort ID are required'
            });
        }

        // If departmentId is missing, try to fetch it from the subject's curriculum/program
        if (!departmentId) {
            const subject = await prisma.subject.findUnique({
                where: { id: subjectId },
                include: {
                    curriculum: {
                        include: {
                            program: true
                        }
                    }
                }
            });
            
            if (subject?.curriculum?.program?.departmentId) {
                departmentId = subject.curriculum.program.departmentId;
                console.log('DEBUG: Resolved departmentId from subject', departmentId);
            } else {
                return res.status(400).json({
                    message: 'Department ID is required and could not be resolved from the subject'
                });
            }
        }

        // RBAC: HOD strict check
        if (req.user?.role === 'HOD') {
            const hodUser = await prisma.user.findUnique({
                where: { id: req.user.userId },
                include: { departmentLed: true }
            });
            if (!hodUser?.departmentLed || hodUser.departmentLed.id !== departmentId) {
                return res.status(403).json({ message: 'HOD can only assign within their department' });
            }
        }

        // STRICT VALIDATION: Check if students exist
        const studentCount = await prisma.studentEnrollment.count({
            where: {
                cohortId,
                departmentId,
                semester: Number(semester || 1),
                status: 'active'
            }
        });

        if (studentCount === 0) {
            console.warn(`Creating assignment for ${cohortId} with 0 students. Teacher should be aware.`);
            // Removed strict return 400 to allow setup before enrollment
        }

        // Check for existing assignment
        const existing = await prisma.teacherAssignment.findFirst({
            where: { teacherId, subjectId, cohortId, semester: Number(semester || 1) }
        });

        if (existing) {
            return res.status(400).json({ message: 'This teacher is already assigned to this subject/cohort/semester' });
        }

        const assignment = await prisma.teacherAssignment.create({
            data: {
                teacherId,
                subjectId,
                cohortId,
                departmentId,
                semester: semester || 1,
                academicYear: academicYear || new Date().getFullYear().toString()
            },
            include: {
                teacher: { select: { fullName: true, registrationNumber: true, email: true } },
                subject: { select: { name: true, code: true } },
                cohort: { select: { name: true } },
                department: { select: { name: true, code: true } }
            }
        });

        res.status(201).json(assignment);
    } catch (error) {
        console.error('Error creating assignment:', error);
        res.status(500).json({ message: 'Error creating assignment', error: String(error) });
    }
};

// Delete assignment
export const deleteAssignment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // RBAC: HOD check for deletion
        if (req.user?.role === 'HOD') {
            const assignment = await prisma.teacherAssignment.findUnique({ where: { id } });
            if (assignment) {
                const hodUser = await prisma.user.findUnique({
                    where: { id: req.user.userId },
                    include: { departmentLed: true }
                });
                if (!hodUser?.departmentLed || hodUser.departmentLed.id !== assignment.departmentId) {
                    return res.status(403).json({ message: 'HOD can only delete assignments within their department' });
                }
            }
        }

        await prisma.teacherAssignment.delete({ where: { id } });
        res.json({ message: 'Assignment deleted' });
    } catch (error) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({ message: 'Error deleting assignment', error: String(error) });
    }
};

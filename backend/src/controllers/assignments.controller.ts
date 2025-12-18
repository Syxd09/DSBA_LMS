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
                teacher: { select: { id: true, fullName: true, email: true } },
                subject: { select: { id: true, name: true, code: true, semester: true } },
                cohort: { select: { id: true, name: true, currentSemester: true } },
                department: { select: { id: true, name: true, code: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(assignments);
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
                        fullName: true,
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

// Create assignment with department/semester
export const createAssignment = async (req: AuthRequest, res: Response) => {
    try {
        const { teacherId, subjectId, cohortId, departmentId, semester, academicYear } = req.body;

        if (!teacherId || !subjectId || !cohortId || !departmentId) {
            return res.status(400).json({
                message: 'Teacher ID, Subject ID, Cohort ID, and Department ID are required'
            });
        }

        // Check for existing assignment
        const existing = await prisma.teacherAssignment.findFirst({
            where: { teacherId, subjectId, cohortId }
        });

        if (existing) {
            return res.status(400).json({ message: 'This teacher is already assigned to this subject/cohort' });
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
                teacher: { select: { fullName: true, email: true } },
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
        await prisma.teacherAssignment.delete({ where: { id } });
        res.json({ message: 'Assignment deleted' });
    } catch (error) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({ message: 'Error deleting assignment', error: String(error) });
    }
};


import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

export const getSubjects = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.userId;

        const where: any = {};

        // RBAC: Teachers only see assigned subjects
        if (userRole === 'TEACHER') {
            const assignments = await prisma.teacherAssignment.findMany({
                where: { teacherId: userId },
                select: { subjectId: true }
            });
            const subjectIds = assignments.map(a => a.subjectId);
            where.id = { in: subjectIds };
        }

        // RBAC: HODs only see subjects in their department
        if (userRole === 'HOD') {
            // Find HOD's department
            const department = await prisma.department.findFirst({
                where: { hodId: userId }
            });

            if (department) {
                // Filter subjects by program -> department
                where.curriculum = {
                    program: {
                        departmentId: department.id
                    }
                };
            } else {
                // If HOD has no department assigned, they see nothing? Or all? 
                // Best to be safe -> nothing.
                return res.json([]);
            }
        }

        const subjects = await prisma.subject.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                curriculum: {
                    select: {
                        id: true,
                        versionName: true,
                        program: { select: { id: true, name: true, code: true } }
                    }
                }
            }
        });
        res.json(subjects);
    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ message: 'Error fetching subjects', error: String(error) });
    }
};

export const createSubject = async (req: AuthRequest, res: Response) => {
    try {
        const { name, code, credits, curriculumVersionId, semester } = req.body;

        if (!name || !code || !curriculumVersionId) {
            return res.status(400).json({ message: 'Name, Code, and Curriculum Version are required' });
        }

        const subject = await prisma.subject.create({
            data: {
                name,
                code,
                credits: credits || 3,
                curriculumVersionId,
                semester: semester || 1
            },
            include: { curriculum: true }
        });

        res.status(201).json(subject);
    } catch (error) {
        console.error('Error creating subject:', error);
        res.status(500).json({ message: 'Error creating subject', error: String(error) });
    }
};

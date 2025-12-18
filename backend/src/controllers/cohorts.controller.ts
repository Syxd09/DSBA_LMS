
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

export const getCohorts = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user?.role;
        const userDeptId = req.user?.departmentId;

        const where: any = {};

        // RBAC: Non-Admins can only see cohorts in their own department
        if (userRole !== 'ADMIN' && userRole !== 'PRINCIPAL') {
            if (!userDeptId) {
                return res.json([]);
            }
            where.program = { departmentId: userDeptId };
        }

        const cohorts = await prisma.cohort.findMany({
            where,
            orderBy: { year: 'desc' },
            include: {
                program: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        durationYears: true,
                        departmentId: true
                    }
                },
                _count: { select: { enrollments: true } }
            }
        });
        res.json(cohorts);
    } catch (error) {
        console.error('Error fetching cohorts:', error);
        res.status(500).json({ message: 'Error fetching cohorts', error: String(error) });
    }
};

export const createCohort = async (req: AuthRequest, res: Response) => {
    try {
        const { programId, year, name, currentSemester } = req.body;

        if (!programId || !year || !name) {
            return res.status(400).json({ message: 'Program, Year, and Name are required' });
        }

        const cohort = await prisma.cohort.create({
            data: {
                programId,
                year: parseInt(year),
                name,
                currentSemester: currentSemester || 1
            },
            include: { program: true }
        });

        res.status(201).json(cohort);
    } catch (error) {
        console.error('Error creating cohort:', error);
        res.status(500).json({ message: 'Error creating cohort', error: String(error) });
    }
};

export const updateCohort = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, year, currentSemester, programId } = req.body;

        const cohort = await prisma.cohort.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(year && { year: parseInt(year) }),
                ...(currentSemester && { currentSemester: parseInt(currentSemester) }),
                ...(programId && { programId })
            },
            include: { program: true }
        });

        res.json(cohort);
    } catch (error) {
        console.error('Error updating cohort:', error);
        res.status(500).json({ message: 'Error updating cohort', error: String(error) });
    }
};

export const deleteCohort = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Check for existing enrollments
        const cohort = await prisma.cohort.findUnique({
            where: { id },
            include: { _count: { select: { enrollments: true, exams: true } } }
        });

        if (!cohort) {
            return res.status(404).json({ message: 'Cohort not found' });
        }

        if (cohort._count.enrollments > 0 || cohort._count.exams > 0) {
            return res.status(400).json({
                message: 'Cannot delete cohort with existing enrollments or exams. Please remove them first.'
            });
        }

        await prisma.cohort.delete({ where: { id } });
        res.json({ message: 'Cohort deleted successfully' });
    } catch (error) {
        console.error('Error deleting cohort:', error);
        res.status(500).json({ message: 'Error deleting cohort', error: String(error) });
    }
};

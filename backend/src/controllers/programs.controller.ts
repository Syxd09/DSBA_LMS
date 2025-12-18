
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

export const getPrograms = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user?.role;
        const userDeptId = req.user?.departmentId;

        const where: any = {};

        // RBAC: Non-Admins can only see programs in their own department
        if (userRole !== 'ADMIN' && userRole !== 'PRINCIPAL') {
            if (!userDeptId) {
                return res.json([]);
            }
            where.departmentId = userDeptId;
        }

        const programs = await prisma.program.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                department: { select: { id: true, name: true, code: true } },
                _count: { select: { cohorts: true, curriculums: true } }
            }
        });
        res.json(programs);
    } catch (error) {
        console.error('Error fetching programs:', error);
        res.status(500).json({ message: 'Error fetching programs', error: String(error) });
    }
};

export const createProgram = async (req: AuthRequest, res: Response) => {
    try {
        const { name, code, departmentId, durationYears } = req.body;

        if (!name || !code || !departmentId) {
            return res.status(400).json({ message: 'Name, Code, and Department are required' });
        }

        const program = await prisma.program.create({
            data: {
                name,
                code,
                departmentId,
                durationYears: durationYears || 3
            },
            include: { department: true }
        });

        res.status(201).json(program);
    } catch (error) {
        console.error('Error creating program:', error);
        res.status(500).json({ message: 'Error creating program', error: String(error) });
    }
};

export const updateProgram = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, code, departmentId, durationYears } = req.body;

        const program = await prisma.program.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(code && { code }),
                ...(departmentId && { departmentId }),
                ...(durationYears && { durationYears: parseInt(durationYears) })
            },
            include: { department: true }
        });

        res.json(program);
    } catch (error) {
        console.error('Error updating program:', error);
        res.status(500).json({ message: 'Error updating program', error: String(error) });
    }
};

export const deleteProgram = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Check for existing cohorts/curriculums
        const program = await prisma.program.findUnique({
            where: { id },
            include: { _count: { select: { cohorts: true, curriculums: true } } }
        });

        if (!program) {
            return res.status(404).json({ message: 'Program not found' });
        }

        if (program._count.cohorts > 0 || program._count.curriculums > 0) {
            return res.status(400).json({
                message: 'Cannot delete program with existing cohorts or curriculum versions. Please remove them first.'
            });
        }

        await prisma.program.delete({ where: { id } });
        res.json({ message: 'Program deleted successfully' });
    } catch (error) {
        console.error('Error deleting program:', error);
        res.status(500).json({ message: 'Error deleting program', error: String(error) });
    }
};

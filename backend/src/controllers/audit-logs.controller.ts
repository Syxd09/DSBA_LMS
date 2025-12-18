
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { action, limit = 100 } = req.query;

        const whereClause: import('@prisma/client').Prisma.AuditLogWhereInput = {};
        if (action && action !== 'all') {
            whereClause.action = action as string;
        }

        const logs = await prisma.auditLog.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit as string) || 100,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true
                    }
                }
            }
        });
        res.json(logs);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ message: 'Error fetching audit logs', error: String(error) });
    }
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
        const [
            departmentCount,
            programCount,
            userCount,
            cohortCount,
            subjectCount,
            examCount
        ] = await Promise.all([
            prisma.department.count(),
            prisma.program.count(),
            prisma.user.count(),
            prisma.cohort.count(),
            prisma.subject.count(),
            prisma.exam.count()
        ]);

        res.json({
            departments: departmentCount,
            programs: programCount,
            users: userCount,
            cohorts: cohortCount,
            subjects: subjectCount,
            exams: examCount
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats', error: String(error) });
    }
};

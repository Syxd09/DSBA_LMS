import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

/**
 * Get system audit logs
 * @route GET /api/audit-logs
 * @access Admin, Principal
 */
export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { entityType, action, limit = 50, offset = 0 } = req.query;

        const where: any = {};
        if (entityType) where.entityType = entityType;
        if (action) where.action = action;

        const logs = await prisma.auditLog.findMany({
            where,
            include: {
                user: {
                    select: { fullName: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
            skip: Number(offset)
        });

        const total = await prisma.auditLog.count({ where });

        res.json({ logs, total });
    } catch (error) {
        console.error('[AuditLogs] Error fetching:', error);
        res.status(500).json({ message: 'Error fetching audit logs', error: String(error) });
    }
};

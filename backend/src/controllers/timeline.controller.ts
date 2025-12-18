import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

/**
 * Get unified activity timeline
 * Combines audit logs, approvals, attainments, and marks changes
 */
export const getActivityTimeline = async (req: AuthRequest, res: Response) => {
    try {
        const { cohortId, subjectId, limit = 50, page = 1 } = req.query;
        const take = Math.min(Number(limit), 100);
        const skip = (Number(page) - 1) * take;

        // Build filter
        const auditWhere: import('@prisma/client').Prisma.AuditLogWhereInput = {};
        if (cohortId) {
            auditWhere.OR = [
                { tableName: 'exam', newData: { path: ['cohortId'], equals: cohortId } },
                { tableName: 'student_mark' },
                { tableName: 'co_attainment' },
                { tableName: 'po_attainment' },
            ];
        }

        // Get audit logs
        const auditLogs = await prisma.auditLog.findMany({
            where: auditWhere,
            take,
            skip,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { fullName: true, email: true, role: true } }
            }
        });

        // Transform to timeline format
        const timeline = auditLogs.map(log => ({
            id: log.id,
            timestamp: log.createdAt,
            action: log.action,
            category: categorizeAction(log.action, log.tableName),
            actor: log.user ? {
                name: log.user.fullName,
                email: log.user.email,
                role: log.user.role
            } : null,
            entity: log.tableName,
            entityId: log.recordId,
            description: describeAction(log.action, log.tableName, log.newData),
            icon: getActionIcon(log.action),
            color: getActionColor(log.action)
        }));

        // Get total count
        const total = await prisma.auditLog.count({ where: auditWhere });

        res.json({
            timeline,
            pagination: {
                page: Number(page),
                limit: take,
                total,
                pages: Math.ceil(total / take)
            }
        });
    } catch (error) {
        console.error('Error fetching activity timeline:', error);
        res.status(500).json({ message: 'Error fetching timeline', error: String(error) });
    }
};

/**
 * Get activity summary for dashboard
 */
export const getActivitySummary = async (req: AuthRequest, res: Response) => {
    try {
        const { days = 7 } = req.query;
        const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

        // Get counts by action type
        const actionCounts = await prisma.auditLog.groupBy({
            by: ['action'],
            where: { createdAt: { gte: since } },
            _count: true
        });

        // Get recent activity by day
        const dailyActivity = await prisma.$queryRaw`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM "AuditLog"
            WHERE created_at >= ${since}
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        ` as Array<{ date: Date; count: bigint }>;

        // Get most active users
        const activeUsers = await prisma.auditLog.groupBy({
            by: ['userId'],
            where: {
                createdAt: { gte: since },
                userId: { not: null }
            },
            _count: true,
            orderBy: { _count: { userId: 'desc' } },
            take: 5
        });

        // Get user details
        const userIds = activeUsers.map(u => u.userId).filter(Boolean) as string[];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullName: true, role: true }
        });

        const userMap = new Map(users.map(u => [u.id, u]));

        res.json({
            period: { days: Number(days), since },
            actionCounts: actionCounts.map(a => ({ action: a.action, count: a._count })),
            dailyActivity: dailyActivity.map(d => ({ date: d.date, count: Number(d.count) })),
            activeUsers: activeUsers.map(u => ({
                user: userMap.get(u.userId!) || { fullName: 'Unknown', role: 'UNKNOWN' },
                activityCount: u._count
            }))
        });
    } catch (error) {
        console.error('Error fetching activity summary:', error);
        res.status(500).json({ message: 'Error fetching summary', error: String(error) });
    }
};

// Helper functions
function categorizeAction(action: string, tableName: string): string {
    if (action.includes('MARK') || action.includes('GRADE')) return 'marks';
    if (action.includes('ATTAINMENT')) return 'attainment';
    if (action.includes('APPROVE') || action.includes('REJECT')) return 'approval';
    if (action.includes('CREATE') || action.includes('BULK')) return 'creation';
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'auth';
    if (action.includes('UNLOCK') || action.includes('LOCK')) return 'workflow';
    return 'other';
}

function describeAction(action: string, tableName: string, data: any): string {
    const descriptions: Record<string, string> = {
        'LOGIN': 'User logged in',
        'LOGOUT': 'User logged out',
        'SAVE_MARKS': 'Marks were saved',
        'SUBMIT_MARKS': 'Marks submitted for approval',
        'APPROVE_MARKS': 'Marks approved',
        'REJECT_MARKS': 'Marks rejected',
        'CALCULATE_ATTAINMENT': 'CO attainment calculated',
        'APPROVE_ATTAINMENT': 'Attainment approved',
        'LOCK_ATTAINMENT': 'Attainment locked',
        'UNLOCK_REQUEST': 'Unlock request created',
        'HOD_APPROVE': 'HOD approved unlock',
        'PRINCIPAL_APPROVE_UNLOCK': 'Principal approved unlock',
        'RELOCK_MARKS': 'Marks re-locked',
        'BULK_TEACHER_ASSIGNMENT': 'Bulk teacher assignment',
        'BULK_CO_CREATE': 'Bulk CO creation',
        'BULK_PO_CREATE': 'Bulk PO creation',
        'BULK_COPO_MAPPING': 'Bulk CO-PO mapping',
    };
    return descriptions[action] || `${action} on ${tableName}`;
}

function getActionIcon(action: string): string {
    const icons: Record<string, string> = {
        'LOGIN': '🔐',
        'SAVE_MARKS': '✏️',
        'SUBMIT_MARKS': '📤',
        'APPROVE_MARKS': '✅',
        'REJECT_MARKS': '❌',
        'CALCULATE_ATTAINMENT': '📊',
        'LOCK_ATTAINMENT': '🔒',
        'UNLOCK_REQUEST': '🔓',
        'BULK_TEACHER_ASSIGNMENT': '👥',
        'BULK_CO_CREATE': '📋',
    };
    return icons[action] || '📝';
}

function getActionColor(action: string): string {
    if (action.includes('APPROVE') || action.includes('SUCCESS')) return 'green';
    if (action.includes('REJECT') || action.includes('FAIL')) return 'red';
    if (action.includes('LOCK')) return 'blue';
    if (action.includes('UNLOCK')) return 'orange';
    if (action.includes('BULK')) return 'purple';
    return 'gray';
}

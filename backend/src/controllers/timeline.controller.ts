import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

/**
 * Get unified activity timeline
 */
export const getActivityTimeline = async (req: AuthRequest, res: Response) => {
    try {
        const { limit = 50, page = 1 } = req.query;
        const take = Math.min(Number(limit), 100);
        const skip = (Number(page) - 1) * take;

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                orderBy: { createdAt: 'desc' },
                take,
                skip,
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            role: true
                        }
                    }
                }
            }),
            prisma.auditLog.count()
        ]);

        const timeline = logs.map(log => ({
            id: log.id,
            userId: log.userId,
            userName: log.user?.fullName || 'Unknown User',
            userRole: log.user?.role || 'SYSTEM',
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId,
            description: log.description || `${log.action} on ${log.entityType}`,
            timestamp: log.createdAt.toISOString()
        }));

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

        // Fetch logs since date
        const logs = await prisma.auditLog.findMany({
            where: {
                createdAt: { gte: since }
            },
            include: {
                user: {
                    select: {
                        fullName: true,
                        role: true
                    }
                }
            }
        });

        // 1. Calculate action counts (group by action)
        const actionMap: Record<string, number> = {};
        for (const log of logs) {
            actionMap[log.action] = (actionMap[log.action] || 0) + 1;
        }
        const actionCounts = Object.entries(actionMap).map(([action, count]) => ({
            action,
            count
        }));

        // 2. Daily activity (group by date)
        const dailyMap: Record<string, number> = {};
        for (const log of logs) {
            const dateStr = log.createdAt.toISOString().split('T')[0];
            dailyMap[dateStr] = (dailyMap[dateStr] || 0) + 1;
        }
        const dailyActivity = Object.entries(dailyMap).map(([date, count]) => ({
            date,
            count
        })).sort((a, b) => a.date.localeCompare(b.date));

        // 3. Active users (group by userId/userName and count)
        const userActivityMap: Record<string, { userName: string; role: string; count: number }> = {};
        for (const log of logs) {
            if (!userActivityMap[log.userId]) {
                userActivityMap[log.userId] = {
                    userName: log.user?.fullName || 'Unknown User',
                    role: log.user?.role || 'SYSTEM',
                    count: 0
                };
            }
            userActivityMap[log.userId].count += 1;
        }
        const activeUsers = Object.entries(userActivityMap).map(([userId, info]) => ({
            userId,
            userName: info.userName,
            role: info.role,
            count: info.count
        })).sort((a, b) => b.count - a.count).slice(0, 10); // top 10 active users

        res.json({
            period: { days: Number(days), since },
            actionCounts,
            dailyActivity,
            activeUsers
        });
    } catch (error) {
        console.error('Error fetching activity summary:', error);
        res.status(500).json({ message: 'Error fetching summary', error: String(error) });
    }
};

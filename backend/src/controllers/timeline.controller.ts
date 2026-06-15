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
        const actionMap = new Map<string, number>();
        for (const log of logs) {
            actionMap.set(log.action, (actionMap.get(log.action) || 0) + 1);
        }
        const actionCounts = Array.from(actionMap.entries()).map(([action, count]) => ({
            action,
            count
        }));

        // 2. Daily activity (group by date)
        const dailyMap = new Map<string, number>();
        for (const log of logs) {
            const dateStr = log.createdAt.toISOString().split('T')[0];
            dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + 1);
        }
        const dailyActivity = Array.from(dailyMap.entries()).map(([date, count]) => ({
            date,
            count
        })).sort((a, b) => a.date.localeCompare(b.date));

        // 3. Active users (group by userId/userName and count)
        const userActivityMap = new Map<string, { userName: string; role: string; count: number }>();
        for (const log of logs) {
            const existing = userActivityMap.get(log.userId);
            if (!existing) {
                userActivityMap.set(log.userId, {
                    userName: log.user?.fullName || 'Unknown User',
                    role: log.user?.role || 'SYSTEM',
                    count: 1
                });
            } else {
                existing.count += 1;
            }
        }
        const activeUsers = Array.from(userActivityMap.entries()).map(([userId, info]) => ({
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

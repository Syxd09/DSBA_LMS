import { Router, Request, Response } from 'express';
import { checkDatabaseHealth, isDatabaseConnected } from '../services/db';

const router = Router();

/**
 * Health check endpoint - monitors server and database status
 * Always returns 200 with status details (even if DB is down)
 */
router.get('/health', async (req: Request, res: Response) => {
    try {
        const dbHealth = await checkDatabaseHealth();
        const uptime = process.uptime();

        res.status(200).json({
            status: dbHealth.healthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
            services: {
                api: {
                    status: 'up',
                    message: 'API server is running'
                },
                database: {
                    status: dbHealth.healthy ? 'up' : 'down',
                    message: dbHealth.message
                }
            },
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error: any) {
        res.status(200).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            services: {
                api: { status: 'up' },
                database: { status: 'unknown', message: error.message }
            }
        });
    }
});

/**
 * Readiness check - returns 503 if database is unavailable
 * Use this for load balancer health checks
 */
router.get('/ready', async (req: Request, res: Response) => {
    const dbHealth = await checkDatabaseHealth();

    if (dbHealth.healthy) {
        res.status(200).json({ ready: true, message: 'Service is ready' });
    } else {
        res.status(503).json({ ready: false, message: 'Database unavailable' });
    }
});

/**
 * Liveness check - server is alive
 */
router.get('/live', (req: Request, res: Response) => {
    res.status(200).json({ alive: true });
});

export default router;

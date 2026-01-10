import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { isDatabaseConnected } from '../services/db';
import { logger } from '../utils/logger';

/**
 * Database error middleware - handles Prisma connection errors gracefully
 * Prevents backend crashes when database is unavailable
 */
export function databaseErrorHandler(
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
) {
    // Check if this is a Prisma error
    if (
        error instanceof Prisma.PrismaClientInitializationError ||
        error instanceof Prisma.PrismaClientKnownRequestError ||
        error instanceof Prisma.PrismaClientUnknownRequestError ||
        error instanceof Prisma.PrismaClientRustPanicError ||
        error.message?.includes('Can\'t reach database server')
    ) {
        logger.error(`🔴 Database error on ${req.method} ${req.path}: ${error.message}`);

        return res.status(503).json({
            message: 'Database temporarily unavailable',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            suggestion: 'Please try again in a few moments. If the problem persists, contact support.',
            tip: process.env.NODE_ENV === 'development'
                ? 'Check if Docker is running and database is accessible on port 5438'
                : undefined
        });
    }

    // Pass to next error handler if not a database error
    next(error);
}

/**
 * Database availability middleware - check if DB is connected before allowing request
 * Use this on critical routes that absolutely require database
 */
export function requireDatabase(
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (!isDatabaseConnected()) {
        logger.warn(`⚠️  Request to ${req.path} blocked - database unavailable`);
        return res.status(503).json({
            message: 'Service temporarily unavailable - database connection required',
            suggestion: 'Please try again in a few moments',
            healthCheck: `/api/health`
        });
    }
    next();
}

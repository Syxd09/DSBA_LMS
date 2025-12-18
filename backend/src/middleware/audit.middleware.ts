import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import prisma from '../services/db';

export const logAudit = (action: string, tableName: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        const originalJson = res.json;

        // Hook into response to log success only if needed, or log request purely.
        // Ideally audit logging happens AFTER action success.
        // For now, we'll log the attempt or use this as a utility called inside controllers.
        // But as middleware, we can log "Request Started".

        // Better approach: Attach a logger function to req that controllers can call,
        // or log automatically on success response.

        next();
    };
};

export const createAuditLog = async (
    userId: string,
    action: string,
    tableName: string,
    recordId?: string,
    oldData?: any,
    newData?: any
) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                tableName,
                recordId,
                oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : undefined,
                newData: newData ? JSON.parse(JSON.stringify(newData)) : undefined,
            },
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
    }
};

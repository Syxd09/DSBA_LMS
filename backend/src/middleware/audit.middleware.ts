import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import prisma from '../services/db';

export const logAudit = (action: string, tableName: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        // Middleware for logging - can be extended as needed
        next();
    };
};

export const createAuditLog = async (
    userId: string,
    action: string,
    tableName: string,
    recordId?: string,
    oldData?: any,
    newData?: any,
    description?: string,
    ipAddress?: string
) => {
    try {
        // Create real audit log entry
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                entityType: tableName,
                entityId: recordId || '',
                oldValue: oldData || null,
                newValue: newData || null,
                description: description || `${action} on ${tableName}`,
                ipAddress: ipAddress || null
            }
        });

        console.log(`[AUDIT] Logged: ${action} on ${tableName} (ID: ${recordId})`);
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw - audit should not break the main operation
    }
};

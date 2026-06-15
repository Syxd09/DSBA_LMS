import { PrismaClient, Prisma } from '@prisma/client';
import prisma from '../services/db';

/**
 * Audit log data structure
 */
export interface AuditLogData {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    oldValue?: any;
    newValue?: any;
    description?: string;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Violation log data structure
 */
export interface ViolationLogData {
    type: string;  // RBAC_VIOLATION, WORKFLOW_VIOLATION, IMMUTABILITY_VIOLATION, etc.
    userId: string;
    details: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Log an audit event within a transaction
 * USE THIS for successful operations (create, update, delete)
 * 
 * @param tx - Prisma transaction client
 * @param data - Audit log data
 */
export async function logAudit(
    tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    data: AuditLogData
): Promise<void> {
    try {
        await tx.auditLog.create({
            data: {
                userId: data.userId,
                action: data.action,
                entityType: data.entityType,
                entityId: data.entityId,
                oldValue: data.oldValue ? JSON.parse(JSON.stringify(data.oldValue)) : null,
                newValue: data.newValue ? JSON.parse(JSON.stringify(data.newValue)) : null,
                description: data.description || null,
                ipAddress: data.ipAddress || null,
                userAgent: data.userAgent || null,
                createdAt: new Date()
            }
        });
    } catch (error) {
        console.error('Failed to log audit event:', error);
        // Don't throw - audit failure shouldn't break the main operation
    }
}

/**
 * Log a violation event (RBAC, workflow, immutability, etc.)
 * USE THIS for failed operations due to security/workflow violations
 * Does NOT require a transaction - logs immediately
 * 
 * @param data - Violation log data
 */
export async function logViolation(data: ViolationLogData): Promise<void> {
    try {
        // Create audit log for violation
        await prisma.auditLog.create({
            data: {
                userId: data.userId,
                action: 'VIOLATION',
                entityType: data.type,
                entityId: '',
                description: JSON.stringify(data.details),
                ipAddress: data.ipAddress,
                userAgent: data.userAgent
            }
        });

        console.log(`[VIOLATION] Logged: ${data.type} for user ${data.userId}`);
    } catch (error) {
        console.error('Failed to log violation:', error);
    }
}

/**
 * Extract IP address from request
 */
export function getIpAddress(req: any): string | undefined {
    return req.ip || req.connection?.remoteAddress || req.headers?.['x-forwarded-for'];
}

/**
 * Extract user agent from request
 */
export function getUserAgent(req: any): string | undefined {
    return req.headers?.['user-agent'];
}

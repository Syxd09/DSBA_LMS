import { PrismaClient, AuditLog } from '@prisma/client';
import fs from 'fs';
import path from 'path';

/**
 * Transactional Audit Service
 * 
 * Provides GUARANTEED audit logging for governance-critical actions.
 * If audit logging fails, the entire transaction is rolled back.
 * 
 * Usage:
 *   const updated = await prisma.$transaction(async (tx) => {
 *     const result = await tx.entity.update(...);
 *     await auditService.logCritical(tx, { ... }); // Throws if fails
 *     return result;
 *   });
 */

export interface AuditData {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: any;
    newValue?: any;
    description?: string;
    ipAddress?: string;
    userAgent?: string;
}

export class AuditLogError extends Error {
    constructor(message: string, public cause?: any) {
        super(message);
        this.name = 'AuditLogError';
    }
}

export class TransactionalAuditService {
    private fallbackLogPath: string;

    constructor() {
        this.fallbackLogPath = path.join(__dirname, '..', '..', 'logs', 'audit-critical-fallback.log');
        this.ensureLogDirectory();
    }

    /**
     * Log critical action within a transaction.
     * If logging fails, throws error to rollback transaction.
     * 
     * @param tx - Prisma transaction context
     * @param data - Audit data to log
     * @throws AuditLogError if logging fails
     */
    async logCritical(
        tx: any, // Prisma transaction type
        data: AuditData
    ): Promise<AuditLog> {
        try {
            console.log(`[AUDIT-CRITICAL] Logging: ${data.action} on ${data.entityType} (ID: ${data.entityId})`);

            const auditLog = await tx.auditLog.create({
                data: {
                    userId: data.userId,
                    action: data.action,
                    entityType: data.entityType,
                    entityId: data.entityId,
                    oldValue: data.oldValue || null,
                    newValue: data.newValue || null,
                    description: data.description || `${data.action} on ${data.entityType}`,
                    ipAddress: data.ipAddress || null,
                }
            });

            console.log(`[AUDIT-CRITICAL] ✅ Success: ${data.action} logged with ID ${auditLog.id}`);
            return auditLog;

        } catch (error: any) {
            console.error('[AUDIT-CRITICAL] ❌ FAILED:', {
                action: data.action,
                entityType: data.entityType,
                entityId: data.entityId,
                error: error.message
            });

            // Log to fallback file BEFORE throwing
            await this.logToFallback(data, error);

            // CRITICAL: Throw error to rollback transaction
            throw new AuditLogError(
                `Critical audit logging failed for ${data.action} on ${data.entityType}`,
                error
            );
        }
    }

    /**
     * Log non-critical action (best-effort, won't rollback transaction)
     * 
     * @param tx - Prisma transaction context
     * @param data - Audit data to log
     * @returns Promise<void> - Logs errors but doesn't throw
     */
    async logStandard(
        tx: any,
        data: AuditData
    ): Promise<void> {
        try {
            await tx.auditLog.create({
                data: {
                    userId: data.userId,
                    action: data.action,
                    entityType: data.entityType,
                    entityId: data.entityId,
                    oldValue: data.oldValue || null,
                    newValue: data.newValue || null,
                    description: data.description || `${data.action} on ${data.entityType}`,
                    ipAddress: data.ipAddress || null,
                }
            });

            console.log(`[AUDIT-STANDARD] ✅ Logged: ${data.action} on ${data.entityType}`);
        } catch (error: any) {
            console.error('[AUDIT-STANDARD] ⚠️  Failed (non-blocking):', error.message);
            await this.logToFallback(data, error);
            // Don't throw - this is best-effort logging
        }
    }

    /**
     * Fallback logging to file system when database logging fails.
     * Ensures audit trail is never completely lost.
     */
    private async logToFallback(data: AuditData, error: any): Promise<void> {
        try {
            const logEntry = JSON.stringify({
                timestamp: new Date().toISOString(),
                ...data,
                error: {
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                }
            }) + '\n';

            fs.appendFileSync(this.fallbackLogPath, logEntry);
            console.log('[AUDIT-FALLBACK] 📝 Logged to file:', this.fallbackLogPath);
        } catch (fallbackError) {
            console.error('[AUDIT-FALLBACK] ❌ Even fallback failed:', fallbackError);
            // Last resort - this should never happen
        }
    }

    /**
     * Ensure logs directory exists
     */
    private ensureLogDirectory(): void {
        const logDir = path.dirname(this.fallbackLogPath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }
}

// Singleton instance
export const auditService = new TransactionalAuditService();

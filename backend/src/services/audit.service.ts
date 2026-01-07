import prisma from './db';

export const AuditService = {
    log: async (
        userId: string,
        action: string,
        tableName: string,
        recordId: string,
        data?: any,
        oldValue?: any,
        newValue?: any,
        description?: string,
        ipAddress?: string
    ) => {
        try {
            console.log('[AUDIT] Attempting to log:', { userId, action, tableName, recordId });

            // Get user info for the log
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { fullName: true, id: true }
            });

            if (!user) {
                console.error('[AUDIT] ERROR: User not found for userId:', userId);
                return;
            }

            console.log('[AUDIT] Found user:', user.fullName, user.id);

            // Create audit log entry in database
            await prisma.auditLog.create({
                data: {
                    userId,
                    action,
                    entityType: tableName,
                    entityId: recordId,
                    oldValue: oldValue || null,
                    newValue: newValue || data || null,
                    description: description || `${action} ${tableName}`,
                    ipAddress: ipAddress || null,
                }
            });

            console.log('[AUDIT] ✅ Successfully logged:', action, tableName, recordId);
        } catch (error: any) {
            console.error('[AUDIT] ❌ Error creating audit log:', {
                userId,
                action,
                tableName,
                error: error.message,
                code: error.code,
                meta: error.meta
            });
            // Don't throw - audit logging shouldn't break the main operation
        }
    }
};

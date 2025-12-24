import prisma from './db';

export const AuditService = {
    log: async (
        userId: string,
        action: string,
        tableName: string,
        recordId?: string,
        details?: any
    ) => {
        try {
            await prisma.auditLog.create({
                data: {
                    userId,
                    action,
                    tableName,
                    recordId,
                    newData: details ? JSON.parse(JSON.stringify(details)) : undefined,
                },
            });
        } catch (error) {
            console.error('Failed to create audit log:', error);
            // Don't throw, we don't want to break the main action if logging fails
        }
    }
};

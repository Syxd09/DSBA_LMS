/**
 * Soft Delete Utility
 * Provides consistent soft delete operations across models
 */

import { PrismaClient } from '@prisma/client';

// Models that support soft delete
export type SoftDeletableModel =
    | 'user'
    | 'department'
    | 'program'
    | 'cohort'
    | 'subject';

/**
 * Base where clause for active (non-deleted) records
 */
export const activeRecordFilter = {
    isActive: true,
    deletedAt: null,
};

const getModelClient = (prisma: PrismaClient, model: SoftDeletableModel): any => {
    switch (model) {
        case 'user': return prisma.user;
        case 'department': return prisma.department;
        case 'program': return prisma.program;
        case 'cohort': return prisma.cohort;
        case 'subject': return prisma.subject;
        default:
            throw new Error(`Unsupported soft delete model: ${model}`);
    }
};

/**
 * Soft delete a record by setting isActive=false and deletedAt=now
 */
export const softDelete = async <T extends { id: string }>(
    prisma: PrismaClient,
    model: SoftDeletableModel,
    id: string
): Promise<T> => {
    const modelClient = getModelClient(prisma, model);

    return await modelClient.update({
        where: { id },
        data: {
            isActive: false,
            deletedAt: new Date(),
        },
    });
};

/**
 * Restore a soft-deleted record
 */
export const restoreRecord = async <T extends { id: string }>(
    prisma: PrismaClient,
    model: SoftDeletableModel,
    id: string
): Promise<T> => {
    const modelClient = getModelClient(prisma, model);

    return await modelClient.update({
        where: { id },
        data: {
            isActive: true,
            deletedAt: null,
        },
    });
};

/**
 * Find all active records
 */
export const findActiveRecords = async <T>(
    prisma: PrismaClient,
    model: SoftDeletableModel,
    additionalWhere: Record<string, any> = {},
    include?: Record<string, any>
): Promise<T[]> => {
    const modelClient = getModelClient(prisma, model);

    return await modelClient.findMany({
        where: {
            ...activeRecordFilter,
            ...additionalWhere,
        },
        include,
    });
};

/**
 * Find all deleted records (for admin recovery)
 */
export const findDeletedRecords = async <T>(
    prisma: PrismaClient,
    model: SoftDeletableModel,
    additionalWhere: Record<string, any> = {},
    include?: Record<string, any>
): Promise<T[]> => {
    const modelClient = getModelClient(prisma, model);

    return await modelClient.findMany({
        where: {
            isActive: false,
            deletedAt: { not: null },
            ...additionalWhere,
        },
        include,
    });
};

/**
 * Check if a record is soft-deleted
 */
export const isDeleted = (record: { isActive?: boolean; deletedAt?: Date | null }): boolean => {
    return record.isActive === false || record.deletedAt !== null;
};

/**
 * Prisma middleware for automatic soft delete filtering
 * Apply this to automatically filter out deleted records in findMany/findFirst
 * 
 * @example
 * const prisma = new PrismaClient().$extends(softDeleteMiddleware);
 */
export const softDeleteMiddleware = {
    query: {
        $allModels: {
            async findMany({ model, operation, args, query }: any) {
                const softDeletableModels = ['User', 'Department', 'Program', 'Cohort', 'Subject'];

                if (softDeletableModels.includes(model)) {
                    // Only add filter if not explicitly querying for deleted records
                    if (!args.where?.isActive && args.where?.isActive !== false) {
                        args.where = {
                            ...args.where,
                            isActive: true,
                        };
                    }
                }

                return query(args);
            },
        },
    },
};

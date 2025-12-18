/**
 * Pagination utility for list endpoints
 */

export interface PaginationParams {
    page: number;
    limit: number;
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

/**
 * Parse pagination query params with defaults
 */
export const parsePagination = (query: { page?: string | number; limit?: string | number }): PaginationParams => {
    const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10) || 20));
    return { page, limit };
};

/**
 * Calculate skip value for Prisma
 */
export const getSkip = (page: number, limit: number): number => {
    return (page - 1) * limit;
};

/**
 * Build pagination response object
 */
export const buildPaginatedResponse = <T>(
    data: T[],
    total: number,
    params: PaginationParams
): PaginatedResult<T> => {
    const { page, limit } = params;
    const totalPages = Math.ceil(total / limit);

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
};

/**
 * Prisma pagination helper
 * Returns { skip, take } for use in Prisma queries
 */
export const prismaPagination = (params: PaginationParams) => ({
    skip: getSkip(params.page, params.limit),
    take: params.limit,
});

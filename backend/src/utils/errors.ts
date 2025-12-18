import { Response } from 'express';

/**
 * Standardized error response utilities for consistent API error handling
 */

interface ErrorResponse {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
}

/**
 * Send a standardized error response
 */
export const sendError = (
    res: Response,
    statusCode: number,
    message: string,
    code?: string,
    details?: Record<string, unknown>
): Response => {
    const response: ErrorResponse = { message };
    if (code) response.code = code;
    if (details) response.details = details;
    return res.status(statusCode).json(response);
};

/**
 * Send a 400 Bad Request error
 */
export const badRequest = (res: Response, message: string, details?: Record<string, unknown>): Response => {
    return sendError(res, 400, message, 'BAD_REQUEST', details);
};

/**
 * Send a 401 Unauthorized error
 */
export const unauthorized = (res: Response, message = 'Unauthorized'): Response => {
    return sendError(res, 401, message, 'UNAUTHORIZED');
};

/**
 * Send a 403 Forbidden error
 */
export const forbidden = (res: Response, message = 'Access denied'): Response => {
    return sendError(res, 403, message, 'FORBIDDEN');
};

/**
 * Send a 404 Not Found error
 */
export const notFound = (res: Response, resource = 'Resource'): Response => {
    return sendError(res, 404, `${resource} not found`, 'NOT_FOUND');
};

/**
 * Send a 409 Conflict error
 */
export const conflict = (res: Response, message: string): Response => {
    return sendError(res, 409, message, 'CONFLICT');
};

/**
 * Send a 500 Internal Server Error
 */
export const internalError = (res: Response, error: unknown, operation = 'Operation'): Response => {
    console.error(`${operation} failed:`, error);
    return sendError(res, 500, `${operation} failed`, 'INTERNAL_ERROR');
};

/**
 * Send a 422 Validation Error
 */
export const validationError = (res: Response, errors: Record<string, string[]>): Response => {
    return sendError(res, 422, 'Validation failed', 'VALIDATION_ERROR', { errors });
};

/**
 * Safe wrapper for async controller functions
 */
export const asyncHandler = (
    fn: (req: any, res: Response) => Promise<any>
) => {
    return (req: any, res: Response) => {
        Promise.resolve(fn(req, res)).catch((error) => {
            console.error('Unhandled controller error:', error);
            return internalError(res, error);
        });
    };
};

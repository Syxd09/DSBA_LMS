import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Enterprise-grade validation middleware using Zod
 * Returns standardized error responses
 */
export const validate = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            // Parse and validate request body
            const validated = schema.parse(req.body);

            // Replace req.body with validated data (type-safe)
            req.body = validated;

            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request data',
                    errors: error.issues.map((e: any) => ({
                        field: e.path.join('.'),
                        message: e.message,
                        code: e.code
                    }))
                });
            }

            // Unexpected error
            console.error('[VALIDATION] Unexpected error:', error);
            return res.status(500).json({
                success: false,
                code: 'VALIDATION_FAILED',
                message: 'Validation middleware encountered an error'
            });
        }
    };
};

/**
 * Validate query parameters instead of body
 */
export const validateQuery = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const validated = schema.parse(req.query);
            req.query = validated as any;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid query parameters',
                    errors: error.issues.map((e: any) => ({
                        field: e.path.join('.'),
                        message: e.message
                    }))
                });
            }
            next(error);
        }
    };
};

/**
 * Validate URL parameters
 */
export const validateParams = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const validated = schema.parse(req.params);
            req.params = validated as any;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid URL parameters',
                    errors: error.issues.map((e: any) => ({
                        field: e.path.join('.'),
                        message: e.message
                    }))
                });
            }
            next(error);
        }
    };
};

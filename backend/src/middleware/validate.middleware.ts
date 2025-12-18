import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';

/**
 * Validation middleware factory
 * Creates middleware that validates request body, query, or params against a Zod schema
 */

interface ValidationOptions {
    /** Where to find the data to validate */
    source?: 'body' | 'query' | 'params';
    /** Whether to strip unknown properties */
    stripUnknown?: boolean;
}

/**
 * Creates a validation middleware for the given schema
 * 
 * @example
 * router.post('/users', validate(CreateUserSchema), createUser);
 * router.get('/users', validate(PaginationSchema, { source: 'query' }), getUsers);
 */
export const validate = <T>(
    schema: ZodSchema<T>,
    options: ValidationOptions = {}
) => {
    const { source = 'body' } = options;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const data = req[source];
            const parsed = await schema.parseAsync(data);

            // Replace the source data with the parsed (and potentially transformed) data
            if (source === 'body') {
                req.body = parsed;
            } else if (source === 'query') {
                req.query = parsed as any;
            } else if (source === 'params') {
                req.params = parsed as any;
            }

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const formattedErrors = error.issues.map((err: ZodIssue) => ({
                    path: err.path.join('.'),
                    message: err.message,
                }));

                res.status(400).json({
                    message: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    errors: formattedErrors,
                });
                return;
            }

            // Re-throw non-Zod errors
            next(error);
        }
    };
};

/**
 * Validates multiple sources at once
 * 
 * @example
 * router.put('/users/:id', 
 *   validateMultiple({ params: IdParamSchema, body: UpdateUserSchema }),
 *   updateUser
 * );
 */
export const validateMultiple = (schemas: {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
}) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const errors: Array<{ source: string; path: string; message: string }> = [];

        for (const [source, schema] of Object.entries(schemas)) {
            if (!schema) continue;

            try {
                const data = req[source as 'body' | 'query' | 'params'];
                const parsed = await schema.parseAsync(data);

                if (source === 'body') {
                    req.body = parsed;
                } else if (source === 'query') {
                    req.query = parsed as any;
                } else if (source === 'params') {
                    req.params = parsed as any;
                }
            } catch (error) {
                if (error instanceof ZodError) {
                    errors.push(
                        ...error.issues.map((err: ZodIssue) => ({
                            source,
                            path: err.path.join('.'),
                            message: err.message,
                        }))
                    );
                }
            }
        }

        if (errors.length > 0) {
            res.status(400).json({
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                errors,
            });
            return;
        }

        next();
    };
};

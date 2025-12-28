import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema<any>, source: 'body' | 'query' | 'params' | 'all' = 'body') => (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        let data;
        if (source === 'all') {
            data = {
                body: req.body,
                query: req.query,
                params: req.params,
            };
        } else {
            data = req[source];
        }

        schema.parse(data);
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            // Log the validation error for debugging
            import('../utils/logger').then(({ logger }) => {
                logger.warn(`Validation failed: ${JSON.stringify(error.issues)}`);
            });

            return res.status(400).json({
                message: 'Validation failed',
                errors: error.issues.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        return res.status(500).json({ message: 'Internal validation error' });
    }
};

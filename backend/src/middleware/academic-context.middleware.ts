import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

/**
 * Academic Context Interface
 * Required parameters for academic data isolation
 */
export interface AcademicContext {
    departmentId: string;
    cohortId: string;
    semester: number;
    academicYear?: string;
}

/**
 * Extended request with academic context
 */
export interface AcademicRequest extends AuthRequest {
    academicContext?: AcademicContext;
}

/**
 * Context source options
 */
interface ContextOptions {
    /** Where to find context: query params, body, or both */
    source?: 'query' | 'body' | 'any';
    /** Which fields are required */
    required?: ('departmentId' | 'cohortId' | 'semester' | 'academicYear')[];
    /** Allow override from user's own department (for HOD/department users) */
    allowUserDepartment?: boolean;
}

const DEFAULT_OPTIONS: ContextOptions = {
    source: 'any',
    required: ['cohortId'],
    allowUserDepartment: true,
};

/**
 * Middleware to enforce academic context on API endpoints
 * 
 * This prevents:
 * - Fetching data from other cohorts/departments
 * - Cross-cohort data corruption
 * - Analytics data leakage
 * 
 * @example
 * // Require cohortId (default)
 * router.get('/marks', requireAcademicContext(), getMarks);
 * 
 * // Require cohortId and semester
 * router.get('/results', requireAcademicContext({ required: ['cohortId', 'semester'] }), getResults);
 * 
 * // Require full context
 * router.post('/attainment', requireAcademicContext({ 
 *   required: ['departmentId', 'cohortId', 'semester'] 
 * }), calculateAttainment);
 */
export const requireAcademicContext = (options: ContextOptions = {}) => {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    return async (req: AcademicRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            // User must be authenticated
            if (!req.user) {
                res.status(401).json({
                    message: 'Authentication required for academic context',
                    code: 'AUTH_REQUIRED'
                });
                return;
            }

            // Extract context from appropriate source
            let contextSource: Record<string, any> = {};

            if (opts.source === 'query' || opts.source === 'any') {
                contextSource = { ...contextSource, ...req.query };
            }
            if (opts.source === 'body' || opts.source === 'any') {
                contextSource = { ...contextSource, ...req.body };
            }
            // Also check params for route-based context
            contextSource = { ...contextSource, ...req.params };

            // Build academic context
            const context: Partial<AcademicContext> = {
                departmentId: contextSource.departmentId as string,
                cohortId: contextSource.cohortId as string,
                semester: contextSource.semester ? parseInt(String(contextSource.semester), 10) : undefined,
                academicYear: contextSource.academicYear as string,
            };

            // If user has a department and allowUserDepartment, use it as fallback
            if (opts.allowUserDepartment && !context.departmentId && req.user.departmentId) {
                context.departmentId = req.user.departmentId;
            }

            // Validate required fields
            const missingFields: string[] = [];
            for (const field of opts.required || []) {
                if (!context[field]) {
                    missingFields.push(field);
                }
            }

            if (missingFields.length > 0) {
                res.status(400).json({
                    message: 'Academic context required',
                    code: 'CONTEXT_REQUIRED',
                    missingFields,
                    hint: `Please provide: ${missingFields.join(', ')} in your request`
                });
                return;
            }

            // Validate semester is a valid number if provided
            if (context.semester !== undefined && (isNaN(context.semester) || context.semester < 1 || context.semester > 12)) {
                res.status(400).json({
                    message: 'Invalid semester value',
                    code: 'INVALID_SEMESTER',
                    hint: 'Semester must be between 1 and 12'
                });
                return;
            }

            // RBAC check: Ensure user has access to this context
            const userRole = req.user.role?.toUpperCase();

            // ADMIN and PRINCIPAL can access all contexts
            if (userRole !== 'ADMIN' && userRole !== 'PRINCIPAL') {
                // HOD can only access their department
                if (userRole === 'HOD' && context.departmentId) {
                    if (req.user.departmentId && context.departmentId !== req.user.departmentId) {
                        res.status(403).json({
                            message: 'Access denied: You can only access your department data',
                            code: 'DEPARTMENT_ACCESS_DENIED'
                        });
                        return;
                    }
                }

                // TEACHER - should be assigned to the cohort/subject
                // For now, we allow teachers to access but should validate assignment
                // This can be enhanced with TeacherAssignment check
            }

            // Attach validated context to request
            req.academicContext = context as AcademicContext;

            next();
        } catch (error) {
            console.error('Academic context middleware error:', error);
            res.status(500).json({
                message: 'Error validating academic context',
                code: 'CONTEXT_ERROR'
            });
        }
    };
};

/**
 * Helper to get academic context from request
 * Use this in controllers after middleware validates context
 */
export const getAcademicContext = (req: AcademicRequest): AcademicContext | undefined => {
    return req.academicContext;
};

/**
 * Builds Prisma where clause with academic context filters
 * 
 * @example
 * const where = buildContextWhere(req, { cohortId: true, semester: true });
 * const marks = await prisma.studentMark.findMany({ where });
 */
export const buildContextWhere = (
    req: AcademicRequest,
    fields: Partial<Record<keyof AcademicContext, boolean>>
): Record<string, any> => {
    const context = req.academicContext;
    if (!context) return {};

    const where: Record<string, any> = {};

    if (fields.departmentId && context.departmentId) {
        where.departmentId = context.departmentId;
    }
    if (fields.cohortId && context.cohortId) {
        where.cohortId = context.cohortId;
    }
    if (fields.semester && context.semester) {
        where.semester = context.semester;
    }
    if (fields.academicYear && context.academicYear) {
        where.academicYear = context.academicYear;
    }

    return where;
};

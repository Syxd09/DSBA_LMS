import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { Role } from '@prisma/client';

/**
 * RBAC Middleware - Require specific roles to access routes
 * Backward compatible: accepts both array and variadic arguments
 * Usage: 
 *   requireRole(['ADMIN', 'PRINCIPAL']) - old style
 *   requireRole(Role.ADMIN, Role.PRINCIPAL) - new style
 */
export const requireRole = (...allowedRoles: (Role | Role[])[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({
                message: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        // Flatten array if old-style array argument was passed
        const roles: Role[] = allowedRoles.flat() as Role[];

        // Convert string roles to Role enum for backward compatibility
        const roleEnums = roles.map(r => {
            if (typeof r === 'string') {
                return r as Role;
            }
            return r;
        });

        // Check if user has required role
        const userRole = req.user.role as Role;
        if (!roleEnums.includes(userRole)) {
            return res.status(403).json({
                message: 'Insufficient permissions',
                required: roleEnums,
                current: userRole,
                code: 'FORBIDDEN'
            });
        }

        // User has required role, proceed
        next();
    };
};

/**
 * Resource ownership check - Students can only access their own data
 */
export const requireOwnershipOrRole = (...adminRoles: (Role | Role[])[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Flatten array if needed
        const roles: Role[] = adminRoles.flat() as Role[];

        const userRole = req.user.role as Role;
        const userId = req.user.userId;
        const targetUserId = req.params.studentId || req.query.studentId;

        // Admin roles can access any data
        if (roles.includes(userRole)) {
            return next();
        }

        // Students can only access their own data
        if (userRole === Role.STUDENT && userId === targetUserId) {
            return next();
        }

        return res.status(403).json({
            message: 'You can only access your own data',
            code: 'OWNERSHIP_REQUIRED'
        });
    };
};

/**
 * Department-scoped access - HODs can only access their department's data
 */
export const requireDepartmentAccess = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = req.user.role as Role;
    const userDepartmentId = req.user.departmentId;
    const targetDepartmentId = req.params.departmentId || req.body.departmentId || req.query.departmentId;

    // ADMIN and PRINCIPAL can access all departments
    if (userRole === Role.ADMIN || userRole === Role.PRINCIPAL) {
        return next();
    }

    // HOD can only access their own department
    if (userRole === Role.HOD) {
        if (userDepartmentId !== targetDepartmentId) {
            return res.status(403).json({
                message: 'You can only access data from your department',
                code: 'DEPARTMENT_ACCESS_DENIED'
            });
        }
        return next();
    }

    // Teachers and students have different access patterns
    // This should be handled in individual controllers
    next();
};

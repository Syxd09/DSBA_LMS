import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extend Request to include user from auth middleware
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        departmentId?: string;
    };
}

/**
 * Middleware to check if user can access specific feedback
 * Used for GET, PUT, DELETE operations on individual feedback
 */
export const canAccessFeedback = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id } = req.params;
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const feedback = await prisma.teacherStudentFeedback.findUnique({
            where: { id },
            include: {
                student: {
                    select: { id: true, departmentId: true }
                },
                subject: {
                    select: { id: true }
                }
            }
        });

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        // Admin/Principal: Full access
        if (user.role === 'ADMIN' || user.role === 'PRINCIPAL') {
            return next();
        }

        // HOD: Department only
        if (user.role === 'HOD') {
            if (feedback.student.departmentId !== user.departmentId) {
                return res.status(403).json({
                    message: 'Access denied: You can only access feedback for students in your department'
                });
            }
            return next();
        }

        // Teacher: Owner only
        if (user.role === 'TEACHER') {
            if (feedback.teacherId !== user.id) {
                return res.status(403).json({
                    message: 'Access denied: You can only access your own feedback'
                });
            }
            return next();
        }

        // Student: Own feedback only
        if (user.role === 'STUDENT') {
            if (feedback.studentId !== user.id) {
                return res.status(403).json({
                    message: 'Access denied: You can only view feedback given to you'
                });
            }
            return next();
        }

        return res.status(403).json({ message: 'Access denied' });
    } catch (error) {
        console.error('Error in canAccessFeedback middleware:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Middleware to check if user can edit templates
 * Only Admin can edit templates (structural authority)
 */
export const canEditTemplate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (user.role !== 'ADMIN') {
            return res.status(403).json({
                message: 'Only administrators can edit feedback templates'
            });
        }

        next();
    } catch (error) {
        console.error('Error in canEditTemplate middleware:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Middleware to check if user can approve feedback
 * HOD (department only), Principal, Admin
 */
export const canApproveFeedback = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id } = req.params;
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const feedback = await prisma.teacherStudentFeedback.findUnique({
            where: { id },
            include: {
                student: {
                    select: { departmentId: true }
                }
            }
        });

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        // Admin/Principal: Full access
        if (user.role === 'ADMIN' || user.role === 'PRINCIPAL') {
            return next();
        }

        // HOD: Department only
        if (user.role === 'HOD') {
            if (feedback.student.departmentId !== user.departmentId) {
                return res.status(403).json({
                    message: 'You can only approve feedback for students in your department'
                });
            }
            return next();
        }

        return res.status(403).json({
            message: 'Insufficient permissions to approve feedback'
        });
    } catch (error) {
        console.error('Error in canApproveFeedback middleware:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Middleware to check if user can lock feedback
 * Principal, Admin only
 */
export const canLockFeedback = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (user.role !== 'ADMIN' && user.role !== 'PRINCIPAL') {
            return res.status(403).json({
                message: 'Only Principal or Admin can lock feedback permanently'
            });
        }

        next();
    } catch (error) {
        console.error('Error in canLockFeedback middleware:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

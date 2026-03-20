import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
        departmentId?: string;
    };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    // SECURITY: Validate JWT_SECRET exists before verification
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('CRITICAL: JWT_SECRET environment variable is not defined!');
        return res.status(500).json({
            message: 'Server configuration error. Please contact administrator.'
        });
    }

    jwt.verify(token, secret, (err, user: any) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        
        // BUG-MIX-01: Ensure both 'id' and 'userId' are available for consistency across controllers
        // Most controllers use .id (Prisma standard), but the JWT payload currently uses userId
        if (user && user.userId && !user.id) {
            user.id = user.userId;
        } else if (user && user.id && !user.userId) {
            user.userId = user.id;
        }

        req.user = user;
        next();
    });
};

// Export alias for backward compatibility
export const authenticate = authenticateToken;


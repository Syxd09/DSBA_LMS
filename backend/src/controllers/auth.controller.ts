import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../services/db';
import { createAuditLog } from '../middleware/audit.middleware';

/**
 * User registration endpoint.
 * 
 * Creates a new user account with hashed password using bcrypt.
 * Email must be unique. Default role is STUDENT.
 * 
 * @route POST /api/auth/register
 * @access Public
 * @param {string} req.body.email - Unique email address
 * @param {string} req.body.password - Password (min 6 characters, will be hashed)
 * @param {string} req.body.name - Full name of user
 * @param {string} [req.body.role=STUDENT] - User role (ADMIN, PRINCIPAL, HOD, TEACHER, STUDENT)
 * @returns {object} 201 - User created successfully with JWT token
 * @returns {object} 400 - Email already exists or validation error
 * @returns {object} 500 - Server error
 * 
 * @example
 * POST /api/auth/register
 * {
 *   "email": "student@example.com",
 *   "password": "password123",
 *   "name": "Jane Smith",
 *   "role": "STUDENT"
 * }
 */
export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, fullName, departmentId } = req.body;

        // Basic validation
        if (!email || !password || !fullName) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // BUG-007 FIX: Password strength validation
        if (password.length < 8) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters long',
                code: 'WEAK_PASSWORD'
            });
        }

        // Enhanced password validation
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
            return res.status(400).json({
                message: 'Password must contain uppercase, lowercase, number, and special character',
                code: 'WEAK_PASSWORD'
            });
        }

        // BUG-005 FIX: Department ID required for students
        if (!departmentId) {
            return res.status(400).json({
                message: 'Department is required for student registration',
                code: 'DEPARTMENT_REQUIRED'
            });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // SECURITY: Self-registration only allowed for STUDENT role
        // Admin/HOD/Principal must be created by existing Admin
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName,
                role: 'STUDENT',  // Always STUDENT for self-registration
                departmentId  // BUG-005 FIX: Now required
            }
        });

        await createAuditLog(user.id, 'REGISTER', 'users', user.id);

        res.status(201).json({ message: 'User registered successfully', userId: user.id });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error });
    }
};

/**
 * User login endpoint.
 * 
 * Authenticates a user with email and password, returns JWT token on success.
 * Rate limited to 5 attempts per 15 minutes per IP address.
 * 
 * @route POST /api/auth/login
 * @access Public
 * @param {string} req.body.email - User email address
 * @param {string} req.body.password - User password (will be compared with bcrypt hash)
 * @returns {object} 200 - Success response with JWT token and user data
 * @returns {object} 401 - Invalid credentials
 * @returns {object} 500 - Server error
 * 
 * @example
 * POST /api/auth/login
 * {
 *   "email": "teacher@example.com",
 *   "password": "securepassword123"
 * }
 * 
 * Response:
 * {
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "user": {
 *     "id": "uuid",
 *     "email": "teacher@example.com",
 *     "name": "John Doe",
 *     "role": "TEACHER"
 *   }
 * }
 */
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'Invalid credentials or inactive account' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is missing!');
            throw new Error('JWT_SECRET is not defined');
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role, email: user.email, departmentId: user.departmentId },
            process.env.JWT_SECRET as string,
            { expiresIn: '4h' } // BUG-008 FIX: Reduced from 24h for better security
        );

        await createAuditLog(user.id, 'LOGIN', 'users', user.id);

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                departmentId: user.departmentId
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed', error: String(error) });
    }
};

/**
 * Get current authenticated user profile.
 * 
 * Returns full user profile for the currently authenticated user.
 * Requires valid JWT token in Authorization header.
 * 
 * @route GET /api/auth/me
 * @access Private (requires authentication)
 * @returns {object} 200 - User profile data
 * @returns {object} 401 - Not authenticated or invalid token
 * @returns {object} 404 - User not found
 * @returns {object} 500 - Server error
 * 
 * @example
 * GET /api/auth/me
 * Headers: { Authorization: "Bearer <jwt_token>" }
 * 
 * Response:
 * {
 *   "id": "uuid",
 *   "email": "user@example.com",
 *   "name": "John Doe",
 *   "role": "TEACHER",
 *   "department": { ... },
 *   "createdAt": "2024-01-01T00:00:00.000Z"
 * }
 */
export const getProfile = async (req: any, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                departmentId: true,
                department: {
                    select: {
                        name: true,
                        code: true
                    }
                }
            }
        });

        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile', error: String(error) });
    }
};

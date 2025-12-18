import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../services/db';
import { createAuditLog } from '../middleware/audit.middleware';

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, fullName } = req.body;

        // Basic validation
        if (!email || !password || !fullName) {
            return res.status(400).json({ message: 'Missing required fields' });
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
                role: 'STUDENT'  // Always STUDENT for self-registration
            }
        });

        await createAuditLog(user.id, 'REGISTER', 'users', user.id);

        res.status(201).json({ message: 'User registered successfully', userId: user.id });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error });
    }
};

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
            { expiresIn: '24h' } // Longer session for convenience
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

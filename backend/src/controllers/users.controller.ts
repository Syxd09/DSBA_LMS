
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';
import * as bcrypt from 'bcrypt';

export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { fullName: 'asc' },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                createdAt: true,
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true
                    }
                }
            }
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users', error: String(error) });
    }
};

export const createUser = async (req: AuthRequest, res: Response) => {
    try {
        const { email, password, fullName, name, role, departmentId } = req.body;
        const userName = fullName || name; // Support both for compatibility

        if (!email || !password || !userName || !role) {
            return res.status(400).json({ message: 'Email, Password, Name, and Role are required' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName: userName,
                role: role.toUpperCase() as keyof typeof import('@prisma/client').Role,
                departmentId: departmentId || null
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                createdAt: true
            }
        });

        res.status(201).json(user);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creating user', error: String(error) });
    }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { fullName, name, role, departmentId } = req.body;
        const userName = fullName || name;

        const user = await prisma.user.update({
            where: { id },
            data: {
                fullName: userName,
                role: role ? role.toUpperCase() as keyof typeof import('@prisma/client').Role : undefined,
                departmentId: departmentId || null
            }
        });

        res.json(user);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user', error: String(error) });
    }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user', error: String(error) });
    }
};

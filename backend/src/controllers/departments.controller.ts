
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

export const getDepartments = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user?.role;
        const userDeptId = req.user?.departmentId;

        const where: any = {};

        // RBAC: Non-Admins can only see their own department
        if (userRole !== 'ADMIN' && userRole !== 'PRINCIPAL') {
            if (!userDeptId) {
                return res.json([]); // No department assigned -> No visibility
            }
            where.id = userDeptId;
        }

        const departments = await prisma.department.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                hod: { select: { id: true, fullName: true, email: true } },
                _count: { select: { users: true, programs: true } }
            }
        });
        res.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ message: 'Error fetching departments', error: String(error) });
    }
};

export const createDepartment = async (req: AuthRequest, res: Response) => {
    try {
        const { name, code, hodId } = req.body;

        if (!name || !code) {
            return res.status(400).json({ message: 'Name and Code are required' });
        }

        const department = await prisma.department.create({
            data: {
                name,
                code,
                hodId: hodId || null
            }
        });

        res.status(201).json(department);
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({ message: 'Error creating department', error: String(error) });
    }
};

export const updateDepartment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, code, hodId } = req.body;

        const department = await prisma.department.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(code && { code }),
                ...(hodId !== undefined && { hodId: hodId || null })
            }
        });

        res.json(department);
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({ message: 'Error updating department', error: String(error) });
    }
};

export const deleteDepartment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Check if department has related data
        const dept = await prisma.department.findUnique({
            where: { id },
            include: {
                _count: { select: { users: true, programs: true, studentEnrollments: true } }
            }
        });

        if (!dept) {
            return res.status(404).json({ message: 'Department not found' });
        }

        if (dept._count.users > 0 || dept._count.programs > 0 || dept._count.studentEnrollments > 0) {
            return res.status(400).json({
                message: 'Cannot delete department with existing users, programs, or enrollments. Please remove them first.'
            });
        }

        await prisma.department.delete({ where: { id } });
        res.json({ message: 'Department deleted successfully' });
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({ message: 'Error deleting department', error: String(error) });
    }
};

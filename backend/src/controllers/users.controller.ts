
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        const { role } = req.query;
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.userId;
        
        const where: any = {
            deletedAt: null
        };
        
        if (role) {
            where.role = (role as string).toUpperCase();
        }

        // RBAC: HOD sees only their department users
        if (userRole === 'HOD') {
            const department = await prisma.department.findFirst({
                where: { hodId: userId }
            });
            if (department) {
                where.departmentId = department.id;
            } else if (req.user?.departmentId) {
                where.departmentId = req.user.departmentId;
            } else {
                return res.json([]);
            }
        }

        const users = await prisma.user.findMany({
            where,
            orderBy: { fullName: 'asc' },
            select: {
                id: true,
                email: true,
                fullName: true, registrationNumber: true,
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

export const getTeachers = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.userId;

        const where: any = {
            role: 'TEACHER',
            isActive: true,
            deletedAt: null
        };

        // RBAC: HOD sees only their department teachers
        if (userRole === 'HOD') {
            const department = await prisma.department.findFirst({
                where: { hodId: userId }
            });
            if (department) {
                where.departmentId = department.id;
            } else if (req.user?.departmentId) {
                where.departmentId = req.user.departmentId;
            } else {
                return res.json([]);
            }
        }

        const teachers = await prisma.user.findMany({
            where,
            orderBy: { fullName: 'asc' },
            select: {
                id: true,
                fullName: true, registrationNumber: true,
                email: true,
                departmentId: true,
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true
                    }
                }
            }
        });
        res.json(teachers);
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({ message: 'Error fetching teachers', error: String(error) });
    }
};

export const getUser = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                department: true,
                teacherAssignments: {
                    include: {
                        subject: true,
                        cohort: true
                    }
                }
            }
        });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Error fetching user', error: String(error) });
    }
};

import { AuditService } from '../services/audit.service';

export const createUser = async (req: AuthRequest, res: Response) => {
    try {
        const { email, password, fullName, name, role, departmentId, teacherAssignments, registrationNumber } = req.body;
        const userName = fullName || name;
        const requsterRole = req.user?.role?.toUpperCase();
        const requesterId = req.user?.userId;

        if (!email || !password || !userName || !role) {
            return res.status(400).json({ message: 'Email, Password, Name, and Role are required' });
        }

        const validRoles = ['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER', 'STUDENT'];
        if (!validRoles.includes(role.toUpperCase())) {
            return res.status(400).json({ message: `Invalid role. Allowed roles: ${validRoles.join(', ')}` });
        }

        let effectiveDepartmentId = departmentId;

        if (requsterRole === 'HOD') {
            const hodUser = await prisma.user.findUnique({
                where: { id: requesterId },
                include: { departmentLed: true }
            });

            if (!hodUser?.departmentLed) {
                return res.status(403).json({ message: 'HOD must manage a department to create users.' });
            }

            // HOD Restriction: Cannot create ADMIN or PRINCIPAL
            if (['ADMIN', 'PRINCIPAL'].includes(role.toUpperCase())) {
                return res.status(403).json({ message: 'HOD cannot create ADMIN or PRINCIPAL users.' });
            }

            effectiveDepartmentId = hodUser.departmentLed.id;
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Prepare assignment data if provided and role is Teacher
        let assignmentsCreate = undefined;
        if (role.toUpperCase() === 'TEACHER' && teacherAssignments && Array.isArray(teacherAssignments) && teacherAssignments.length > 0) {
            // Validate and map assignments
            // Assignments from frontend: { cohortId, subjectId, semester, departmentId }
            // Note: HOD creates assignments in their dept.
            assignmentsCreate = {
                create: teacherAssignments.map((a: any) => ({
                    cohortId: a.cohortId,
                    subjectId: a.subjectId,
                    semester: Number(a.semester),
                    departmentId: a.departmentId || effectiveDepartmentId, // Fallback to user's dept
                    academicYear: '2025-26' // Default for now, ideally dynamic or from input
                }))
            };
        }

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName: userName,
                role: role.toUpperCase() as Role,
                registrationNumber: registrationNumber || null,
                departmentId: effectiveDepartmentId || null,
                teacherAssignments: assignmentsCreate
            },
            select: {
                id: true,
                email: true,
                fullName: true, registrationNumber: true,
                role: true,
                createdAt: true
            }
        });

        // Audit Log
        if (req.user?.userId) {
            await AuditService.log(req.user.userId, 'USER_CREATED', 'User', user.id, {
                email: user.email,
                role: user.role,
                assignments: teacherAssignments?.length || 0
            });
        }

        res.status(201).json(user);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creating user', error: String(error) });
    }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { fullName, name, role, departmentId, password, teacherAssignments, registrationNumber } = req.body;
        const userName = fullName || name;
        const requsterRole = req.user?.role?.toUpperCase();
        const requesterId = req.user?.userId;

        // HOD Check for Update
        let effectiveDepartmentId = departmentId;
        if (requsterRole === 'HOD') {
            const hodUser = await prisma.user.findUnique({
                where: { id: requesterId },
                include: { departmentLed: true }
            });

            if (!hodUser?.departmentLed) {
                return res.status(403).json({ message: 'HOD must manage a department.' });
            }
            // Cannot change department, enforce HOD's department
            effectiveDepartmentId = hodUser.departmentLed.id;

            // HOD Restriction: Cannot promote to ADMIN or PRINCIPAL
            if (role && ['ADMIN', 'PRINCIPAL'].includes(role.toUpperCase())) {
                return res.status(403).json({ message: 'HOD cannot assign ADMIN or PRINCIPAL roles.' });
            }

            // Verify target user belongs to HOD's department
            const targetUser = await prisma.user.findUnique({ where: { id } });
            if (targetUser) {
                if (targetUser.departmentId !== effectiveDepartmentId) {
                    return res.status(403).json({ message: 'You can only edit users in your department.' });
                }
                // Prevent HOD from editing an existing ADMIN/PRINCIPAL even if they are somehow in the dept
                if (['ADMIN', 'PRINCIPAL'].includes(targetUser.role)) {
                    return res.status(403).json({ message: 'HOD cannot edit ADMIN or PRINCIPAL users.' });
                }
            }
        }

        const updateData: any = {
            fullName: userName,
            registrationNumber: registrationNumber !== undefined ? (registrationNumber || null) : undefined,
            role: role ? role.toUpperCase() as Role : undefined,
            departmentId: effectiveDepartmentId || null
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Handle Assignments Update (Delete all & Re-create)
        if (role?.toUpperCase() === 'TEACHER' && teacherAssignments !== undefined) {
            updateData.teacherAssignments = {
                deleteMany: {}, // Clear existing
                create: Array.isArray(teacherAssignments) ? teacherAssignments.map((a: any) => ({
                    cohortId: a.cohortId,
                    subjectId: a.subjectId,
                    semester: Number(a.semester),
                    departmentId: a.departmentId || effectiveDepartmentId,
                    academicYear: '2025-26'
                })) : []
            };
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData
        });

        // Audit Log
        if (req.user?.userId) {
            await AuditService.log(req.user.userId, 'USER_UPDATED', 'User', user.id, {
                fieldUpdated: Object.keys(updateData)
            });
        }

        res.json(user);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user', error: String(error) });
    }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Use transaction to cleanup related data first
        // Check user exists first
        const userToDelete = await prisma.user.findUnique({ where: { id } });
        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found' });
        }

        await prisma.user.update({
            where: { id },
            data: {
                isActive: false,
                deletedAt: new Date(),
                email: `deleted_${Date.now()}_${userToDelete.email}` // Suffix email to allow reuse of original email for new accounts
            }
        });

        // Optional: Cancel all active assignments or enrollments
        await prisma.teacherAssignment.deleteMany({ where: { teacherId: id } });
        await prisma.studentEnrollment.updateMany({ 
            where: { studentId: id },
            data: { status: 'DELETED' }
        });

        // Audit Log (Logged by the admin deleting, NOT the user being deleted)
        if (req.user?.userId) {
            await AuditService.log(req.user.userId, 'USER_DELETED', 'User', id, {
                deletedUserId: id
            });
        }

        res.status(204).send();
    } catch (error: any) {
        console.error('Error deleting user:', error);
        if (error?.code === 'P2025') {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(500).json({ message: 'Error deleting user', error: String(error) });
    }
};


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

export const getTeachers = async (req: AuthRequest, res: Response) => {
    try {
        const teachers = await prisma.user.findMany({
            where: {
                role: 'TEACHER',
                isActive: true
            },
            orderBy: { fullName: 'asc' },
            select: {
                id: true,
                fullName: true,
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
        const { email, password, fullName, name, role, departmentId, teacherAssignments } = req.body;
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
                role: role.toUpperCase() as keyof typeof import('@prisma/client').Role,
                departmentId: effectiveDepartmentId || null,
                teacherAssignments: assignmentsCreate
            },
            select: {
                id: true,
                email: true,
                fullName: true,
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
        const { fullName, name, role, departmentId, password, teacherAssignments } = req.body;
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
            role: role ? role.toUpperCase() as keyof typeof import('@prisma/client').Role : undefined,
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
        await prisma.$transaction(async (tx) => {
            // 1. Academic Relations
            await tx.teacherAssignment.deleteMany({ where: { teacherId: id } });
            await tx.studentEnrollment.deleteMany({ where: { studentId: id } });
            await tx.studentMark.deleteMany({ where: { OR: [{ studentId: id }, { enteredBy: id }] } });
            await tx.marksComputed.deleteMany({ where: { studentId: id } });
            await tx.finalMark.deleteMany({ where: { studentId: id } });
            await tx.semesterResult.deleteMany({ where: { studentId: id } });

            // 2. Exam Snapshots & Approvals
            await tx.examSnapshot.deleteMany({ where: { createdBy: id } });
            await tx.approvalRequest.deleteMany({ where: { OR: [{ requesterId: id }, { approverId: id }] } });
            await tx.marksUnlockRequest.deleteMany({ where: { OR: [{ requesterId: id }, { hodApprovedBy: id }, { principalApprovedBy: id }] } });

            // 3. Communication & Feedback
            await tx.message.deleteMany({ where: { senderId: id } });
            await tx.messageReadReceipt.deleteMany({ where: { userId: id } });
            await tx.conversationParticipant.deleteMany({ where: { userId: id } });
            await tx.conversation.deleteMany({ where: { createdBy: id } });
            await tx.userPresence.deleteMany({ where: { userId: id } });
            await tx.feedback.deleteMany({ where: { OR: [{ studentId: id }, { teacherId: id }] } });

            // 4. System Logs
            await tx.auditLog.deleteMany({ where: { userId: id } });

            // 5. Finally delete user
            await tx.user.delete({ where: { id } });
        });

        // Audit Log (Logged by the admin deleting, NOT the user being deleted)
        if (req.user?.userId) {
            await AuditService.log(req.user.userId, 'USER_DELETED', 'User', id, {
                deletedUserId: id
            });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user', error: String(error) });
    }
};

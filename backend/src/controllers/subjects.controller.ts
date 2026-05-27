
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

export const getSubjects = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.userId;

        const where: any = {};

        // RBAC: Teachers only see assigned subjects
        if (userRole === 'TEACHER') {
            const assignments = await prisma.teacherAssignment.findMany({
                where: { teacherId: userId },
                select: { subjectId: true }
            });
            const subjectIds = assignments.map(a => a.subjectId);
            where.id = { in: subjectIds };
        }

        // RBAC: HODs only see subjects in their department
        if (userRole === 'HOD') {
            // Find HOD's department
            const department = await prisma.department.findFirst({
                where: { hodId: userId }
            });

            const targetDepartmentId = department?.id || req.user?.departmentId;

            if (targetDepartmentId) {
                // Filter subjects by program -> department
                where.curriculum = {
                    program: {
                        departmentId: targetDepartmentId
                    }
                };
            } else {
                // If HOD has no department assigned, they see nothing? Or all? 
                // Best to be safe -> nothing.
                return res.json([]);
            }
        }

        const subjects = await prisma.subject.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                curriculum: {
                    select: {
                        id: true,
                        versionName: true,
                        program: { select: { id: true, name: true, code: true, departmentId: true } }
                    }
                }
            }
        });
        res.json(subjects);
    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ message: 'Error fetching subjects', error: String(error) });
    }
};

import { AuditService } from '../services/audit.service';

export const createSubject = async (req: AuthRequest, res: Response) => {
    try {
        const { name, code, credits, curriculumVersionId, semester } = req.body;

        if (!name || !code || !curriculumVersionId) {
            return res.status(400).json({ message: 'Name, Code, and Curriculum Version are required' });
        }

        const subject = await prisma.subject.create({
            data: {
                name,
                code,
                credits: credits || 3,
                curriculumVersionId,
                semester: semester || 1
            },
            include: { curriculum: true }
        });

        // Audit Log
        if (req.user?.userId) {
            await AuditService.log(req.user.userId, 'SUBJECT_CREATED', 'Subject', subject.id, {
                code: subject.code,
                name: subject.name
            });
        }

        res.status(201).json(subject);
    } catch (error) {
        console.error('Error creating subject:', error);
        res.status(500).json({ message: 'Error creating subject', error: String(error) });
    }
};

// Update a subject
export const updateSubject = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, code, credits, semester, curriculumVersionId } = req.body;

        const subject = await prisma.subject.update({
            where: { id },
            data: {
                name,
                code,
                credits,
                semester,
                curriculumVersionId
            },
            include: {
                curriculum: {
                    include: {
                        program: true
                    }
                }
            }
        });

        // Audit Log
        if (req.user?.userId) {
            await AuditService.log(req.user.userId, 'SUBJECT_UPDATED', 'Subject', subject.id, {
                code: subject.code,
                name: subject.name
            });
        }

        res.json(subject);
    } catch (error: any) {
        console.error('Error updating subject:', error);
        if (error.code === 'P2025') {
            res.status(404).json({ message: 'Subject not found' });
        } else {
            res.status(500).json({ message: 'Error updating subject', error: String(error) });
        }
    }
};

// Delete a subject
export const deleteSubject = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.subject.delete({
            where: { id }
        });

        // Audit Log
        if (req.user?.userId) {
            await AuditService.log(req.user.userId, 'SUBJECT_DELETED', 'Subject', id, {});
        }

        res.json({ message: 'Subject deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting subject:', error);
        if (error.code === 'P2025') {
            res.status(404).json({ message: 'Subject not found' });
        } else if (error.code === 'P2003') {
            res.status(400).json({ message: 'Cannot delete subject with existing course outcomes or exams' });
        } else {
            res.status(500).json({ message: 'Error deleting subject', error: String(error) });
        }
    }
};

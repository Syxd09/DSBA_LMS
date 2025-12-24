
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

export const getCohorts = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user?.role;
        const userDeptId = req.user?.departmentId;

        const where: any = {};

        // RBAC: Non-Admins can only see cohorts in their own department
        if (userRole !== 'ADMIN' && userRole !== 'PRINCIPAL') {
            if (!userDeptId) {
                return res.json([]);
            }
            where.program = { departmentId: userDeptId };
        }

        const cohorts = await prisma.cohort.findMany({
            where,
            orderBy: { year: 'desc' },
            include: {
                program: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        durationYears: true,
                        departmentId: true
                    }
                },
                _count: { select: { enrollments: true } }
            }
        });
        res.json(cohorts);
    } catch (error) {
        console.error('Error fetching cohorts:', error);
        res.status(500).json({ message: 'Error fetching cohorts', error: String(error) });
    }
};

import { AuditService } from '../services/audit.service';

export const createCohort = async (req: AuthRequest, res: Response) => {
    try {
        const { programId, year, name, currentSemester } = req.body;

        if (!programId || !year || !name) {
            return res.status(400).json({ message: 'Program, Year, and Name are required' });
        }

        const cohort = await prisma.cohort.create({
            data: {
                programId,
                year: parseInt(year),
                name,
                currentSemester: currentSemester || 1
            },
            include: { program: true }
        });

        // Audit Log
        if (req.user?.userId) {
            await AuditService.log(req.user.userId, 'BATCH_CREATED', 'Cohort', cohort.id, {
                name: cohort.name,
                year: cohort.year
            });
        }

        res.status(201).json(cohort);
    } catch (error) {
        console.error('Error creating cohort:', error);
        res.status(500).json({ message: 'Error creating cohort', error: String(error) });
    }
};

export const updateCohort = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, year, currentSemester, programId } = req.body;

        const cohort = await prisma.cohort.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(year && { year: parseInt(year) }),
                ...(currentSemester && { currentSemester: parseInt(currentSemester) }),
                ...(programId && { programId })
            },
            include: { program: true }
        });

        res.json(cohort);
    } catch (error) {
        console.error('Error updating cohort:', error);
        res.status(500).json({ message: 'Error updating cohort', error: String(error) });
    }
};

export const deleteCohort = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Check for existing enrollments
        const cohort = await prisma.cohort.findUnique({
            where: { id },
            include: { _count: { select: { enrollments: true, exams: true } } }
        });

        if (!cohort) {
            return res.status(404).json({ message: 'Cohort not found' });
        }

        if (cohort._count.enrollments > 0 || cohort._count.exams > 0) {
            return res.status(400).json({
                message: 'Cannot delete cohort with existing enrollments or exams. Please remove them first.'
            });
        }

        await prisma.cohort.delete({ where: { id } });
        res.json({ message: 'Cohort deleted successfully' });
    } catch (error) {
        console.error('Error deleting cohort:', error);
        res.status(500).json({ message: 'Error deleting cohort', error: String(error) });
    }
};

export const promoteCohort = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userRole = req.user?.role;

        if (userRole !== 'PRINCIPAL' && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Only Principal or Admin can promote batches' });
        }

        const cohort = await prisma.cohort.findUnique({
            where: { id },
            include: { program: true }
        });

        if (!cohort) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        const maxSemesters = cohort.program.durationYears * 2;
        if (cohort.currentSemester >= maxSemesters) {
            return res.status(400).json({ message: 'Batch has already completed the program duration' });
        }

        const prevSemester = cohort.currentSemester;
        const newSemester = prevSemester + 1;

        // Transaction: Update Cohort + Lock Exams + Lock Attainments
        await prisma.$transaction(async (tx) => {
            // 1. Update Cohort Semester
            await tx.cohort.update({
                where: { id },
                data: { currentSemester: newSemester }
            });

            // 2. Lock Exams for previous semester
            // Note: Exams map to CohortId. We check exams that are NOT already locked? 
            // Or exams that belong to the previous semester? 
            // Exams table doesn't have explicit 'semester' field, it links to Subject which has semester.
            // OR we rely on the fact that exams created *while* cohort was in Sem 1 belong to Sem 1.
            // Wait, Schema check: Exam has subjectId. Subject has semester.
            // Correct logic: Lock exams where Subject.semester == prevSemester.

            // Actually, safer to Lock ALL PUBLISHED exams for this cohort? 
            // "Locking previous semester data".
            // Let's find exams for this cohort where the subject's semester matches the previous semester.

            // Optimized UpdateMany using join is tricky in Prisma.
            // We'll fetch IDs first or use updateMany with simple where if possible.
            // Exam -> Subject -> semester. Prisma updateMany doesn't support deep relations in where clause easily for all DBs, 
            // but Postgres handles it. However, it's safer to fetch and update or just update status = LOCKED.

            // Logic: Lock all 'PUBLISHED' exams for this cohort. 
            // When a cohort moves to Sem 2, Sem 1 exams should be locked.
            await tx.exam.updateMany({
                where: {
                    cohortId: id,
                    status: 'PUBLISHED'
                    // potential refinement: where subject.semester <= prevSemester
                },
                data: { status: 'LOCKED' }
            });

            // 3. Lock CO Attainments
            await tx.cOAttainment.updateMany({
                where: {
                    cohortId: id,
                    semester: prevSemester
                },
                data: { status: 'LOCKED', lockedAt: new Date() }
            });
        });

        // Audit Log
        if (req.user?.userId) {
            await AuditService.log(req.user.userId, 'BATCH_PROMOTED', 'Cohort', id, {
                oldSemester: prevSemester,
                newSemester: newSemester
            });
        }

        res.json({ message: `Batch promoted to Semester ${newSemester} successfully` });
    } catch (error) {
        console.error('Error promoting batch:', error);
        res.status(500).json({ message: 'Error promoting batch', error: String(error) });
    }
};

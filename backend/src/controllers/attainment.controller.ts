import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

// Get CO attainment data
export const getCOAttainment = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId, cohortId, semester, academicYear } = req.query;

        if (!subjectId || !cohortId) {
            return res.status(400).json({ message: 'Subject ID and Cohort ID required' });
        }

        const where: import('@prisma/client').Prisma.COAttainmentWhereInput = {
            subjectId: String(subjectId),
            cohortId: String(cohortId),
        };
        if (semester) where.semester = Number(semester);
        if (academicYear) where.academicYear = String(academicYear);

        const attainments = await prisma.cOAttainment.findMany({
            where,
            include: {
                co: { select: { coNumber: true, description: true, bloomLevel: true } },
                subject: { select: { name: true, code: true } },
                cohort: { select: { name: true } },
                approver: { select: { fullName: true, email: true } },
            },
            orderBy: { co: { coNumber: 'asc' } }
        });

        res.json(attainments);
    } catch (error) {
        console.error('Error fetching CO attainment:', error);
        res.status(500).json({ message: 'Error fetching attainment', error: String(error) });
    }
};

import { AttainmentService } from '../services/attainment.service';

// Calculate CO attainment from marks
export const calculateCOAttainment = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId, cohortId, semester, academicYear, targetPercent = 60 } = req.body;

        if (!subjectId || !cohortId || !semester || !academicYear) {
            return res.status(400).json({
                message: 'Subject ID, Cohort ID, Semester, and Academic Year required'
            });
        }

        const results = await AttainmentService.calculateCO(
            subjectId,
            cohortId,
            Number(semester),
            String(academicYear),
            Number(targetPercent)
        );

        res.json({
            message: `Calculated attainment for ${results.length} COs`,
            results
        });
    } catch (error: any) {
        console.error('Error calculating CO attainment:', error);
        res.status(500).json({ message: error.message || 'Error calculating attainment' });
    }
};

// Submit for review (Teacher → HOD)
export const submitForReview = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId, cohortId, semester, academicYear } = req.body;

        const updated = await prisma.cOAttainment.updateMany({
            where: {
                subjectId,
                cohortId,
                semester: Number(semester),
                academicYear: String(academicYear),
                status: 'CALCULATED'
            },
            data: {
                status: 'UNDER_REVIEW',
                submittedAt: new Date()
            }
        });

        res.json({ message: `Submitted ${updated.count} COs for review` });
    } catch (error) {
        console.error('Error submitting for review:', error);
        res.status(500).json({ message: 'Error submitting', error: String(error) });
    }
};

// Approve attainment (HOD/Principal)
export const approveAttainment = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId, cohortId, semester, academicYear } = req.body;
        const userId = req.user?.userId;

        const updated = await prisma.cOAttainment.updateMany({
            where: {
                subjectId,
                cohortId,
                semester: Number(semester),
                academicYear: String(academicYear),
                status: 'UNDER_REVIEW'
            },
            data: {
                status: 'APPROVED',
                approvedBy: userId,
                approvedAt: new Date()
            }
        });

        res.json({ message: `Approved ${updated.count} COs` });
    } catch (error) {
        console.error('Error approving attainment:', error);
        res.status(500).json({ message: 'Error approving', error: String(error) });
    }
};

// Lock attainment (after final approval)
export const lockAttainment = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId, cohortId, semester, academicYear } = req.body;

        const updated = await prisma.cOAttainment.updateMany({
            where: {
                subjectId,
                cohortId,
                semester: Number(semester),
                academicYear: String(academicYear),
                status: 'APPROVED'
            },
            data: {
                status: 'LOCKED',
                lockedAt: new Date()
            }
        });

        res.json({ message: `Locked ${updated.count} COs` });
    } catch (error) {
        console.error('Error locking attainment:', error);
        res.status(500).json({ message: 'Error locking', error: String(error) });
    }
};

// Get attainment summary (for dashboard)
export const getAttainmentSummary = async (req: AuthRequest, res: Response) => {
    try {
        const { cohortId, semester, academicYear } = req.query;

        const attainments = await prisma.cOAttainment.groupBy({
            by: ['status'],
            where: cohortId ? {
                cohortId: String(cohortId),
                ...(semester && { semester: Number(semester) }),
                ...(academicYear && { academicYear: String(academicYear) })
            } : {},
            _count: true
        });

        const summary = {
            total: 0,
            byStatus: {} as Record<string, number>
        };

        for (const a of attainments) {
            summary.total += a._count;
            summary.byStatus[a.status] = a._count;
        }

        res.json(summary);
    } catch (error) {
        console.error('Error getting attainment summary:', error);
        res.status(500).json({ message: 'Error', error: String(error) });
    }
};

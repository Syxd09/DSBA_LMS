import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';
import { AcademicRequest, getAcademicContext } from '../middleware/academic-context.middleware';
import { POAttainment } from '@prisma/client';

interface POResult {
    poNumber: number;
    poDescription: string;
    achievedPercent: number;
    targetPercent: number;
    isAttained: boolean;
    coCount: number;
    status: string;
}

/**
 * Calculate PO attainment for a cohort/semester
 * Formula: PO Attainment = Σ(CO Attainment × CO-PO correlation) / Σ(CO-PO correlation)
 */
import { AttainmentService } from '../services/attainment.service';

/**
 * Calculate PO attainment for a cohort/semester
 * Formula: PO Attainment = Σ(CO Attainment × CO-PO correlation) / Σ(CO-PO correlation)
 */
export const calculatePOAttainment = async (req: AcademicRequest, res: Response) => {
    try {
        const { cohortId } = req.params;
        const { semester, academicYear } = req.body;
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        if (!cohortId || !semester || !academicYear) {
            return res.status(400).json({ message: 'cohortId, semester, and academicYear are required' });
        }

        const cohort = await prisma.cohort.findUnique({
            where: { id: cohortId },
            select: { programId: true }
        });

        if (!cohort) return res.status(404).json({ message: 'Cohort not found' });

        const results = await AttainmentService.calculatePO(
            cohort.programId,
            cohortId,
            parseInt(String(semester)),
            String(academicYear)
        );

        res.json({
            message: 'PO attainment calculated successfully',
            cohortId,
            semester,
            academicYear,
            results
        });
    } catch (error: any) {
        console.error('Error calculating PO attainment:', error);
        res.status(500).json({ message: error.message || 'Error calculating PO attainment' });
    }
};

/**
 * Get PO attainment for a cohort
 */
export const getPOAttainment = async (req: AcademicRequest, res: Response) => {
    try {
        const { cohortId } = req.params;
        const { semester, academicYear } = req.query;

        const where: { cohortId: string; semester?: number; academicYear?: string } = { cohortId };
        if (semester) where.semester = parseInt(String(semester));
        if (academicYear) where.academicYear = String(academicYear);

        const poAttainments = await prisma.pOAttainment.findMany({
            where,
            include: {
                po: true,
                program: { select: { name: true, code: true } },
                approver: { select: { fullName: true, registrationNumber: true } }
            },
            orderBy: { semester: 'asc' }
        });

        // Group by semester for easier display
        const grouped = poAttainments.reduce((acc: Record<string, POAttainment[]>, att: POAttainment) => {
            const key = `${att.semester}-${att.academicYear}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(att);
            return acc;
        }, {} as Record<string, POAttainment[]>);

        res.json({
            cohortId,
            attainments: poAttainments,
            grouped
        });
    } catch (error) {
        console.error('Error fetching PO attainment:', error);
        res.status(500).json({ message: 'Error fetching PO attainment', error: String(error) });
    }
};

/**
 * Approve PO attainment (HOD/Principal)
 */
export const approvePOAttainment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const poAttainment = await prisma.pOAttainment.findUnique({ where: { id } });
        if (!poAttainment) return res.status(404).json({ message: 'PO attainment not found' });

        if (poAttainment.status !== 'CALCULATED' && poAttainment.status !== 'UNDER_REVIEW') {
            return res.status(400).json({
                message: 'PO attainment must be CALCULATED or UNDER_REVIEW to approve',
                currentStatus: poAttainment.status
            });
        }

        const updated = await prisma.pOAttainment.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedBy: userId,
                approvedAt: new Date()
            }
        });

        res.json({ message: 'PO attainment approved', poAttainment: updated });
    } catch (error) {
        console.error('Error approving PO attainment:', error);
        res.status(500).json({ message: 'Error approving PO attainment', error: String(error) });
    }
};

/**
 * Lock PO attainment (Principal only)
 */
export const lockPOAttainment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const poAttainment = await prisma.pOAttainment.findUnique({ where: { id } });
        if (!poAttainment) return res.status(404).json({ message: 'PO attainment not found' });

        if (poAttainment.status !== 'APPROVED') {
            return res.status(400).json({
                message: 'PO attainment must be APPROVED before locking',
                currentStatus: poAttainment.status
            });
        }

        const updated = await prisma.pOAttainment.update({
            where: { id },
            data: {
                status: 'LOCKED',
                lockedAt: new Date()
            }
        });

        res.json({ message: 'PO attainment locked', poAttainment: updated });
    } catch (error) {
        console.error('Error locking PO attainment:', error);
        res.status(500).json({ message: 'Error locking PO attainment', error: String(error) });
    }
};

/**
 * Get PO attainment dashboard summary
 */
export const getPODashboard = async (req: AcademicRequest, res: Response) => {
    try {
        const { cohortId } = req.params;
        const { academicYear } = req.query;

        // Get basic cohort info with program and department included
        const cohort = await prisma.cohort.findUnique({
            where: { id: cohortId },
            include: {
                program: {
                    include: {
                        department: true
                    }
                }
            }
        });

        if (!cohort) return res.status(404).json({ message: 'Cohort not found' });

        // Get PO attainments
        const where: { cohortId: string; academicYear?: string } = { cohortId };
        if (academicYear) where.academicYear = String(academicYear);

        const poAttainments = await prisma.pOAttainment.findMany({
            where,
            include: { po: true },
            orderBy: [{ semester: 'asc' }]
        });

        const lockedAttainments = poAttainments.filter(a => a.status === 'LOCKED');
        const avgAttainment = lockedAttainments.length > 0
            ? lockedAttainments.reduce((sum, a) => sum + a.achievedPercent, 0) / lockedAttainments.length
            : 0;

        // Count actual program outcomes for this program
        const totalPOs = await prisma.programOutcome.count({
            where: { programId: cohort.programId }
        });

        res.json({
            cohort: {
                id: cohort.id,
                name: cohort.name,
                year: cohort.year,
                program: cohort.program.name,
                department: cohort.program.department.name
            },
            summary: {
                totalPOs,
                avgAttainment: Math.round(avgAttainment * 100) / 100,
                attainedCount: lockedAttainments.filter(a => a.achievedPercent >= a.targetPercent).length,
                pendingApproval: poAttainments.filter(a => a.status === 'CALCULATED').length,
                locked: lockedAttainments.length
            },
            poTrends: [],
            rawData: poAttainments
        });
    } catch (error) {
        console.error('Error fetching PO dashboard:', error);
        res.status(500).json({ message: 'Error fetching PO dashboard', error: String(error) });
    }
};

/**
 * Get PO attainment list (query-based for frontend dashboard)
 */
export const getPOAttainmentList = async (req: AuthRequest, res: Response) => {
    try {
        const { programId, cohortId, semester, academicYear } = req.query;

        if (!programId) {
            return res.status(400).json({ success: false, message: 'programId is required' });
        }

        const where: any = { programId: String(programId) };
        if (cohortId) where.cohortId = String(cohortId);
        if (semester) where.semester = parseInt(String(semester));
        if (academicYear) where.academicYear = String(academicYear);

        const data = await prisma.pOAttainment.findMany({
            where,
            include: {
                po: true,
                program: { select: { name: true, code: true } },
                cohort: { select: { name: true, year: true } }
            },
            orderBy: [
                { semester: 'asc' },
                { po: { poNumber: 'asc' } }
            ]
        });

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error in getPOAttainmentList:', error);
        res.status(500).json({ success: false, message: 'Error fetching PO attainment', error: String(error) });
    }
};

/**
 * Get PO attainment trends over academic years for a program
 */
export const getPOTrends = async (req: AuthRequest, res: Response) => {
    try {
        const { programId } = req.params;

        if (!programId) {
            return res.status(400).json({ success: false, message: 'programId is required' });
        }

        // Fetch all locked or approved PO attainments for this program, grouped by academicYear
        const poAttainments = await prisma.pOAttainment.findMany({
            where: {
                programId,
                status: 'LOCKED'
            },
            select: {
                academicYear: true,
                achievedPercent: true
            },
            orderBy: {
                academicYear: 'asc'
            }
        });

        // Group by academicYear and calculate average achievedPercent
        const yearGroups: Record<string, { sum: number; count: number }> = {};
        for (const att of poAttainments) {
            if (!yearGroups[att.academicYear]) {
                yearGroups[att.academicYear] = { sum: 0, count: 0 };
            }
            yearGroups[att.academicYear].sum += att.achievedPercent;
            yearGroups[att.academicYear].count += 1;
        }

        const trendPoints = Object.entries(yearGroups).map(([year, info]) => ({
            academicYear: year,
            achievedPercent: Math.round((info.sum / info.count) * 100) / 100
        }));

        res.json({
            success: true,
            data: [
                {
                    id: programId,
                    data: trendPoints
                }
            ]
        });
    } catch (error) {
        console.error('Error fetching PO trends:', error);
        res.status(500).json({ success: false, message: 'Error fetching PO trends', error: String(error) });
    }
};

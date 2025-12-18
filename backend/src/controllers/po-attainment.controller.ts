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
export const calculatePOAttainment = async (req: AcademicRequest, res: Response) => {
    try {
        const { cohortId } = req.params;
        const { semester, academicYear } = req.body;
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        if (!cohortId || !semester || !academicYear) {
            return res.status(400).json({ message: 'cohortId, semester, and academicYear are required' });
        }

        const semesterNum = parseInt(String(semester));

        // Get cohort with program
        const cohort = await prisma.cohort.findUnique({
            where: { id: cohortId },
            include: { program: true }
        });

        if (!cohort) return res.status(404).json({ message: 'Cohort not found' });

        // Get all POs for this program
        const programOutcomes = await prisma.programOutcome.findMany({
            where: { programId: cohort.programId }
        });

        if (programOutcomes.length === 0) {
            return res.status(400).json({ message: 'No Program Outcomes defined for this program' });
        }

        // Get all approved CO attainments for this cohort/semester
        const coAttainments = await prisma.cOAttainment.findMany({
            where: {
                cohortId,
                semester: semesterNum,
                academicYear,
                status: { in: ['APPROVED', 'LOCKED'] } // Only use approved/locked COs
            },
            include: {
                co: {
                    include: {
                        poMappings: true
                    }
                }
            }
        });

        if (coAttainments.length === 0) {
            return res.status(400).json({
                message: 'No approved CO attainments found. Please approve CO attainments first.',
                hint: 'CO attainments must be in APPROVED or LOCKED status'
            });
        }

        // Calculate PO attainment for each PO
        const poAttainmentResults: POResult[] = [];

        for (const po of programOutcomes) {
            let weightedSum = 0;
            let totalWeight = 0;
            let coCount = 0;

            for (const coAtt of coAttainments) {
                // Find CO-PO mapping for this CO and PO
                const mapping = coAtt.co.poMappings.find(m => m.poId === po.id);

                if (mapping) {
                    const weight = mapping.correlationLevel; // 1, 2, or 3
                    weightedSum += coAtt.achievedPercent * weight;
                    totalWeight += weight;
                    coCount++;
                }
            }

            const achievedPercent = totalWeight > 0 ? weightedSum / totalWeight : 0;

            // Upsert PO attainment
            const poAttainment = await prisma.pOAttainment.upsert({
                where: {
                    programId_cohortId_poId_semester_academicYear: {
                        programId: cohort.programId,
                        cohortId,
                        poId: po.id,
                        semester: semesterNum,
                        academicYear
                    }
                },
                update: {
                    achievedPercent: Math.round(achievedPercent * 100) / 100,
                    weightedSum,
                    totalWeight,
                    coCount,
                    status: 'CALCULATED',
                    calculatedAt: new Date()
                },
                create: {
                    programId: cohort.programId,
                    cohortId,
                    poId: po.id,
                    semester: semesterNum,
                    academicYear,
                    achievedPercent: Math.round(achievedPercent * 100) / 100,
                    weightedSum,
                    totalWeight,
                    coCount,
                    status: 'CALCULATED',
                    calculatedAt: new Date()
                }
            });

            poAttainmentResults.push({
                poNumber: po.poNumber,
                poDescription: po.description,
                achievedPercent: poAttainment.achievedPercent,
                targetPercent: poAttainment.targetPercent,
                isAttained: poAttainment.achievedPercent >= poAttainment.targetPercent,
                coCount,
                status: poAttainment.status
            });
        }

        res.json({
            message: 'PO attainment calculated successfully',
            cohortId,
            semester: semesterNum,
            academicYear,
            results: poAttainmentResults,
            summary: {
                totalPOs: programOutcomes.length,
                attainedCount: poAttainmentResults.filter(r => r.isAttained).length,
                avgAttainment: Math.round(
                    (poAttainmentResults.reduce((sum: number, r: POResult) => sum + r.achievedPercent, 0) /
                        poAttainmentResults.length) * 100
                ) / 100
            }
        });
    } catch (error) {
        console.error('Error calculating PO attainment:', error);
        res.status(500).json({ message: 'Error calculating PO attainment', error: String(error) });
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
                approver: { select: { fullName: true } }
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

        // Get cohort with program
        const cohort = await prisma.cohort.findUnique({
            where: { id: cohortId },
            include: {
                program: {
                    include: {
                        outcomes: true,
                        department: { select: { name: true } }
                    }
                }
            }
        });

        if (!cohort) return res.status(404).json({ message: 'Cohort not found' });

        // Get all PO attainments for this cohort
        const where: { cohortId: string; academicYear?: string } = { cohortId };
        if (academicYear) where.academicYear = String(academicYear);

        const poAttainments = await prisma.pOAttainment.findMany({
            where,
            include: { po: true },
            orderBy: [{ semester: 'asc' }, { po: { poNumber: 'asc' } }]
        });

        // Calculate overall stats
        const lockedAttainments = poAttainments.filter((a: POAttainment) => a.status === 'LOCKED');
        const avgAttainment = lockedAttainments.length > 0
            ? lockedAttainments.reduce((sum: number, a: POAttainment) => sum + a.achievedPercent, 0) / lockedAttainments.length
            : 0;

        // Group by PO for trend analysis
        const poTrends = cohort.program.outcomes.map(po => {
            const poData = poAttainments.filter((a: POAttainment) => a.poId === po.id);
            return {
                poNumber: po.poNumber,
                description: po.description,
                semesters: poData.map((d: POAttainment) => ({
                    semester: d.semester,
                    academicYear: d.academicYear,
                    achieved: d.achievedPercent,
                    target: d.targetPercent,
                    status: d.status
                }))
            };
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
                totalPOs: cohort.program.outcomes.length,
                avgAttainment: Math.round(avgAttainment * 100) / 100,
                attainedCount: lockedAttainments.filter((a: any) => a.achievedPercent >= a.targetPercent).length,
                pendingApproval: poAttainments.filter((a: any) => a.status === 'CALCULATED').length,
                locked: lockedAttainments.length
            },
            poTrends,
            rawData: poAttainments
        });
    } catch (error) {
        console.error('Error fetching PO dashboard:', error);
        res.status(500).json({ message: 'Error fetching PO dashboard', error: String(error) });
    }
};

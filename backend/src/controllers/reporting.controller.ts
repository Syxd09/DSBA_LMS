import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

/**
 * Generate CO-PO Attainment Report Data
 * @route GET /api/reports/attainment/:cohortId/:subjectId
 */
export const getAttainmentReport = async (req: AuthRequest, res: Response) => {
    try {
        const { cohortId, subjectId } = req.params;

        const cohort = await prisma.cohort.findUnique({
            where: { id: cohortId },
            include: { program: true }
        });

        const subject = await prisma.subject.findUnique({
            where: { id: subjectId }
        });

        if (!cohort || !subject) return res.status(404).json({ message: 'Cohort or Subject not found' });

        const coAttainments = await prisma.cOAttainment.findMany({
            where: { cohortId, subjectId },
            include: { co: true }
        });

        const poAttainments = await prisma.pOAttainment.findMany({
            where: { cohortId, programId: cohort.programId },
            include: { po: true }
        });

        // Audit Logging
        if (req.user?.userId) {
            const { AuditService } = require('../services/audit.service');
            await AuditService.log(
                req.user.userId,
                'GENERATE_REPORT',
                'Reporting',
                subjectId,
                { cohortId, subjectId, type: 'CO_PO_ATTAINMENT' }
            );
        }

        res.json({
            institution: "DSBA LMS",
            reportGeneratedAt: new Date(),
            cohort: {
                name: cohort.name,
                year: cohort.year,
                program: cohort.program.name
            },
            subject: {
                name: subject.name,
                code: subject.code
            },
            attainment: {
                co: coAttainments,
                po: poAttainments
            }
        });
    } catch (error) {
        console.error('[Reporting] Error generating attainment report:', error);
        res.status(500).json({ message: 'Error generating report', error: String(error) });
    }
};

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

// Get CO attainment data
/**
 * Get CO attainment data for a specific subject and cohort.
 * 
 * Retrieves calculated Course Outcome attainment records with optional filtering
 * by semester and academic year.
 * 
 * @route GET /api/attainment/co
 * @access Private (ADMIN, PRINCIPAL, HOD, TEACHER)
 * @param {string} req.query.subjectId - Subject UUID (required)
 * @param {string} req.query.cohortId - Cohort UUID (required)
 * @param {number} [req.query.semester] - Semester number (1-8)
 * @param {string} [req.query.academicYear] - Academic year (e.g., "2024-2025")
 * @returns {object[]} 200 - Array of CO attainment records with related data
 * @returns {object} 400 - Missing required parameters
 * @returns {object} 500 - Server error
 */
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
                approver: { select: { fullName: true, registrationNumber: true, email: true } },
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
/**
 * Calculate CO attainment from student marks.
 * 
 * Triggers the CO attainment calculation engine which aggregates student marks,
 * applies threshold logic (default 60%), and calculates achievement percentage
 * for each Course Outcome.
 * 
 * @route POST /api/attainment/calculate-co
 * @access Private (ADMIN, PRINCIPAL, HOD, TEACHER)
 * @param {string} req.body.subjectId - Subject UUID
 * @param {string} req.body.cohortId - Cohort UUID
 * @param {number} req.body.semester - Semester number (1-8)
 * @param {string} req.body.academicYear - Academic year
 * @param {number} [req.body.targetPercent=60] - Threshold percentage
 * @returns {object} 200 - Calculation results with attainment percentages
 * @returns {object} 400 - Missing required parameters
 * @returns {object} 500 - Calculation error
 * 
 * @example
 * POST /api/attainment/calculate-co
 * {
 *   "subjectId": "abc-123",
 *   "cohortId": "def-456",
 *   "semester": 1,
 *   "academicYear": "2024-2025",
 *   "targetPercent": 60
 * }
 */
export const calculateCOAttainment = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId, cohortId, semester, academicYear } = req.body;

        if (!subjectId || !cohortId || !semester || !academicYear) {
            return res.status(400).json({
                message: 'Subject ID, Cohort ID, Semester, and Academic Year required'
            });
        }

        const results = await AttainmentService.calculateCO(
            subjectId,
            cohortId,
            Number(semester),
            String(academicYear)
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
/**
 * Submit CO attainment for review (Teacher → HOD workflow).
 * 
 * Transitions calculated CO attainment records from CALCULATED to UNDER_REVIEW status.
 * 
 * @route POST /api/attainment/submit-review
 * @access Private (TEACHER, HOD, ADMIN)
 * @param {string} req.body.subjectId - Subject UUID
 * @param {string} req.body.cohortId - Cohort UUID
 * @param {number} req.body.semester - Semester number
 * @param {string} req.body.academicYear - Academic year
 * @returns {object} 200 - Number of COs submitted for review
 * @returns {object} 500 - Server error
 */
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
/**
 * Approve CO attainment (HOD/Principal workflow).
 * 
 * Transitions CO attainment records from UNDER_REVIEW to APPROVED status.
 * Records approver details and timestamp.
 * 
 * @route POST /api/attainment/approve
 * @access Private (HOD, PRINCIPAL, ADMIN)
 * @param {string} req.body.subjectId - Subject UUID
 * @param {string} req.body.cohortId - Cohort UUID
 * @param {number} req.body.semester - Semester number
 * @param {string} req.body.academicYear - Academic year
 * @returns {object} 200 - Number of COs approved
 * @returns {object} 500 - Server error
 */
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
/**
 * Lock CO attainment (final approval - prevents further modifications).
 * 
 * Transitions approved CO attainment to LOCKED status for NAAC compliance.
 * Once locked, attainment data cannot be modified.
 * 
 * @route POST /api/attainment/lock
 * @access Private (PRINCIPAL, ADMIN)
 * @param {string} req.body.subjectId - Subject UUID
 * @param {string} req.body.cohortId - Cohort UUID
 * @param {number} req.body.semester - Semester number
 * @param {string} req.body.academicYear - Academic year
 * @returns {object} 200 - Number of COs locked
 * @returns {object} 500 - Server error
 */
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
/**
 * Get CO attainment summary for dashboard widgets.
 * 
 * Returns aggregated counts of CO attainment records grouped by status.
 * 
 * @route GET /api/attainment/summary
 * @access Private (ADMIN, PRINCIPAL, HOD, TEACHER)
 * @param {string} [req.query.cohortId] - Filter by cohort
 * @param {number} [req.query.semester] - Filter by semester
 * @param {string} [req.query.academicYear] - Filter by academic year
 * @returns {object} 200 - Summary with total count and breakdown by status
 * @returns {object} 500 - Server error
 * 
 * @example Response:
 * {
 *   "total": 45,
 *   "byStatus": {
 *     "CALCULATED": 10,
 *     "UNDER_REVIEW": 15,
 *     "APPROVED": 18,
 *     "LOCKED": 2
 *   }
 * }
 */
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

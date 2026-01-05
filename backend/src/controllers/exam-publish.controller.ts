import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';
import { createAuditLog } from '../middleware/audit.middleware';
import { calculateCOAttainmentForExam } from '../services/co-attainment.service';
import { calculatePOAttainmentForSubject } from '../services/po-attainment.service';

// Publish exam (change status to PUBLISHED)
export const publishExam = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role?.toUpperCase();

        const exam = await prisma.exam.findUnique({
            where: { id },
            select: {
                teacherId: true,
                status: true,
                subjectId: true,
                cohortId: true
            }
        });

        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        // Only teacher who owns the exam, HOD, or Principal can publish
        if (userRole === 'TEACHER' && exam.teacherId !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (exam.status === 'PUBLISHED') {
            return res.status(400).json({ message: 'Exam is already published' });
        }

        // Update exam status
        await prisma.exam.update({
            where: { id },
            data: { status: 'PUBLISHED', publishedAt: new Date() }
        });

        await createAuditLog(userId!, 'PUBLISH_EXAM', 'exam', id);

        // Calculate CO attainment (don't fail publish if this fails)
        try {
            console.log(`[Publish] Calculating CO attainment for exam ${id}`);
            await calculateCOAttainmentForExam(id);

            // Calculate PO attainment after CO calculation
            console.log(`[Publish] Calculating PO attainment for subject ${exam.subjectId}`);
            await calculatePOAttainmentForSubject(exam.subjectId, exam.cohortId);

            console.log(`[Publish] ✅ Attainment calculations completed`);
        } catch (attainmentError) {
            console.error(`[Publish] ⚠️ Attainment calculation failed (exam still published):`, attainmentError);
            // Don't fail the publish operation, just log the error
        }

        res.json({ message: 'Exam published successfully' });
    } catch (error) {
        console.error('[Publish] Error publishing exam:', error);
        res.status(500).json({ message: 'Error publishing exam', error });
    }
};

// Unlock exam for editing (change from PUBLISHED to DRAFT)
export const unlockExam = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role?.toUpperCase();

        const exam = await prisma.exam.findUnique({ where: { id } });
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        // Only teacher who owns the exam, HOD, or Principal can unlock
        if (userRole === 'TEACHER' && exam.teacherId !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (exam.status !== 'PUBLISHED') {
            return res.status(400).json({ message: 'Only published exams can be unlocked' });
        }

        await prisma.exam.update({
            where: { id },
            data: { status: 'DRAFT' }
        });

        await createAuditLog(userId!, 'UNLOCK_EXAM', 'exam', id);
        res.json({ message: 'Exam unlocked for editing' });
    } catch (error) {
        res.status(500).json({ message: 'Error unlocking exam', error });
    }
};

// Manual recalculation endpoint for testing/fixing attainment data
export const recalculateAttainment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        console.log(`[Recalculate] Starting manual recalculation for exam: ${id}`);

        const exam = await prisma.exam.findUnique({
            where: { id },
            include: { subject: true, cohort: true }
        });

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        // Check for marks
        const marksCount = await prisma.studentMark.count({ where: { examId: id } });
        if (marksCount === 0) {
            return res.status(400).json({
                message: 'No marks entered for this exam',
                exam: { examType: exam.examType, subject: exam.subject.name }
            });
        }

        console.log(`[Recalculate] Found ${marksCount} student marks`);

        // Calculate CO attainment
        await calculateCOAttainmentForExam(id);

        // Calculate PO attainment  
        await calculatePOAttainmentForSubject(exam.subjectId, exam.cohortId);

        // Get results
        const coAttainments = await prisma.cOAttainment.findMany({
            where: { subjectId: exam.subjectId, cohortId: exam.cohortId },
            include: { co: true }
        });

        const poAttainments = await prisma.pOAttainment.findMany({
            where: { cohortId: exam.cohortId },
            include: { po: true }
        });

        console.log(`[Recalculate] ✅ Complete: ${coAttainments.length} CO, ${poAttainments.length} PO`);

        res.json({
            message: 'Attainment recalculated successfully',
            results: {
                coAttainments: coAttainments.length,
                poAttainments: poAttainments.length,
                exam: {
                    type: exam.examType,
                    subject: exam.subject.name,
                    cohort: exam.cohort.name
                }
            }
        });
    } catch (error: any) {
        console.error('[Recalculate] ❌ Error:', error);
        res.status(500).json({
            message: 'Recalculation failed',
            error: error.message,
            stack: error.stack
        });
    }
};

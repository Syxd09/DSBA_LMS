import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';
import { createAuditLog } from '../middleware/audit.middleware';

const UNLOCK_DURATION_HOURS = 24; // Default unlock window

/**
 * Teacher requests unlock for an exam's marks
 */
export const requestUnlock = async (req: AuthRequest, res: Response) => {
    try {
        const { examId, reason } = req.body;
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        if (!examId || !reason) {
            return res.status(400).json({ message: 'examId and reason are required' });
        }

        // Check exam exists and is locked
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: { subject: true }
        });

        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        if (exam.status !== 'PUBLISHED') {
            return res.status(400).json({
                message: 'Only PUBLISHED exams can request unlock',
                currentStatus: exam.status
            });
        }

        // Check if there's already a pending request
        const existingRequest = await prisma.marksUnlockRequest.findFirst({
            where: {
                examId,
                status: { in: ['PENDING', 'HOD_APPROVED'] }
            }
        });

        if (existingRequest) {
            return res.status(400).json({
                message: 'An unlock request is already pending for this exam',
                existingRequestId: existingRequest.id
            });
        }

        const request = await prisma.marksUnlockRequest.create({
            data: {
                examId,
                requesterId: userId,
                reason,
                status: 'PENDING'
            }
        });

        await createAuditLog(userId, 'UNLOCK_REQUEST', 'marks_unlock_request', request.id, undefined, { examId, reason });

        res.status(201).json({
            message: 'Unlock request submitted',
            request,
            nextStep: 'Awaiting HOD approval'
        });
    } catch (error) {
        console.error('Error creating unlock request:', error);
        res.status(500).json({ message: 'Error creating unlock request', error: String(error) });
    }
};

/**
 * HOD approves/rejects unlock request
 */
export const hodDecision = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { decision, comments } = req.body; // decision: 'approve' | 'reject'
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        if (!decision || !['approve', 'reject'].includes(decision)) {
            return res.status(400).json({ message: 'decision must be "approve" or "reject"' });
        }

        const request = await prisma.marksUnlockRequest.findUnique({ where: { id } });
        if (!request) return res.status(404).json({ message: 'Unlock request not found' });

        if (request.status !== 'PENDING') {
            return res.status(400).json({
                message: 'Request is not pending HOD approval',
                currentStatus: request.status
            });
        }

        const newStatus = decision === 'approve' ? 'HOD_APPROVED' : 'HOD_REJECTED';

        const updated = await prisma.marksUnlockRequest.update({
            where: { id },
            data: {
                status: newStatus,
                hodApprovedAt: new Date(),
                hodApprovedBy: userId,
                hodComments: comments
            }
        });

        await createAuditLog(userId, `HOD_${decision.toUpperCase()}`, 'marks_unlock_request', id);

        res.json({
            message: `Request ${decision}d by HOD`,
            request: updated,
            nextStep: decision === 'approve' ? 'Awaiting Principal approval' : 'Request rejected'
        });
    } catch (error) {
        console.error('Error in HOD decision:', error);
        res.status(500).json({ message: 'Error processing HOD decision', error: String(error) });
    }
};

/**
 * Principal approves/rejects unlock request and activates unlock
 */
export const principalDecision = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { decision, comments, unlockHours } = req.body;
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        if (!decision || !['approve', 'reject'].includes(decision)) {
            return res.status(400).json({ message: 'decision must be "approve" or "reject"' });
        }

        const request = await prisma.marksUnlockRequest.findUnique({
            where: { id },
            include: { exam: true }
        });

        if (!request) return res.status(404).json({ message: 'Unlock request not found' });

        if (request.status !== 'HOD_APPROVED') {
            return res.status(400).json({
                message: 'Request must be HOD approved first',
                currentStatus: request.status
            });
        }

        if (decision === 'approve') {
            const hours = unlockHours || UNLOCK_DURATION_HOURS;
            const unlockExpiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

            // Update request and exam status
            const [updated] = await prisma.$transaction([
                prisma.marksUnlockRequest.update({
                    where: { id },
                    data: {
                        status: 'UNLOCKED',
                        principalApprovedAt: new Date(),
                        principalApprovedBy: userId,
                        principalComments: comments,
                        unlockExpiresAt,
                        unlockedAt: new Date()
                    }
                }),
                prisma.exam.update({
                    where: { id: request.examId },
                    data: { status: 'DRAFT' } // Allow editing again
                })
            ]);

            await createAuditLog(userId, 'PRINCIPAL_APPROVE_UNLOCK', 'marks_unlock_request', id, undefined, { unlockExpiresAt });

            res.json({
                message: 'Unlock approved by Principal',
                request: updated,
                unlockExpiresAt,
                note: `Exam marks can be edited until ${unlockExpiresAt.toISOString()}`
            });
        } else {
            const updated = await prisma.marksUnlockRequest.update({
                where: { id },
                data: {
                    status: 'PRINCIPAL_REJECTED',
                    principalApprovedAt: new Date(),
                    principalApprovedBy: userId,
                    principalComments: comments
                }
            });

            await createAuditLog(userId, 'PRINCIPAL_REJECT_UNLOCK', 'marks_unlock_request', id);

            res.json({
                message: 'Unlock rejected by Principal',
                request: updated
            });
        }
    } catch (error) {
        console.error('Error in Principal decision:', error);
        res.status(500).json({ message: 'Error processing Principal decision', error: String(error) });
    }
};

/**
 * Re-lock marks after editing (manual or auto-expire)
 */
export const relockMarks = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const request = await prisma.marksUnlockRequest.findUnique({
            where: { id },
            include: { exam: true }
        });

        if (!request) return res.status(404).json({ message: 'Unlock request not found' });

        if (request.status !== 'UNLOCKED') {
            return res.status(400).json({
                message: 'Request is not in UNLOCKED status',
                currentStatus: request.status
            });
        }

        const [updated] = await prisma.$transaction([
            prisma.marksUnlockRequest.update({
                where: { id },
                data: {
                    status: 'RELOCKED',
                    relockedAt: new Date()
                }
            }),
            prisma.exam.update({
                where: { id: request.examId },
                data: { status: 'PUBLISHED' }
            })
        ]);

        await createAuditLog(userId, 'RELOCK_MARKS', 'marks_unlock_request', id);

        res.json({
            message: 'Marks re-locked successfully',
            request: updated
        });
    } catch (error) {
        console.error('Error re-locking marks:', error);
        res.status(500).json({ message: 'Error re-locking marks', error: String(error) });
    }
};

/**
 * Get unlock requests (for dashboard)
 */
export const getUnlockRequests = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role?.toUpperCase();
        const { status, examId } = req.query;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const where: import('@prisma/client').Prisma.MarksUnlockRequestWhereInput = {};

        // Filter by role
        if (userRole === 'TEACHER') {
            where.requesterId = userId;
        } else if (userRole === 'HOD') {
            where.status = { in: ['PENDING', 'HOD_APPROVED', 'HOD_REJECTED'] };
        }
        // PRINCIPAL/ADMIN see all

        if (status) where.status = String(status) as import('@prisma/client').UnlockStatus;
        if (examId) where.examId = String(examId);

        const requests = await prisma.marksUnlockRequest.findMany({
            where,
            include: {
                exam: {
                    include: {
                        subject: { select: { name: true, code: true } },
                        cohort: { select: { name: true } }
                    }
                },
                requester: { select: { fullName: true, registrationNumber: true, email: true } },
                hodApprover: { select: { fullName: true, registrationNumber: true } },
                principalApprover: { select: { fullName: true, registrationNumber: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(requests);
    } catch (error) {
        console.error('Error fetching unlock requests:', error);
        res.status(500).json({ message: 'Error fetching unlock requests', error: String(error) });
    }
};

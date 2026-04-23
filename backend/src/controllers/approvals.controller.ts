
import { Request, Response } from 'express';
import db from '../services/db';
import { AuthRequest } from '../middleware/auth.middleware';

export const getPendingRequests = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        // Build where clause based on role
        let whereClause: import('@prisma/client').Prisma.ApprovalRequestWhereInput = { status: 'PENDING' };

        if (userRole === 'HOD') {
            // HOD sees requests assigned to them OR unassigned requests from their department
            const user = await db.user.findUnique({
                where: { id: userId },
                select: { departmentId: true }
            });

            if (user?.departmentId) {
                whereClause = {
                    status: 'PENDING',
                    OR: [
                        { approverId: userId },
                        {
                            approverId: null,
                            requester: { departmentId: user.departmentId }
                        }
                    ]
                };
            }
        } else if (userRole === 'PRINCIPAL' || userRole === 'ADMIN') {
            // Principal/Admin sees all pending requests
            whereClause = { status: 'PENDING' };
        } else {
            // Others only see requests assigned to them
            whereClause = { status: 'PENDING', approverId: userId };
        }

        const requests = await db.approvalRequest.findMany({
            where: whereClause,
            include: {
                requester: {
                    select: {
                        id: true,
                        fullName: true, registrationNumber: true,
                        email: true,
                        department: { select: { id: true, name: true, code: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Enrich with entity details (exam info for MARKS_APPROVAL)
        const enrichedRequests = await Promise.all(requests.map(async (request) => {
            let entityDetails = null;

            if (request.workflowType === 'MARKS_APPROVAL') {
                const exam = await db.exam.findUnique({
                    where: { id: request.entityId },
                    include: {
                        subject: { select: { id: true, name: true, code: true } },
                        cohort: { select: { id: true, name: true, year: true } }
                    }
                });
                entityDetails = exam;
            }

            return { ...request, entityDetails };
        }));

        res.json(enrichedRequests);
    } catch (error) {
        console.error('Error fetching approval requests:', error);
        res.status(500).json({ message: 'Error fetching approval requests', error: String(error) });
    }
};

export const approveRequest = async (req: Request, res: Response) => {
    const { id } = req.params;
    const approverId = (req as AuthRequest).user?.userId;

    try {
        const request = await db.approvalRequest.findUnique({ where: { id } });
        if (!request) return res.status(404).json({ message: 'Request not found' });

        if (request.status !== 'PENDING') return res.status(400).json({ message: 'Request is handled' });

        // Validate approver (optional strictly)

        // Execute the Side Effect based on workflowType
        await db.$transaction(async (tx) => {
            // 1. Update Request
            await tx.approvalRequest.update({
                where: { id },
                data: { status: 'APPROVED', approverId }
            });

            // 2. Perform Action
            if (request.workflowType === 'MARKS_APPROVAL') {
                // Publish the exam
                await tx.exam.update({
                    where: { id: request.entityId },
                    data: { status: 'PUBLISHED', publishedAt: new Date() }
                });
            }
        });

        res.json({ message: 'Request approved successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error approving request', error });
    }
};

export const rejectRequest = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { comments } = req.body;
    const approverId = (req as AuthRequest).user?.userId;

    try {
        const request = await db.approvalRequest.findUnique({ where: { id } });
        if (!request) return res.status(404).json({ message: 'Request not found' });

        await db.$transaction(async (tx) => {
            await tx.approvalRequest.update({
                where: { id },
                data: { status: 'REJECTED', approverId, comments }
            });

            if (request.workflowType === 'MARKS_APPROVAL') {
                // Revert exam to DRAFT so teacher can edit? Or just keep as PENDING_APPROVAL?
                // Usually revert to DRAFT or create a specific REJECTED status on Exam.
                await tx.exam.update({
                    where: { id: request.entityId },
                    data: { status: 'DRAFT' } // Allow teacher to edit again
                });
            }
        });

        res.json({ message: 'Request rejected' });
    } catch (error) {
        res.status(500).json({ message: 'Error rejecting request', error });
    }
};

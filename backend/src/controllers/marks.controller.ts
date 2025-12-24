import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';
import { createAuditLog } from '../middleware/audit.middleware';

export const saveMarks = async (req: AuthRequest, res: Response) => {
    try {
        const { examId, marks } = req.body; // marks: [{ studentId, subQuestionId, marks }]
        const teacherId = req.user?.userId;

        if (!teacherId) return res.status(401).json({ message: 'Unauthorized' });

        if (!marks || !Array.isArray(marks) || marks.length === 0) {
            return res.status(400).json({ message: 'Marks data is required' });
        }

        const exam = await prisma.exam.findUnique({ where: { id: examId } });
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        // HOD/Principal can edit anytime, Teacher only if DRAFT
        if (req.user?.role === 'TEACHER' && exam.status !== 'DRAFT') {
            return res.status(403).json({ message: 'Cannot edit marks after submission' });
        }

        // Performance: Use batched operations instead of individual upserts
        await prisma.$transaction(async (tx) => {
            // Group marks by unique keys for efficient processing
            const marksMap = new Map<string, { studentId: string; subQuestionId: string; marks: number }>();

            for (const m of marks) {
                const key = `${examId}-${m.studentId}-${m.subQuestionId}`;
                marksMap.set(key, m);
            }

            // Delete existing marks for these student-subQuestion combos
            const existingKeys = Array.from(marksMap.values());

            // Use deleteMany with OR conditions for batch delete
            for (const m of existingKeys) {
                await tx.studentMark.deleteMany({
                    where: {
                        examId,
                        studentId: m.studentId,
                        subQuestionId: m.subQuestionId
                    }
                });
            }

            // Batch insert new marks
            await tx.studentMark.createMany({
                data: existingKeys.map(m => ({
                    examId,
                    studentId: m.studentId,
                    subQuestionId: m.subQuestionId,
                    marks: m.marks,
                    enteredBy: teacherId,
                    enteredAt: new Date()
                }))
            });
        });

        await createAuditLog(teacherId, 'UPDATE_MARKS', 'student_marks', examId, undefined, { count: marks.length });
        res.json({ message: 'Marks saved successfully', count: marks.length });
    } catch (error) {
        console.error('Error saving marks:', error);
        res.status(500).json({ message: 'Error saving marks', error: String(error) });
    }
};

export const submitMarksForApproval = async (req: AuthRequest, res: Response) => {
    try {
        const { examId } = req.body;
        const teacherId = req.user?.userId;

        if (!teacherId) return res.status(401).json({ message: 'Unauthorized' });

        return await prisma.$transaction(async (tx) => {
            // 1. Update Exam Status
            const exam = await tx.exam.update({
                where: { id: examId },
                data: { status: 'PENDING_APPROVAL' }
            });

            // 2. Find HOD for the department (Simulated logic: find department of the Subject or Teacher)
            // Ideally teacher -> department -> hod.
            // Failing that, we leave approverId null (pool).

            const teacher = await tx.user.findUnique({
                where: { id: teacherId },
                include: { department: true }
            });

            const approverId = teacher?.department?.hodId || null;

            // 3. Create Approval Request
            const approval = await tx.approvalRequest.create({
                data: {
                    workflowType: 'MARKS_APPROVAL',
                    entityId: examId,
                    requesterId: teacherId,
                    approverId: approverId, // Assign to HOD if exists
                    status: 'PENDING',
                    comments: 'Submitted for HOD approval'
                }
            });

            return res.json({ message: 'Marks submitted for approval', approvalId: approval.id });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error submitting marks', error });
    }
};

export const getMarks = async (req: AuthRequest, res: Response) => {
    try {
        const { examId } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role?.toUpperCase();

        // Verify Exam Ownership first
        if (userRole === 'TEACHER') {
            const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { teacherId: true } });
            if (!exam) return res.status(404).json({ message: 'Exam not found' });

            if (exam.teacherId !== userId) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        const marks = await prisma.studentMark.findMany({
            where: { examId }
        });
        res.json(marks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching marks', error });
    }
};

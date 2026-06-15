
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

export const submitFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const { examId, rating, improvements, comment } = req.body;
        const studentId = req.user?.userId;

        if (!studentId || req.user?.role !== 'STUDENT') {
            return res.status(403).json({ message: 'Only students can submit feedback' });
        }

        // Check if already submitted
        const existing = await prisma.feedback.findUnique({
            where: {
                studentId_examId: { studentId, examId }
            }
        });
        if (existing) return res.status(400).json({ message: 'Feedback already submitted' });

        // Get Teacher ID from Exam -> Subject -> TeacherAssignment? 
        // Or Exam -> CreatedBy?
        // Schema: Feedback needs `teacherId`.
        // Exam has `createdById`? No, Exam schema has `subjectId`, `cohortId`.
        // We need to link feedback to a teacher.
        // Usually Exam is conducted by a teacher.
        // Let's find the teacher associated with the subject in this cohort or the exam creator.
        // For now, let's fetch the Exam and see if we can derive teacher.
        // If Exam doesn't explicitly store teacher, we might look at TeacherAssignment for (Subject, Cohort).

        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: { subject: { include: { teacherAssignments: true } } } // Checking assignments
        });

        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        // Heuristic: Pick the first teacher assigned to this subject & cohort.
        // In real app, Exam might have specific `conductedBy`.
        // The `Feedback` model schema has `teacherId` as mandatory.

        let teacherId = '';
        // Find assignment matching cohort
        const assignment = await prisma.teacherAssignment.findFirst({
            where: {
                subjectId: exam.subjectId,
                cohortId: exam.cohortId
            }
        });

        if (assignment) {
            teacherId = assignment.teacherId;
        } else {
            // Fallback: If no assignment, maybe the exam creator? 
            // We don't track exam creator in schema viewed earlier?
            // Let's assume there's always an assignment or fail gracefully.
            return res.status(400).json({ message: 'No teacher found for this exam context' });
        }

        const feedback = await prisma.feedback.create({
            data: {
                studentId,
                examId,
                teacherId,
                rating,
                improvements: improvements || [],
                comment,
                isPublished: true // Auto publish? Or wait? Schema default false. Let's set true for now.
            }
        });

        res.json({ message: 'Feedback submitted successfully', feedback });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error submitting feedback', error });
    }
};

export const getFeedbackStats = async (req: AuthRequest, res: Response) => {
    try {
        const { examId } = req.params;

        // Check permissions (Teacher of subject, HOD, Principal) - simplified for now

        const feedbacks = await prisma.feedback.findMany({
            where: { examId }
        });

        if (feedbacks.length === 0) {
            return res.json({ count: 0, avgRating: 0, improvements: {} });
        }

        const count = feedbacks.length;
        const totalRating = feedbacks.reduce((sum, f) => sum + f.rating, 0);
        const avgRating = totalRating / count;

        // Count improvements tags
        const improvementCountsMap = new Map<string, number>();
        feedbacks.forEach(f => {
            f.improvements.forEach(tag => {
                improvementCountsMap.set(tag, (improvementCountsMap.get(tag) || 0) + 1);
            });
        });

        res.json({
            count,
            avgRating: parseFloat(avgRating.toFixed(1)),
            improvementCounts: Object.fromEntries(improvementCountsMap)
        });

    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error });
    }
};

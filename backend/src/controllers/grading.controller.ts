import { Response } from 'express'; // Fixed Import
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

export const getGradingRules = async (req: AuthRequest, res: Response) => {
    try {
        const { departmentId } = req.query;
        // Logic: specific department rules OR global rules (null departmentId)
        const rules = await prisma.gradingRule.findMany({
            where: departmentId
                ? { OR: [{ departmentId: String(departmentId) }, { departmentId: null }] }
                : { departmentId: null },
            orderBy: { minPercentage: 'desc' }
        });
        res.json(rules);
    } catch (error) {
        // If table doesn't exist yet, return empty to avoid crash
        res.json([]);
    }
};

export const getFinalMarks = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, subjectId, cohortId } = req.query;
        const where: import('@prisma/client').Prisma.FinalMarkWhereInput = {};
        if (studentId) where.studentId = String(studentId);
        if (subjectId) where.subjectId = String(subjectId);
        if (cohortId) where.cohortId = String(cohortId);

        const marks = await prisma.finalMark.findMany({ where });
        res.json(marks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching final marks' });
    }
};

export const calculateGrades = async (req: AuthRequest, res: Response) => {
    // Placeholder for complex calculation logic
    // In a real implementation, this would trigger the calculation service
    try {
        const { cohortId, subjectId } = req.body;
        // Mock success
        res.json({ message: 'Calculation triggered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error calculating grades' });
    }
};

export const getSemesterResults = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId } = req.params;
        const results = await prisma.semesterResult.findMany({
            where: { studentId },
            orderBy: { semester: 'asc' }
        });
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching semester results' });
    }
};

export const calculateSGPA = async (req: AuthRequest, res: Response) => {
    try {
        const { studentId, cohortId, semester } = req.body;
        // Mock success
        res.json({ sgpa: 8.5, cgpa: 8.2 });
    } catch (error) {
        res.status(500).json({ message: 'Error calculating SGPA' });
    }
};

export const updateFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { feedback } = req.body;
        const teacherId = req.user?.userId;

        // Basic permission check - normally ensure teacher is assigned to this subject/cohort
        if (req.user?.role !== 'TEACHER' && req.user?.role !== 'HOD') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const mark = await prisma.finalMark.update({
            where: { id },
            data: { feedback }
        });

        res.json({ message: 'Feedback updated', mark });
    } catch (error) {
        console.error('Error updating feedback:', error);
        res.status(500).json({ message: 'Error updating feedback' });
    }
};

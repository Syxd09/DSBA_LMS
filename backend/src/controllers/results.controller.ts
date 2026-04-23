
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';
import { toCSV, sendCSV, formatDate } from '../utils/export';

export const getStudentResults = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user?.role?.toUpperCase();
        let studentId = req.query.studentId as string || req.user?.userId;

        // RBAC: Students can only view their own results
        if (userRole === 'STUDENT' && studentId !== req.user?.userId) {
            return res.status(403).json({ message: 'Access denied: You can only view your own results' });
        }

        if (!studentId) {
            return res.status(400).json({ message: 'Student ID is required' });
        }

        const [finalMarks, semesterResults, enrollment] = await Promise.all([
            prisma.finalMark.findMany({
                where: { studentId },
                include: {
                    subject: {
                        select: { id: true, name: true, code: true, semester: true, credits: true }
                    }
                },
                orderBy: { computedAt: 'asc' }
            }),
            prisma.semesterResult.findMany({
                where: { studentId },
                orderBy: { semester: 'desc' }
            }),
            prisma.studentEnrollment.findFirst({
                where: { studentId },
                include: {
                    cohort: {
                        select: {
                            id: true,
                            name: true,
                            currentSemester: true,
                            program: { select: { id: true, name: true, code: true } }
                        }
                    }
                }
            })
        ]);

        // Calculate Bloom's and CO performance from marks
        const studentMarks = await prisma.studentMark.findMany({
            where: { studentId },
            include: {
                subQuestion: {
                    select: { maxMarks: true, bloomLevel: true, coId: true }
                }
            }
        });

        // Bloom performance aggregation
        const bloomAggregation: Record<string, { total: number; max: number }> = {};
        const coAggregation: Record<string, { total: number; max: number }> = {};

        studentMarks.forEach(m => {
            const level = m.subQuestion.bloomLevel;
            if (!bloomAggregation[level]) bloomAggregation[level] = { total: 0, max: 0 };
            bloomAggregation[level].total += Number(m.marks);
            bloomAggregation[level].max += m.subQuestion.maxMarks;

            if (m.subQuestion.coId) {
                const coId = m.subQuestion.coId;
                if (!coAggregation[coId]) coAggregation[coId] = { total: 0, max: 0 };
                coAggregation[coId].total += Number(m.marks);
                coAggregation[coId].max += m.subQuestion.maxMarks;
            }
        });

        const bloomPerformance = Object.entries(bloomAggregation).map(([level, data]) => ({
            level,
            percentage: data.max > 0 ? (data.total / data.max) * 100 : 0,
            totalMarks: data.total,
            maxMarks: data.max
        }));

        res.json({
            finalMarks,
            semesterResults,
            enrollment,
            bloomPerformance,
            coPerformance: coAggregation
        });
    } catch (error) {
        console.error('Error fetching student results:', error);
        res.status(500).json({ message: 'Error fetching student results', error: String(error) });
    }
};

export const publishSemesterResults = async (req: AuthRequest, res: Response) => {
    try {
        const { cohortId, semester } = req.body;

        if (!cohortId || !semester) {
            return res.status(400).json({ message: 'Cohort ID and Semester are required' });
        }

        const semesterNum = parseInt(String(semester));

        // Get all students in the cohort
        const enrollments = await prisma.studentEnrollment.findMany({
            where: { cohortId }
        });

        // For each student, calculate and create/update semester result
        const results = await Promise.all(
            enrollments.map(async (enrollment) => {
                const marks = await prisma.finalMark.findMany({
                    where: {
                        studentId: enrollment.studentId,
                        subject: { semester: semesterNum }
                    },
                    include: { subject: true }
                });

                if (marks.length === 0) return null;

                const totalCredits = marks.reduce((acc, m) => acc + (m.subject?.credits || 0), 0);
                const weightedGradePoints = marks.reduce((acc, m) => {
                    const gradePoint = m.gradePoint || 0;
                    const credits = m.subject?.credits || 0;
                    return acc + (gradePoint * credits);
                }, 0);

                const sgpa = totalCredits > 0 ? weightedGradePoints / totalCredits : 0;

                return prisma.semesterResult.upsert({
                    where: {
                        studentId_cohortId_semester: {
                            studentId: enrollment.studentId,
                            cohortId,
                            semester: semesterNum
                        }
                    },
                    update: {
                        sgpa,
                        totalCredits,
                        earnedCredits: totalCredits,
                        status: 'PUBLISHED'
                    },
                    create: {
                        studentId: enrollment.studentId,
                        cohortId,
                        semester: semesterNum,
                        sgpa,
                        cgpa: sgpa,
                        totalCredits,
                        earnedCredits: totalCredits,
                        status: 'PUBLISHED'
                    }
                });
            })
        );

        res.json({ message: 'Results published', count: results.filter(Boolean).length });
    } catch (error) {
        console.error('Error publishing results:', error);
        res.status(500).json({ message: 'Error publishing results', error: String(error) });
    }
};

/**
 * Export cohort results as CSV
 */
export const exportCohortResults = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.userId;
        const { cohortId, semester } = req.query;

        if (!cohortId) {
            return res.status(400).json({ message: 'Cohort ID is required' });
        }

        // RBAC: Teachers only see students in their assigned cohorts
        if (userRole === 'TEACHER') {
            const assignment = await prisma.teacherAssignment.findFirst({
                where: { teacherId: userId, cohortId: String(cohortId) }
            });
            if (!assignment && userRole !== 'ADMIN') {
                return res.status(403).json({ message: 'Access denied: You are not assigned to this cohort' });
            }
        }

        const semesterNum = semester ? parseInt(String(semester)) : undefined;

        // Get all final marks for the cohort
        const where: import('@prisma/client').Prisma.FinalMarkWhereInput = { cohortId: String(cohortId) };
        if (semesterNum) {
            where.subject = { semester: semesterNum };
        }

        const finalMarks = await prisma.finalMark.findMany({
            where,
            include: {
                student: { select: { id: true, fullName: true, registrationNumber: true, email: true } },
                subject: { select: { code: true, name: true, semester: true, credits: true } }
            },
            orderBy: [
                { student: { fullName: 'asc' } },
                { subject: { semester: 'asc' } },
                { subject: { code: 'asc' } }
            ]
        });

        // Get enrollments for roll numbers
        const enrollments = await prisma.studentEnrollment.findMany({
            where: { cohortId: String(cohortId) },
            include: { student: { select: { registrationNumber: true } } }
        });

        const registrationNumberMap = new Map(enrollments.map(e => [e.studentId, e.student.registrationNumber]));

        // Transform to export format
        const exportData = finalMarks.map(mark => ({
            registrationNumber: registrationNumberMap.get(mark.studentId) || '',
            studentName: mark.student.fullName,
            subjectCode: mark.subject.code,
            subjectName: mark.subject.name,
            semester: mark.subject.semester,
            credits: mark.subject.credits,
            internal1: mark.internal1,
            internal2: mark.internal2,
            bestInternal: mark.bestInternal,
            external: mark.externalMarks,
            total: mark.totalMarks,
            percentage: mark.percentage.toFixed(2),
            grade: mark.grade,
            gradePoint: mark.gradePoint
        }));

        const csv = toCSV(exportData, [
            { key: 'registrationNumber', header: 'Registration Number' },
            { key: 'studentName', header: 'Student Name' },
            { key: 'subjectCode', header: 'Subject Code' },
            { key: 'subjectName', header: 'Subject Name' },
            { key: 'semester', header: 'Semester' },
            { key: 'credits', header: 'Credits' },
            { key: 'internal1', header: 'Internal 1' },
            { key: 'internal2', header: 'Internal 2' },
            { key: 'bestInternal', header: 'Best Internal' },
            { key: 'external', header: 'External' },
            { key: 'total', header: 'Total' },
            { key: 'percentage', header: 'Percentage' },
            { key: 'grade', header: 'Grade' },
            { key: 'gradePoint', header: 'Grade Point' }
        ]);

        const filename = `results_${cohortId}${semesterNum ? `_sem${semesterNum}` : ''}_${formatDate(new Date())}.csv`;
        sendCSV(res, csv, filename);
    } catch (error) {
        console.error('Error exporting results:', error);
        res.status(500).json({ message: 'Error exporting results', error: String(error) });
    }
};

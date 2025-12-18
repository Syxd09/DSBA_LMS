import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

// Get CO attainment data
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
                approver: { select: { fullName: true, email: true } },
            },
            orderBy: { co: { coNumber: 'asc' } }
        });

        res.json(attainments);
    } catch (error) {
        console.error('Error fetching CO attainment:', error);
        res.status(500).json({ message: 'Error fetching attainment', error: String(error) });
    }
};

// Calculate CO attainment from marks
export const calculateCOAttainment = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId, cohortId, semester, academicYear, targetPercent = 60 } = req.body;

        if (!subjectId || !cohortId || !semester || !academicYear) {
            return res.status(400).json({
                message: 'Subject ID, Cohort ID, Semester, and Academic Year required'
            });
        }

        // Get all COs for this subject
        const courseOutcomes = await prisma.courseOutcome.findMany({
            where: { subjectId },
            orderBy: { coNumber: 'asc' }
        });

        if (courseOutcomes.length === 0) {
            return res.status(400).json({ message: 'No Course Outcomes found for this subject' });
        }

        // Get all enrolled students for this cohort/semester
        const enrollments = await prisma.studentEnrollment.findMany({
            where: { cohortId, semester: Number(semester) },
            select: { studentId: true }
        });
        const studentIds = enrollments.map(e => e.studentId);
        const totalStudents = studentIds.length;

        if (totalStudents === 0) {
            return res.status(400).json({ message: 'No students enrolled for this cohort/semester' });
        }

        // Get exams for this subject/cohort
        const exams = await prisma.exam.findMany({
            where: { subjectId, cohortId, status: 'PUBLISHED' },
            include: {
                sections: {
                    include: {
                        questions: {
                            include: {
                                subQuestions: true
                            }
                        }
                    }
                }
            }
        });

        const results = [];

        // Calculate attainment for each CO
        for (const co of courseOutcomes) {
            let maxMarksForCO = 0;
            let studentScores: { studentId: string; scored: number; max: number }[] = [];

            // Initialize student scores
            for (const studentId of studentIds) {
                studentScores.push({ studentId, scored: 0, max: 0 });
            }

            // Collect marks for questions mapped to this CO
            for (const exam of exams) {
                for (const section of exam.sections) {
                    for (const question of section.questions) {
                        // Check if question or its subQuestions are mapped to this CO
                        const relevantSubQuestions = question.subQuestions.filter(
                            sq => sq.coId === co.id || question.coId === co.id
                        );

                        for (const sq of relevantSubQuestions) {
                            maxMarksForCO += sq.maxMarks;

                            // Get marks for this sub-question
                            const marks = await prisma.studentMark.findMany({
                                where: {
                                    examId: exam.id,
                                    subQuestionId: sq.id,
                                    studentId: { in: studentIds }
                                }
                            });

                            // Add to student scores
                            for (const mark of marks) {
                                const student = studentScores.find(s => s.studentId === mark.studentId);
                                if (student) {
                                    student.scored += Number(mark.marks);
                                    student.max += sq.maxMarks;
                                }
                            }
                        }
                    }
                }
            }

            // Calculate how many students achieved target %
            let passCount = 0;
            for (const student of studentScores) {
                if (student.max > 0) {
                    const percentage = (student.scored / student.max) * 100;
                    if (percentage >= targetPercent) {
                        passCount++;
                    }
                }
            }

            // Calculate attainment percentage
            const achievedPercent = totalStudents > 0 ? (passCount / totalStudents) * 100 : 0;

            // Upsert attainment record
            const attainment = await prisma.cOAttainment.upsert({
                where: {
                    subjectId_cohortId_coId_semester_academicYear: {
                        subjectId,
                        cohortId,
                        coId: co.id,
                        semester: Number(semester),
                        academicYear: String(academicYear)
                    }
                },
                update: {
                    targetPercent,
                    achievedPercent,
                    studentCount: totalStudents,
                    passCount,
                    status: 'CALCULATED',
                    calculatedAt: new Date()
                },
                create: {
                    subjectId,
                    cohortId,
                    coId: co.id,
                    semester: Number(semester),
                    academicYear: String(academicYear),
                    targetPercent,
                    achievedPercent,
                    studentCount: totalStudents,
                    passCount,
                    status: 'CALCULATED',
                    calculatedAt: new Date()
                },
                include: {
                    co: { select: { coNumber: true, description: true } }
                }
            });

            results.push(attainment);
        }

        res.json({
            message: `Calculated attainment for ${results.length} COs`,
            results
        });
    } catch (error) {
        console.error('Error calculating CO attainment:', error);
        res.status(500).json({ message: 'Error calculating attainment', error: String(error) });
    }
};

// Submit for review (Teacher → HOD)
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

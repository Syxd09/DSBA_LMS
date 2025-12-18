import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';
import { createAuditLog } from '../middleware/audit.middleware';

interface SubQuestionInput {
    label: string;
    maxMarks: number;
    bloomLevel: import('@prisma/client').BloomLevel;
    coId: string;
}

export const getTeacherExams = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const exams = await prisma.exam.findMany({
            where: { teacherId: userId },
            include: {
                subject: { select: { id: true, name: true, code: true } },
                cohort: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(exams);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching exams', error });
    }
};

export const createExam = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId, cohortId, examType, maxMarks } = req.body;
        const teacherId = req.user?.userId;

        if (!teacherId) return res.status(400).json({ message: 'Teacher ID missing' });

        const exam = await prisma.exam.create({
            data: {
                subjectId,
                cohortId,
                examType,
                maxMarks,
                teacherId,
                status: 'DRAFT'
            }
        });

        await createAuditLog(teacherId, 'CREATE_EXAM', 'exams', exam.id, undefined, exam);
        res.status(201).json(exam);
    } catch (error) {
        res.status(500).json({ message: 'Error creating exam', error });
    }
};

export const getExamDetails = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const exam = await prisma.exam.findUnique({
            where: { id },
            include: {
                subject: true,
                cohort: true,
                sections: {
                    include: {
                        questions: {
                            include: {
                                subQuestions: true
                            },
                            orderBy: { sequence: 'asc' }
                        }
                    },
                    orderBy: { sequence: 'asc' }
                }
            }
        });

        if (!exam) return res.status(404).json({ message: 'Exam not found' });
        res.json(exam);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching exam details' });
    }
};

export const getStudentsByCohort = async (req: AuthRequest, res: Response) => {
    try {
        const { cohortId } = req.params;
        // Fetch students enrolled in this cohort
        const enrollments = await prisma.studentEnrollment.findMany({
            where: { cohortId, status: 'active' },
            include: { student: true }
        });

        const students = enrollments.map(e => ({
            studentId: e.student.id,
            rollNumber: e.rollNumber,
            studentName: e.student.fullName
        }));

        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students', error });
    }
};

export const updateExamStructure = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { sections } = req.body;
        // sections: [{ name, sequence, maxMarks, ..., questions: [...] }]

        // Use transaction to replace structure
        await prisma.$transaction(async (tx) => {
            // Delete existing sections (cascades to questions/subquestions)
            await tx.examSection.deleteMany({ where: { examId: id } });

            for (const section of sections) {
                const createdSection = await tx.examSection.create({
                    data: {
                        examId: id,
                        name: section.name,
                        sequence: section.sequence,
                        maxMarks: section.maxMarks,
                        selectionMode: section.selectionMode,
                        requiredQuestions: section.requiredQuestions
                    }
                });

                for (const q of section.questions) {
                    const createdQuestion = await tx.question.create({
                        data: {
                            sectionId: createdSection.id,
                            sequence: q.sequence,
                            maxMarks: q.maxMarks,
                            bloomLevel: q.bloomLevel,
                            coId: q.coId,
                            isOptional: q.isOptional
                        }
                    });

                    if (q.subQuestions && q.subQuestions.length > 0) {
                        await tx.subQuestion.createMany({
                            data: q.subQuestions.map((sq: SubQuestionInput) => ({
                                questionId: createdQuestion.id,
                                label: sq.label,
                                maxMarks: sq.maxMarks,
                                bloomLevel: sq.bloomLevel,
                                coId: sq.coId
                            }))
                        });
                    }
                }
            }
        });

        res.json({ message: 'Exam structure updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating structure', error });
    }
};

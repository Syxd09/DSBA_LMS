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
        const {
            subjectId,
            cohortId,
            semester,
            examType,
            customTypeName,
            maxMarks,
            passingMarks,
            examDate,
            duration,
            instructions
        } = req.body;
        const teacherId = req.user?.userId;

        if (!teacherId) return res.status(400).json({ message: 'Teacher ID missing' });
        if (!semester) return res.status(400).json({ message: 'Semester is required' });

        // Validate custom exam type
        if (examType === 'CUSTOM' && !customTypeName) {
            return res.status(400).json({ message: 'Custom type name is required for custom exams' });
        }

        // Validate passing marks if provided
        if (passingMarks && passingMarks > maxMarks) {
            return res.status(400).json({ message: 'Passing marks cannot exceed max marks' });
        }

        const exam = await prisma.exam.create({
            data: {
                subjectId,
                cohortId,
                semester: parseInt(semester),
                examType,
                customTypeName: examType === 'CUSTOM' ? customTypeName : undefined,
                maxMarks,
                passingMarks: passingMarks ? parseFloat(passingMarks) : undefined,
                examDate: examDate ? new Date(examDate) : undefined,
                duration: duration ? parseInt(duration) : undefined,
                instructions,
                teacherId,
                status: (examDate && new Date(examDate) > new Date() ? 'SCHEDULED' : 'DRAFT') as any
            },
            include: {
                subject: { select: { name: true, code: true } },
                cohort: { select: { name: true, year: true } }
            }
        });

        await createAuditLog(teacherId, 'CREATE_EXAM', 'exams', exam.id, undefined, exam);
        res.status(201).json(exam);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'Exam of this type already exists for this subject and cohort' });
        }
        console.error('Error creating exam:', error);
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

        // RBAC: Security Check
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.userId;

        if (userRole === 'TEACHER' && exam.teacherId !== userId) {
            return res.status(403).json({ message: 'Access denied: You are not the owner of this exam' });
        }

        // Note: HODs/Admins implicitly allowed. Students usually don't access this endpoint directly or have restricted view.

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

        // RBAC: Ownership Check
        if (req.user?.role === 'TEACHER') {
            const exam = await prisma.exam.findUnique({ where: { id }, select: { teacherId: true } });
            if (!exam) return res.status(404).json({ message: 'Exam not found' });
            if (exam.teacherId !== req.user.userId) {
                return res.status(403).json({ message: 'Access denied: You can only edit your own exams' });
            }
        }
        // sections: [{ name, sequence, maxMarks, ..., questions: [...] }]

        // Filter out temporary IDs (frontend generates temp-* IDs for new items)
        const cleanedSections = sections.map((section: any) => ({
            ...section,
            id: section.id?.startsWith('temp-') ? undefined : section.id,
            questions: section.questions?.map((q: any) => ({
                ...q,
                id: q.id?.startsWith('temp-') ? undefined : q.id,
                subQuestions: q.subQuestions?.map((sq: any) => ({
                    ...sq,
                    id: sq.id?.startsWith('temp-') ? undefined : sq.id
                }))
            }))
        }));

        // Use transaction to replace structure
        await prisma.$transaction(async (tx) => {
            // Delete existing sections (cascades to questions/subquestions)
            await tx.examSection.deleteMany({ where: { examId: id } });

            for (const section of cleanedSections) {
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
        console.error('Error updating exam structure:', error);
        res.status(500).json({
            message: 'Error updating structure',
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error
        });
    }
};

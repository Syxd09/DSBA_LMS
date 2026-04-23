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

export const getExams = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role?.toUpperCase();
        
        const where: any = {};

        // RBAC: Logic based on role
        if (userRole === 'TEACHER') {
            where.teacherId = userId;
        } else if (userRole === 'HOD') {
            // Find HOD's department
            const department = await prisma.department.findFirst({
                where: { hodId: userId }
            });
            if (department) {
                // Filter exams by subjects belonging to the department
                where.subject = {
                    curriculum: {
                        program: {
                            departmentId: department.id
                        }
                    }
                };
            } else {
                return res.json([]);
            }
        }
        // PRINCIPAL and ADMIN see all exams (where = {})

        const exams = await prisma.exam.findMany({
            where,
            include: {
                subject: { select: { id: true, name: true, code: true } },
                cohort: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(exams);
    } catch (error) {
        console.error('Error fetching exams:', error);
        res.status(500).json({ message: 'Error fetching exams', error: String(error) });
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

        console.log('📝 Creating exam with data:', {
            subjectId,
            cohortId,
            semester,
            examType,
            maxMarks,
            teacherId
        });

        if (!teacherId) return res.status(400).json({ message: 'Teacher ID missing' });
        if (!semester) {
            console.error('❌ Semester is missing from request');
            return res.status(400).json({ message: 'Semester is required' });
        }

        // Validate custom exam type
        if (examType === 'CUSTOM' && !customTypeName) {
            return res.status(400).json({ message: 'Custom type name is required for custom exams' });
        }

        // Validate passing marks if provided
        if (passingMarks && passingMarks > maxMarks) {
            return res.status(400).json({ message: 'Passing marks cannot exceed max marks' });
        }

        const semesterInt = parseInt(semester);
        if (isNaN(semesterInt)) {
            console.error('❌ Invalid semester value:', semester);
            return res.status(400).json({ message: 'Invalid semester value' });
        }

        console.log('✅ Semester parsed:', semesterInt);

        const exam = await prisma.exam.create({
            data: {
                subjectId,
                cohortId,
                semester: semesterInt,
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
        console.log('🔍 getStudentsByCohort called for cohortId:', cohortId);

        // Fetch students enrolled in this cohort
        const enrollments = await prisma.studentEnrollment.findMany({
            where: { cohortId, status: 'active' },
            include: { student: true }
        });

        console.log(`📊 Found ${enrollments.length} enrollments`);

        const students = enrollments.map(e => ({
            studentId: e.student.id,
            studentName: e.student.fullName,
            registrationNumber: e.student.registrationNumber
        }));

        console.log(`✅ Returning ${students.length} students:`, students.map(s => s.registrationNumber).join(', '));
        res.json(students);
    } catch (error) {
        console.error('❌ Error fetching students:', error);
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

        // CRITICAL CHECK: Prevent changing structure if marks already exist
        // Deleting structure with marks causes foreign key constraint violations (500 error)
        const marksCount = await prisma.studentMark.count({
            where: { examId: id }
        });

        if (marksCount > 0) {
            console.warn(`⚠️ Attempted to update structure for exam ${id} which already has ${marksCount} student marks.`);
            return res.status(409).json({
                message: 'Cannot modify exam structure because student marks have already been recorded. Please delete the marks first if you must change the structure.',
                marksCount
            });
        }

        // Filter out temporary IDs and handle empty values
        const cleanedSections = sections.map((section: any) => ({
            ...section,
            id: section.id?.startsWith('temp-') ? undefined : section.id,
            questions: section.questions?.map((q: any) => ({
                ...q,
                id: q.id?.startsWith('temp-') ? undefined : q.id,
                coId: q.coId || null,
                subQuestions: q.subQuestions?.map((sq: any) => ({
                    ...sq,
                    id: sq.id?.startsWith('temp-') ? undefined : sq.id,
                    coId: sq.coId || null
                }))
            }))
        }));

        // Use transaction to replace structure
        await prisma.$transaction(async (tx) => {
            // Manual Cascade Delete: Schema doesn't have onDelete: Cascade configured
            const existingSections = await tx.examSection.findMany({
                where: { examId: id },
                select: { id: true }
            });
            const sectionIds = existingSections.map(s => s.id);

            if (sectionIds.length > 0) {
                const existingQuestions = await tx.question.findMany({
                    where: { sectionId: { in: sectionIds } },
                    select: { id: true }
                });
                const questionIds = existingQuestions.map(q => q.id);

                if (questionIds.length > 0) {
                    await tx.subQuestion.deleteMany({
                        where: { questionId: { in: questionIds } }
                    });
                    
                    await tx.question.deleteMany({
                        where: { sectionId: { in: sectionIds } }
                    });
                }

                await tx.examSection.deleteMany({
                    where: { examId: id }
                });
            }

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
                        for (const sq of q.subQuestions) {
                            await tx.subQuestion.create({
                                data: {
                                    questionId: createdQuestion.id,
                                    label: sq.label,
                                    maxMarks: sq.maxMarks,
                                    bloomLevel: sq.bloomLevel,
                                    coId: sq.coId
                                }
                            });
                        }
                    }
                }
            }
        });

        res.json({ message: 'Exam structure updated' });
    } catch (error: any) {
        // Log deep error with stack trace for debugging
        import('../utils/logger').then(({ logger }) => {
            logger.error(`❌ Error updating exam structure for ID ${req.params.id}: ${error.message}\n${error.stack}`);
        });
        
        console.error('Error updating exam structure:', error);
        res.status(500).json({
            message: 'Error updating structure',
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error
        });
    }
};

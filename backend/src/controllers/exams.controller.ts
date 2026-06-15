import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';
import { createAuditLog } from '../middleware/audit.middleware';
import { logger } from '../utils/logger';

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
            // Teachers see exams they created + exams for subjects they're assigned to
            const assignments = await prisma.teacherAssignment.findMany({
                where: { teacherId: userId },
                select: { subjectId: true, cohortId: true, semester: true }
            });

            if (assignments.length > 0) {
                const assignedSubjectIds = Array.from(new Set(assignments.map(a => a.subjectId)));
                where.OR = [
                    { teacherId: userId },
                    { subjectId: { in: assignedSubjectIds } }
                ];
            } else {
                where.teacherId = userId;
            }
        } else if (userRole === 'HOD') {
            const department = await prisma.department.findFirst({
                where: { hodId: userId }
            });
            
            const targetDepartmentId = department?.id || req.user?.departmentId;

            if (targetDepartmentId) {
                where.OR = [
                    { teacherId: userId },
                    {
                        subject: {
                            curriculum: {
                                program: {
                                    departmentId: targetDepartmentId
                                }
                            }
                        }
                    }
                ];
            } else {
                where.teacherId = userId;
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

        // Check if an exam of this type already exists for this subject, cohort, and semester
        const existingExam = await prisma.exam.findFirst({
            where: {
                subjectId,
                cohortId,
                semester: semesterInt,
                examType,
                customTypeName: examType === 'CUSTOM' ? customTypeName : null
            }
        });

        if (existingExam) {
            const displayName = examType === 'CUSTOM' ? customTypeName : examType.replace('_', ' ');
            return res.status(409).json({
                message: `An exam of type "${displayName}" already exists for this subject, cohort, and semester.`
            });
        }

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
            return res.status(409).json({ message: 'An exam of this type already exists for this subject, cohort, and semester.' });
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
            // Check if this teacher is assigned to the same subject/cohort
            const isAssigned = await prisma.teacherAssignment.findFirst({
                where: {
                    teacherId: userId,
                    subjectId: exam.subjectId,
                    cohortId: exam.cohortId
                }
            });
            if (!isAssigned) {
                return res.status(403).json({ message: 'Access denied: You are not assigned to this exam\'s subject' });
            }
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
        const semester = req.query.semester ? parseInt(req.query.semester as string) : undefined;
        
        console.log('🔍 getStudentsByCohort called:', { cohortId, semester });

        const where: any = { cohortId, status: 'active' };
        if (semester) where.semester = semester;

        const enrollments = await prisma.studentEnrollment.findMany({
            where,
            include: { student: true },
            orderBy: { student: { registrationNumber: 'asc' } }
        });

        const students = enrollments.map(e => ({
            studentId: e.student.id,
            studentName: e.student.fullName,
            registrationNumber: e.student.registrationNumber
        }));

        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students', error });
    }
};

export const getExamStudents = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const exam = await prisma.exam.findUnique({
            where: { id },
            select: { cohortId: true, semester: true }
        });

        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        const enrollments = await prisma.studentEnrollment.findMany({
            where: { 
                cohortId: exam.cohortId, 
                semester: exam.semester,
                status: 'active' 
            },
            include: { student: true },
            orderBy: { student: { registrationNumber: 'asc' } }
        });

        const students = enrollments.map(e => ({
            studentId: e.student.id,
            studentName: e.student.fullName,
            registrationNumber: e.student.registrationNumber
        }));

        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching exam students' });
    }
};

export const updateExamStructure = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { sections } = req.body;

        // RBAC: Ownership / Assignment Check
        if (req.user?.role === 'TEACHER') {
            const exam = await prisma.exam.findUnique({ where: { id }, select: { teacherId: true, subjectId: true, cohortId: true, semester: true } });
            if (!exam) return res.status(404).json({ message: 'Exam not found' });
            if (exam.teacherId !== req.user.userId) {
                const isAssigned = await prisma.teacherAssignment.findFirst({
                    where: {
                        teacherId: req.user.userId,
                        subjectId: exam.subjectId,
                        cohortId: exam.cohortId
                    }
                });
                if (!isAssigned) {
                    return res.status(403).json({ message: 'Access denied: You are not assigned to this exam\'s subject' });
                }
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
                            isOptional: q.isOptional,
                            questionText: q.questionText
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
                                    coId: sq.coId,
                                    questionText: sq.questionText
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
        logger.error(`❌ Error updating exam structure for ID ${req.params.id}: ${error.message}\n${error.stack}`);
        
        console.error('Error updating exam structure:', error);
        res.status(500).json({
            message: 'Error updating structure',
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error
        });
    }
};

export const deleteExam = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role?.toUpperCase();

        const exam = await prisma.exam.findUnique({
            where: { id },
            select: { id: true, teacherId: true, status: true, subjectId: true, cohortId: true, semester: true }
        });

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        // RBAC: Teachers can only delete their own exams (or co-assigned ones); HODs/Admins can delete any
        if (userRole === 'TEACHER' && exam.teacherId !== userId) {
            const isAssigned = await prisma.teacherAssignment.findFirst({
                where: {
                    teacherId: userId,
                    subjectId: exam.subjectId,
                    cohortId: exam.cohortId
                }
            });
            if (!isAssigned) {
                return res.status(403).json({ message: 'Access denied: You are not assigned to this exam\'s subject' });
            }
        }

        // Only allow deleting DRAFT or SCHEDULED exams
        if (!['DRAFT', 'SCHEDULED'].includes(exam.status)) {
            return res.status(409).json({ 
                message: `Cannot delete an exam with status "${exam.status}". Only DRAFT or SCHEDULED exams can be deleted.` 
            });
        }

        // Prevent deletion if marks exist
        const marksCount = await prisma.studentMark.count({ where: { examId: id } });
        if (marksCount > 0) {
            return res.status(409).json({ 
                message: 'Cannot delete this exam because student marks have been recorded. Delete the marks first.',
                marksCount
            });
        }

        // Cascade delete in a transaction
        await prisma.$transaction(async (tx) => {
            // Delete snapshots
            await tx.examSnapshot.deleteMany({ where: { examId: id } });
            
            // Delete feedbacks
            await tx.feedback.deleteMany({ where: { examId: id } });

            // Delete computed marks
            await tx.marksComputed.deleteMany({ where: { examId: id } });

            // Delete unlock requests
            await tx.marksUnlockRequest.deleteMany({ where: { examId: id } });

            // Delete structure: sub-questions → questions → sections
            const sections = await tx.examSection.findMany({
                where: { examId: id },
                select: { id: true }
            });
            const sectionIds = sections.map(s => s.id);

            if (sectionIds.length > 0) {
                const questions = await tx.question.findMany({
                    where: { sectionId: { in: sectionIds } },
                    select: { id: true }
                });
                const questionIds = questions.map(q => q.id);

                if (questionIds.length > 0) {
                    await tx.subQuestion.deleteMany({ where: { questionId: { in: questionIds } } });
                    await tx.question.deleteMany({ where: { sectionId: { in: sectionIds } } });
                }

                await tx.examSection.deleteMany({ where: { examId: id } });
            }

            // Delete the exam itself
            await tx.exam.delete({ where: { id } });
        });

        await createAuditLog(userId!, 'DELETE_EXAM', 'exams', id, exam, undefined);

        res.json({ message: 'Exam deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting exam:', error);
        res.status(500).json({
            message: 'Error deleting exam',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

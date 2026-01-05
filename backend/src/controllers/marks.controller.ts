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

        // HOD/Principal can edit anytime, Teacher only...
        if (req.user?.role === 'TEACHER') {
            if (exam.teacherId !== teacherId) {
                return res.status(403).json({ message: 'Access denied: You are not the teacher of this exam' });
            }
            if (exam.status !== 'DRAFT') {
                return res.status(403).json({ message: 'Cannot edit marks after submission' });
            }
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

        // Transform to frontend expected format (snake_case)
        const transformedMarks = marks.map(m => ({
            student_id: m.studentId,
            sub_question_id: m.subQuestionId,
            marks: m.marks
        }));

        res.json(transformedMarks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching marks', error });
    }
};

// Generate CSV template for bulk marks upload
export const getCSVTemplate = async (req: AuthRequest, res: Response) => {
    try {
        const { examId } = req.params;

        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: {
                cohort: true,
                sections: {
                    include: {
                        questions: {
                            include: { subQuestions: true },
                            orderBy: { sequence: 'asc' }
                        }
                    },
                    orderBy: { sequence: 'asc' }
                }
            }
        });

        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        const enrollments = await prisma.studentEnrollment.findMany({
            where: { cohortId: exam.cohortId, status: 'active' },
            include: { student: { select: { fullName: true } } },
            orderBy: { rollNumber: 'asc' }
        });

        const headers = ['Roll Number', 'Student Name'];
        const subQuestionMap: Array<{ id: string; label: string; maxMarks: number }> = [];

        exam.sections.forEach(section => {
            section.questions.forEach(question => {
                const qIndex = section.questions.findIndex(q => q.id === question.id) + 1;
                question.subQuestions.forEach(sq => {
                    headers.push(`${qIndex}(${sq.label})`);
                    subQuestionMap.push({ id: sq.id, label: `${qIndex}(${sq.label})`, maxMarks: sq.maxMarks });
                });
            });
        });

        const maxMarksRow = ['MAX MARKS', ''];
        subQuestionMap.forEach(sq => maxMarksRow.push(sq.maxMarks.toString()));

        const csvRows = [headers, maxMarksRow];
        enrollments.forEach(enrollment => {
            const row = [enrollment.rollNumber, enrollment.student.fullName];
            subQuestionMap.forEach(() => row.push(''));
            csvRows.push(row);
        });

        const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="marks_template_${examId.substring(0, 8)}.csv"`);
        res.send(csvContent);
    } catch (error) {
        console.error('Error generating CSV template:', error);
        res.status(500).json({ message: 'Error generating CSV template', error });
    }
};

export const bulkUploadMarks = async (req: AuthRequest, res: Response) => {
    try {
        const { examId } = req.params;
        const { marks } = req.body;
        const userId = req.user?.userId;
        const userRole = req.user?.role?.toUpperCase();

        console.log('[BULK UPLOAD] Starting for exam:', examId);
        console.log('[BULK UPLOAD] Received marks for students:', marks?.length);

        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: {
                cohort: true,
                sections: {
                    include: {
                        questions: { include: { subQuestions: true } }
                    }
                }
            }
        });

        if (!exam) {
            console.log('[BULK UPLOAD] ❌ Exam not found');
            return res.status(404).json({ message: 'Exam not found' });
        }

        console.log('[BULK UPLOAD] ✅ Exam found:', exam.examType);

        if (userRole === 'TEACHER' && exam.teacherId !== userId) {
            console.log('[BULK UPLOAD] ❌ Access denied');
            return res.status(403).json({ message: 'Access denied' });
        }

        const enrollments = await prisma.studentEnrollment.findMany({
            where: { cohortId: exam.cohortId, status: 'active' },
            include: { student: true }
        });

        console.log('[BULK UPLOAD] Students in cohort:', enrollments.length);

        const rollNumberToStudentId = new Map(enrollments.map(e => [e.rollNumber, e.student.id]));
        const allSubQuestions = exam.sections.flatMap(s => s.questions.flatMap(q => q.subQuestions));
        const subQuestionMap = new Map(allSubQuestions.map(sq => [sq.id, sq.maxMarks]));

        console.log('[BULK UPLOAD] Sub-questions:', allSubQuestions.length);

        const errors: string[] = [];
        const validatedMarks: Array<{ studentId: string; subQuestionId: string; marks: number }> = [];

        marks.forEach((studentMark: any, idx: number) => {
            const studentId = rollNumberToStudentId.get(studentMark.rollNumber);
            if (!studentId) {
                errors.push(`Row ${idx + 3}: Roll number "${studentMark.rollNumber}" not found`);
                return;
            }

            studentMark.subQuestionMarks.forEach((sqMark: any) => {
                const maxMarks = subQuestionMap.get(sqMark.subQuestionId);
                if (maxMarks === undefined) {
                    errors.push(`Row ${idx + 3}: Invalid sub-question ID ${sqMark.subQuestionId.substring(0, 8)}`);
                    return;
                }

                if (sqMark.marks < 0 || sqMark.marks > maxMarks) {
                    errors.push(`Row ${idx + 3}: Marks ${sqMark.marks} invalid (max: ${maxMarks})`);
                    return;
                }

                validatedMarks.push({
                    studentId,
                    subQuestionId: sqMark.subQuestionId,
                    marks: sqMark.marks
                });
            });
        });

        if (errors.length > 0) {
            console.log('[BULK UPLOAD] ❌ Validation errors:', errors.length);
            return res.status(400).json({ message: 'Validation errors', errors });
        }

        console.log('[BULK UPLOAD] ✅ Validated marks:', validatedMarks.length);
        console.log('[BULK UPLOAD] Starting transaction...');

        await prisma.$transaction(async (tx) => {
            for (const mark of validatedMarks) {
                await tx.studentMark.upsert({
                    where: {
                        examId_studentId_subQuestionId: {
                            examId,
                            studentId: mark.studentId,
                            subQuestionId: mark.subQuestionId
                        }
                    },
                    update: {
                        marks: mark.marks,
                        enteredBy: userId,
                        enteredAt: new Date()
                    },
                    create: {
                        examId,
                        studentId: mark.studentId,
                        subQuestionId: mark.subQuestionId,
                        marks: mark.marks,
                        enteredBy: userId
                    }
                });
            }
        });

        console.log('[BULK UPLOAD] ✅ Transaction complete');

        await createAuditLog(userId!, 'BULK_UPLOAD_MARKS', 'student_marks', examId, undefined, { count: validatedMarks.length });
        res.json({ success: true, processed: validatedMarks.length, errors: [] });
    } catch (error) {
        console.error('[BULK UPLOAD] ❌ Error:', error);
        res.status(500).json({ message: 'Error uploading marks', error });
    }
};

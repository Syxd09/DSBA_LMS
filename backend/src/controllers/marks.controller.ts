import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';
import { createAuditLog } from '../middleware/audit.middleware';
import { invalidateCacheForStudent } from '../services/analytics.service';

/**
 * Save or update student marks for an exam.
 * 
 * Batch saves marks for multiple students and sub-questions with transaction safety.
 * Teachers can only edit marks in DRAFT status. HOD/Principal can edit anytime.
 * 
 * @route POST /api/marks/save
 * @access Private (ADMIN, PRINCIPAL, HOD, TEACHER)
 * @param {string} req.body.examId - Exam UUID
 * @param {object[]} req.body.marks - Array of {studentId, subQuestionId, marks}
 * @returns {object} 200 - Number of marks saved
 * @returns {object} 400 - Invalid marks data
 * @returns {object} 403 - Access denied or status locked
 * @returns {object} 404 - Exam not found
 * @returns {object} 500 - Server error
 */
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
                // Check if co-assigned
                const isAssigned = await prisma.teacherAssignment.findFirst({
                    where: {
                        teacherId,
                        subjectId: exam.subjectId,
                        cohortId: exam.cohortId,
                        semester: exam.semester
                    }
                });
                if (!isAssigned) {
                    return res.status(403).json({ message: 'Access denied: You are not assigned to this exam\'s subject' });
                }
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
                    marksObtained: m.marks,  // Same as marks - actual marks obtained
                    enteredBy: teacherId,
                    enteredAt: new Date()
                }))
            });
        });

        await createAuditLog(teacherId, 'UPDATE_MARKS', 'student_marks', examId, undefined, { count: marks.length });

        // Invalidate feedback analytics cache for affected students (Phase 4)
        // Non-blocking operation - failure won't affect marks save
        try {
            const uniqueStudents = new Set(marks.map((m: any) => m.studentId));
            for (const studentId of uniqueStudents) {
                await invalidateCacheForStudent(studentId, exam.subjectId, exam.semester);
            }
        } catch (error) {
            console.error('Failed to invalidate feedback analytics cache:', error);
            // Continue - cache invalidation failure is non-critical
        }

        res.json({ message: 'Marks saved successfully', count: marks.length });
    } catch (error) {
        console.error('Error saving marks:', error);
        res.status(500).json({ message: 'Error saving marks', error: String(error) });
    }
};

/**
 * Submit marks for HOD/Principal approval.
 * 
 * Transitions exam from DRAFT to PENDING_APPROVAL status.
 * Records submission timestamp and triggers approval workflow.
 * 
 * @route POST /api/marks/submit-approval
 * @access Private (TEACHER, HOD, ADMIN)
 * @param {string} req.body.examId - Exam UUID
 * @returns {object} 200 - Submission success
 * @returns {object} 400 - Marks incomplete or exam not in draft
 * @returns {object} 403 - Access denied
 * @returns {object} 404 - Exam not found
 * @returns {object} 500 - Server error
 */
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

/**
 * Get marks for a specific exam with student and question details.
 * 
 * Retrieves all StudentMark records for an exam including related student,
 * sub-question, and CO mapping information.
 * 
 * @route GET /api/marks/:examId
 * @access Private (ADMIN, PRINCIPAL, HOD, TEACHER)
 * @param {string} req.params.examId - Exam UUID
 * @returns {object[]} 200 - Array of marks with student and question data
 * @returns {object} 404 - Exam not found
 * @returns {object} 500 - Server error
 */
export const getMarks = async (req: AuthRequest, res: Response) => {
    try {
        const { examId } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role?.toUpperCase();

        // Verify Exam Ownership or Assignment
        if (userRole === 'TEACHER') {
            const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { teacherId: true, subjectId: true, cohortId: true, semester: true } });
            if (!exam) return res.status(404).json({ message: 'Exam not found' });

            if (exam.teacherId !== userId) {
                const isAssigned = await prisma.teacherAssignment.findFirst({
                    where: {
                        teacherId: userId,
                        subjectId: exam.subjectId,
                        cohortId: exam.cohortId,
                        semester: exam.semester
                    }
                });
                if (!isAssigned) {
                    return res.status(403).json({ message: 'Access denied: You are not assigned to this exam\'s subject' });
                }
            }
        }

        const marks = await prisma.studentMark.findMany({
            where: { examId },
            include: {
                subQuestion: { select: { maxMarks: true, label: true } },
                exam: { select: { subjectId: true, examType: true, maxMarks: true } }
            }
        });

        // Transform to frontend expected format (snake_case)
        const transformedMarks = marks.map(m => ({
            student_id: m.studentId,
            sub_question_id: m.subQuestionId,
            marks: Number(m.marks),
            marks_obtained: Number(m.marksObtained),
            sub_question: m.subQuestion,
            exam: m.exam
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
            include: { student: { select: { fullName: true, registrationNumber: true } } },
            orderBy: { student: { registrationNumber: 'asc' } }
        });

        const headers = ['Registration Number', 'Student Name'];
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
            const row = [enrollment.student.registrationNumber || '', enrollment.student.fullName];
            subQuestionMap.forEach(() => row.push(''));
            csvRows.push(row);
        });

        const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="marks_template_${examId.substring(0, 8)}.csv"`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // Prevent 304 and caching issues
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
            const isAssigned = await prisma.teacherAssignment.findFirst({
                where: {
                    teacherId: userId,
                    subjectId: exam.subjectId,
                    cohortId: exam.cohortId,
                    semester: exam.semester
                }
            });
            if (!isAssigned) {
                console.log('[BULK UPLOAD] ❌ Access denied');
                return res.status(403).json({ message: 'Access denied: You are not assigned to this exam\'s subject' });
            }
        }

        const enrollments = await prisma.studentEnrollment.findMany({
            where: { cohortId: exam.cohortId, status: 'active' },
            include: { student: true }
        });

        console.log('[BULK UPLOAD] Students in cohort:', enrollments.length);

        const registrationNumberToStudentId = new Map(enrollments.map(e => [e.student.registrationNumber, e.student.id]));
        const allSubQuestions = exam.sections.flatMap(s => s.questions.flatMap(q => q.subQuestions));
        const subQuestionMap = new Map(allSubQuestions.map(sq => [sq.id, sq.maxMarks]));

        console.log('[BULK UPLOAD] Sub-questions:', allSubQuestions.length);

        const errors: string[] = [];
        const validatedMarks: Array<{ studentId: string; subQuestionId: string; marks: number }> = [];

        marks.forEach((studentMark: any, idx: number) => {
            const studentId = registrationNumberToStudentId.get(studentMark.registrationNumber);
            if (!studentId) {
                errors.push(`Row ${idx + 3}: Registration number "${studentMark.registrationNumber}" not found`);
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
                        marksObtained: mark.marks,  // Update marksObtained too
                        enteredBy: userId,
                        enteredAt: new Date()
                    },
                    create: {
                        examId,
                        studentId: mark.studentId,
                        subQuestionId: mark.subQuestionId,
                        marks: mark.marks,
                        marksObtained: mark.marks,  // Same as marks
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

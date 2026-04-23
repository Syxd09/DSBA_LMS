import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/feedback-rbac.middleware';
import { logAudit, logViolation, getIpAddress, getUserAgent } from '../utils/audit';
import { auditService } from '../services/transactional-audit.service';
import { buildAuditData } from '../utils/audit-helpers';
import prisma from '../services/db'; // BUG-013 FIX: Use shared singleton

/**
 * Helper: Enforce immutability - only DRAFT can be edited
 */
async function enforceImmutability(feedbackId: string, userId: string, userRole: string) {
    const feedback = await prisma.teacherStudentFeedback.findUnique({
        where: { id: feedbackId }
    });

    if (!feedback) {
        throw new Error('NOTFOUND:Feedback not found');
    }

    // IMMUTABILITY RULE: Only DRAFT is editable
    if (feedback.status !== 'DRAFT') {
        throw new Error(`FORBIDDEN:Cannot modify feedback in ${feedback.status} status. Only DRAFT feedback can be edited.`);
    }

    // Teacher must be owner (admins bypass this)
    if (userRole === 'TEACHER' && feedback.teacherId !== userId) {
        throw new Error('FORBIDDEN:You can only edit your own feedback');
    }

    return feedback;
}

/**
 * Helper: Validate teacher assignment
 */
async function validateTeacherAssignment(
    teacherId: string,
    subjectId: string,
    cohortId: string
): Promise<boolean> {
    const assignment = await prisma.teacherAssignment.findFirst({
        where: {
            teacherId,
            subjectId,
            cohortId
        }
    });

    if (!assignment) {
        throw new Error('FORBIDDEN:You are not assigned to teach this subject for this cohort');
    }

    return true;
}

/**
 * Helper: Validate student enrollment
 */
async function validateStudentEnrollment(
    studentId: string,
    cohortId: string,
    semester: number
): Promise<boolean> {
    const enrollment = await prisma.studentEnrollment.findFirst({
        where: {
            studentId,
            cohortId,
            semester
        }
    });

    if (!enrollment) {
        throw new Error('FORBIDDEN:Student is not enrolled in this cohort for the specified semester');
    }

    return true;
}

/**
 * @route   POST /api/teacher-feedback
 * @desc    Create feedback (DRAFT status)
 * @access  Teacher (assigned students only)
 */
export const createFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user || user.role !== 'TEACHER') {
            return res.status(403).json({ message: 'Only teachers can create feedback' });
        }

        const { studentId, subjectId, semester, cohortId, templateId, starRating, reviewText, categoryRatings, status } = req.body;

        // Structured logging for debugging
        console.log(`[TeacherFeedback] Creating feedback for student ${studentId}, subject ${subjectId}, semester ${semester}, cohort ${cohortId}`);

        // Granular Validation
        const missingFields = [];
        if (!studentId) missingFields.push('studentId');
        if (!subjectId) missingFields.push('subjectId');
        if (semester === undefined || semester === null) missingFields.push('semester');
        if (!cohortId) missingFields.push('cohortId');
        if (!templateId) missingFields.push('templateId');
        if (!categoryRatings) missingFields.push('categoryRatings');

        if (missingFields.length > 0) {
            return res.status(400).json({ 
                message: `Missing required context: ${missingFields.join(', ')}`,
                missingFields 
            });
        }

        if (starRating !== undefined && starRating !== null) {
            if (starRating < 1 || starRating > 5) {
                return res.status(400).json({ message: 'Star rating must be between 1 and 5' });
            }
        }

        if (!Array.isArray(categoryRatings)) {
            return res.status(400).json({ message: 'Category ratings must be an array' });
        }

        // Validate all category ratings are 1-5
        for (const rating of categoryRatings) {
            if (rating.rating < 1 || rating.rating > 5) {
                return res.status(400).json({ message: 'Category ratings must be between 1 and 5' });
            }
        }

        // Validate teacher assignment
        await validateTeacherAssignment(user.id, subjectId, cohortId);

        // Validate student enrollment
        await validateStudentEnrollment(studentId, cohortId, Number(semester));

        // Check for duplicate feedback (unique constraint)
        const existing = await prisma.teacherStudentFeedback.findFirst({
            where: {
                teacherId: user.id,
                studentId,
                subjectId,
                semester: parseInt(semester),
                cohortId
            }
        });

        if (existing) {
            return res.status(409).json({
                message: 'Feedback already exists for this student in this subject and semester'
            });
        }

        // Validate template exists and get categories
        const template = await prisma.feedbackTemplate.findUnique({
            where: { id: templateId },
            include: { categories: true }
        });

        if (!template || !template.isActive) {
            return res.status(400).json({ message: 'Invalid or inactive template' });
        }

        // Validate category ratings match template categories
        const templateCategoryIds = template.categories.map(c => c.id);
        const providedCategoryIds = categoryRatings.map((r: any) => r.categoryId);

        for (const catId of providedCategoryIds) {
            if (!templateCategoryIds.includes(catId)) {
                return res.status(400).json({
                    message: `Invalid category ID: ${catId}. Must match template categories.`
                });
            }
        }

        // Create feedback with category ratings in transaction
        const feedback = await prisma.teacherStudentFeedback.create({
            data: {
                teacherId: user.id,
                studentId,
                subjectId,
                semester: parseInt(semester),
                cohortId,
                templateId,
                starRating,
                reviewText,
                status: 'DRAFT',
                categoryRatings: {
                    create: categoryRatings.map((rating: any) => ({
                        categoryId: rating.categoryId,
                        rating: rating.rating
                    }))
                }
            },
            include: {
                categoryRatings: {
                    include: {
                        category: true
                    }
                },
                student: {
                    select: { id: true, fullName: true, registrationNumber: true, email: true }
                },
                subject: {
                    select: { id: true, name: true, code: true }
                }
            }
        });

        return res.status(201).json(feedback);
    } catch (error: any) {
        console.error('Error creating feedback:', error);

        if (error.message.startsWith('FORBIDDEN:')) {
            return res.status(403).json({ message: error.message.split(':')[1] });
        }
        if (error.message.startsWith('BADREQUEST:')) {
            return res.status(400).json({ message: error.message.split(':')[1] });
        }

        return res.status(500).json({
            message: 'Failed to create feedback',
            error: error.message
        });
    }
};

/**
 * @route   GET /api/teacher-feedback/:id
 * @desc    Get feedback by ID
 * @access  Teacher (owner), HOD (department), Principal, Admin
 */
export const getFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const feedback = await prisma.teacherStudentFeedback.findUnique({
            where: { id },
            include: {
                teacher: {
                    select: { id: true, fullName: true, registrationNumber: true, email: true }
                },
                student: {
                    select: { id: true, fullName: true, registrationNumber: true, email: true, departmentId: true }
                },
                subject: {
                    select: { id: true, name: true, code: true }
                },
                cohort: {
                    select: { id: true, name: true, year: true }
                },
                template: {
                    select: { id: true, name: true }
                },
                approver: {
                    select: { id: true, fullName: true, registrationNumber: true }
                },
                categoryRatings: {
                    include: {
                        category: {
                            select: { id: true, name: true, displayOrder: true }
                        }
                    },
                    orderBy: {
                        category: { displayOrder: 'asc' }
                    }
                }
            }
        });

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        return res.json(feedback);
    } catch (error: any) {
        console.error('Error getting feedback:', error);
        return res.status(500).json({
            message: 'Failed to get feedback',
            error: error.message
        });
    }
};

/**
 * @route   PUT /api/teacher-feedback/:id
 * @desc    Update feedback (DRAFT ONLY)
 * @access  Teacher (owner)
 */
export const updateFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user || user.role !== 'TEACHER') {
            return res.status(403).json({ message: 'Only teachers can update feedback' });
        }

        const { id } = req.params;
        const { starRating, reviewText, categoryRatings } = req.body;

        // Enforce immutability (throws if not DRAFT or not owner)
        await enforceImmutability(id, user.id, user.role);

        // Validation
        if (starRating && (starRating < 1 || starRating > 5)) {
            return res.status(400).json({ message: 'Star rating must be between 1 and 5' });
        }

        if (categoryRatings) {
            if (!Array.isArray(categoryRatings)) {
                return res.status(400).json({ message: 'Category ratings must be an array' });
            }

            for (const rating of categoryRatings) {
                if (rating.rating < 1 || rating.rating > 5) {
                    return res.status(400).json({ message: 'Category ratings must be between 1 and 5' });
                }
            }
        }

        // Update feedback in transaction
        const feedback = await prisma.$transaction(async (tx) => {
            // Delete existing category ratings if updating
            if (categoryRatings) {
                await tx.feedbackCategoryRating.deleteMany({
                    where: { feedbackId: id }
                });
            }

            // Update feedback
            return tx.teacherStudentFeedback.update({
                where: { id },
                data: {
                    starRating: starRating || undefined,
                    reviewText: reviewText || undefined,
                    categoryRatings: categoryRatings ? {
                        create: categoryRatings.map((rating: any) => ({
                            categoryId: rating.categoryId,
                            rating: rating.rating
                        }))
                    } : undefined
                },
                include: {
                    categoryRatings: {
                        include: {
                            category: true
                        }
                    }
                }
            });
        });

        return res.json(feedback);
    } catch (error: any) {
        console.error('Error updating feedback:', error);

        if (error.message.startsWith('NOTFOUND:')) {
            return res.status(404).json({ message: error.message.split(':')[1] });
        }
        if (error.message.startsWith('FORBIDDEN:')) {
            return res.status(403).json({ message: error.message.split(':')[1] });
        }

        return res.status(500).json({
            message: 'Failed to update feedback',
            error: error.message
        });
    }
};

/**
 * @route   POST /api/teacher-feedback/:id/submit
 * @desc    Submit feedback for approval (DRAFT → SUBMITTED)
 * @access  Teacher (owner)
 */
export const submitFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user || user.role !== 'TEACHER') {
            return res.status(403).json({ message: 'Only teachers can submit feedback' });
        }

        const { id } = req.params;

        const feedback = await prisma.teacherStudentFeedback.findUnique({
            where: { id },
            include: { categoryRatings: true }
        });

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        // Ownership check
        if (feedback.teacherId !== user.id) {
            await logViolation({
                type: 'RBAC_VIOLATION',
                userId: user.id,
                details: {
                    attemptedAction: 'SUBMIT_FEEDBACK',
                    targetId: id,
                    denialReason: 'Not feedback owner'
                },
                ipAddress: getIpAddress(req),
                userAgent: getUserAgent(req)
            });
            return res.status(403).json({ message: 'You can only submit your own feedback' });
        }

        // Status check (must be DRAFT)
        if (feedback.status !== 'DRAFT') {
            await logViolation({
                type: 'WORKFLOW_VIOLATION',
                userId: user.id,
                details: {
                    feedbackId: id,
                    currentStatus: feedback.status,
                    attemptedTransition: `${feedback.status} → SUBMITTED`,
                    denialReason: 'Invalid state transition - only DRAFT can be submitted'
                },
                ipAddress: getIpAddress(req),
                userAgent: getUserAgent(req)
            });
            return res.status(400).json({
                message: `Cannot submit feedback in ${feedback.status} status. Only DRAFT feedback can be submitted.`
            });
        }

        // Validation: all fields must be filled
        if (!feedback.starRating || !feedback.reviewText || feedback.categoryRatings.length === 0) {
            return res.status(400).json({
                message: 'All fields must be filled before submitting feedback'
            });
        }

        // Transaction: DRAFT → SUBMITTED + MANDATORY Audit
        // GOVERNANCE: If audit fails, entire transaction rolls back (GUARANTEED logging)
        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.teacherStudentFeedback.update({
                where: { id },
                data: {
                    status: 'SUBMITTED',
                    submittedAt: new Date()
                },
                include: {
                    categoryRatings: {
                        include: { category: true }
                    }
                }
            });

            // MANDATORY AUDIT: If this fails, entire SUBMIT action rolls back
            await auditService.logCritical(tx, buildAuditData(
                req,
                'SUBMIT',
                'TeacherStudentFeedback',
                id,
                {
                    userId: user.id,
                    description: 'Feedback submitted for approval',
                    oldValue: { status: 'DRAFT' },
                    newValue: { status: 'SUBMITTED', submittedAt: result.submittedAt }
                }
            ));

            return result;
        });

        return res.json(updated);
    } catch (error: any) {
        console.error('Error submitting feedback:', error);
        return res.status(500).json({
            message: 'Failed to submit feedback',
            error: error.message
        });
    }
};

/**
 * @route   POST /api/teacher-feedback/:id/approve
 * @desc    Approve feedback (SUBMITTED → APPROVED)
 * @access  HOD (department), Principal, Admin
 */
export const approveFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const { id } = req.params;

        const feedback = await prisma.teacherStudentFeedback.findUnique({
            where: { id }
        });

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        // Status check (must be SUBMITTED)
        if (feedback.status !== 'SUBMITTED') {
            await logViolation({
                type: 'WORKFLOW_VIOLATION',
                userId: user.id,
                details: {
                    feedbackId: id,
                    currentStatus: feedback.status,
                    attemptedTransition: `${feedback.status} → APPROVED`,
                    denialReason: 'Invalid state transition - only SUBMITTED can be approved'
                },
                ipAddress: getIpAddress(req),
                userAgent: getUserAgent(req)
            });
            return res.status(400).json({
                message: `Cannot approve feedback in ${feedback.status} status. Only SUBMITTED feedback can be approved.`
            });
        }

        // Transaction: SUBMITTED → APPROVED + MANDATORY Audit
        // GOVERNANCE: If audit fails, entire transaction rolls back (GUARANTEED logging)
        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.teacherStudentFeedback.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    approvedBy: user.id,
                    approvedAt: new Date()
                }
            });

            // MANDATORY AUDIT: If this fails, entire APPROVE action rolls back
            await auditService.logCritical(tx, buildAuditData(
                req,
                'APPROVE',
                'TeacherStudentFeedback',
                id,
                {
                    userId: user.id,
                    description: `Feedback approved by ${user.role}`,
                    oldValue: { status: 'SUBMITTED' },
                    newValue: { status: 'APPROVED', approvedBy: user.id, approvedAt: result.approvedAt }
                }
            ));

            return result;
        });

        return res.json(updated);
    } catch (error: any) {
        console.error('Error approving feedback:', error);
        return res.status(500).json({
            message: 'Failed to approve feedback',
            error: error.message
        });
    }
};

/**
 * @route   POST /api/teacher-feedback/:id/lock
 * @desc    Lock feedback permanently (APPROVED → LOCKED)
 * @access  Principal, Admin
 */
export const lockFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const { id } = req.params;

        const feedback = await prisma.teacherStudentFeedback.findUnique({
            where: { id }
        });

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        // Status check (must be APPROVED)
        if (feedback.status !== 'APPROVED') {
            await logViolation({
                type: 'WORKFLOW_VIOLATION',
                userId: user.id,
                details: {
                    feedbackId: id,
                    currentStatus: feedback.status,
                    attemptedTransition: `${feedback.status} → LOCKED`,
                    denialReason: 'Invalid state transition - only APPROVED can be locked'
                },
                ipAddress: getIpAddress(req),
                userAgent: getUserAgent(req)
            });
            return res.status(400).json({
                message: `Cannot lock feedback in ${feedback.status} status. Only APPROVED feedback can be locked.`
            });
        }

        // Transaction: APPROVED → LOCKED (PERMANENT) + MANDATORY Audit
        // GOVERNANCE: If audit fails, entire transaction rolls back (GUARANTEED logging)
        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.teacherStudentFeedback.update({
                where: { id },
                data: {
                    status: 'LOCKED',
                    lockedAt: new Date()
                }
            });

            // MANDATORY AUDIT: If this fails, entire LOCK action rolls back
            // This ensures zero audit gaps for governance-critical actions
            await auditService.logCritical(tx, buildAuditData(
                req,
                'LOCK',
                'TeacherStudentFeedback',
                id,
                {
                    userId: user.id,
                    description: 'Feedback locked permanently - NAAC evidence frozen',
                    oldValue: { status: 'APPROVED' },
                    newValue: { status: 'LOCKED', lockedAt: result.lockedAt }
                }
            ));

            return result;
        });

        return res.json(updated);
    } catch (error: any) {
        console.error('Error locking feedback:', error);
        return res.status(500).json({
            message: 'Failed to lock feedback',
            error: error.message
        });
    }
};

/**
 * @route   GET /api/teacher-feedback/student/:studentId
 * @desc    Get student's feedback
 * @access  Student (own), Teacher (assigned), HOD (department), Principal, Admin
 */
export const getStudentFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const { studentId } = req.params;
        const { subjectId, semester } = req.query;

        let whereClause: any = { studentId };

        // Filters
        if (subjectId) whereClause.subjectId = subjectId;
        if (semester) whereClause.semester = parseInt(semester as string);

        // RBAC filtering
        if (user.role === 'STUDENT') {
            if (studentId !== user.id) {
                return res.status(403).json({ message: 'You can only view your own feedback' });
            }
        } else if (user.role === 'TEACHER') {
            // Teacher can only see feedback for students they teach
            const assignments = await prisma.teacherAssignment.findMany({
                where: { teacherId: user.id },
                select: { cohortId: true, subjectId: true }
            });
            if (assignments.length > 0) {
                whereClause.OR = assignments.map(a => ({
                    cohortId: a.cohortId,
                    subjectId: a.subjectId
                }));
            } else {
                // Teacher has no assignments — return empty
                return res.json({ feedbacks: [] });
            }

        } else if (user.role === 'HOD') {
            // HOD can only see feedback for students in their department
            const student = await prisma.user.findUnique({
                where: { id: studentId },
                select: { departmentId: true }
            });

            if (student?.departmentId !== user.departmentId) {
                return res.status(403).json({ message: 'You can only view feedback for students in your department' });
            }
        }
        // Admin/Principal can see all

        const feedbacks = await prisma.teacherStudentFeedback.findMany({
            where: whereClause,
            include: {
                teacher: {
                    select: { fullName: true, registrationNumber: true }
                },
                subject: {
                    select: { name: true, code: true }
                },
                template: {
                    select: { name: true }
                },
                categoryRatings: {
                    include: {
                        category: {
                            select: { name: true, displayOrder: true }
                        }
                    },
                    orderBy: {
                        category: { displayOrder: 'asc' }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.json({ feedbacks });
    } catch (error: any) {
        console.error('Error getting student feedback:', error);
        return res.status(500).json({
            message: 'Failed to get student feedback',
            error: error.message
        });
    }
};

/**
 * @route   GET /api/teacher-feedback/template/:templateId
 * @desc    Get all feedback for a specific template (for results view)
 * @access  HOD, Principal, Admin
 */
export const getTemplateFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ message: 'Unauthenticated' });

        const { templateId } = req.params;

        // RBAC: Only higher authorities
        if (!['ADMIN', 'PRINCIPAL', 'HOD'].includes(user.role)) {
            return res.status(403).json({ message: 'Only authorities can view template-wide results' });
        }

        const feedbacks = await prisma.teacherStudentFeedback.findMany({
            where: { templateId },
            include: {
                student: {
                    select: { id: true, fullName: true, registrationNumber: true, email: true }
                },
                teacher: {
                    select: { id: true, fullName: true, registrationNumber: true }
                },
                subject: {
                    select: { name: true, code: true }
                },
                categoryRatings: {
                    include: {
                        category: {
                            select: { name: true, displayOrder: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.json({ feedbacks });
    } catch (error: any) {
        console.error('Error getting template feedback:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * @route   GET /api/teacher-feedback/template/:templateId/export
 * @desc    Export all feedback for a specific template as CSV
 * @access  HOD, Principal, Admin
 */
export const exportTemplateFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ message: 'Unauthenticated' });

        const { templateId } = req.params;

        // RBAC: Only higher authorities
        if (!['ADMIN', 'PRINCIPAL', 'HOD'].includes(user.role)) {
            return res.status(403).json({ message: 'Only authorities can export results' });
        }

        const template = await prisma.feedbackTemplate.findUnique({
            where: { id: templateId },
            include: { categories: { orderBy: { displayOrder: 'asc' } } }
        });

        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        const feedbacks = await prisma.teacherStudentFeedback.findMany({
            where: { templateId },
            include: {
                student: {
                    select: { fullName: true, registrationNumber: true, email: true }
                },
                teacher: {
                    select: { fullName: true, registrationNumber: true }
                },
                subject: {
                    select: { name: true, code: true }
                },
                categoryRatings: {
                    include: {
                        category: { select: { id: true, name: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (feedbacks.length === 0) {
            return res.status(404).json({ message: 'No feedback data to export' });
        }

        // CSV Header
        const categoryNames = template.categories.map(c => c.name);
        const headers = [
            'Date',
            'Student Name',
            'Student Email',
            'Subject',
            'Semester',
            'Teacher',
            'Overall Rating (Stars)',
            ...categoryNames,
            'Detailed Review'
        ];

        // CSV Rows
        const rows = feedbacks.map(f => {
            const ratingsMap = new Map();
            f.categoryRatings.forEach(cr => {
                ratingsMap.set(cr.category.id, cr.rating);
            });

            const categoryValues = template.categories.map(c => ratingsMap.get(c.id) || 'N/A');

            return [
                new Date(f.createdAt).toLocaleDateString(),
                f.student.fullName,
                f.student.email,
                `${f.subject.name} (${f.subject.code})`,
                f.semester,
                f.teacher.fullName,
                f.starRating || 'N/A',
                ...categoryValues,
                f.reviewText ? `"${f.reviewText.replace(/"/g, '""')}"` : 'N/A'
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=feedback_report_${template.name.replace(/\s+/g, '_')}.csv`);
        return res.status(200).send(csvContent);

    } catch (error: any) {
        console.error('Error exporting template feedback:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

/**
 * @route   GET /api/teacher-feedback/teacher/me
 * @desc    Get teacher's own feedback
 * @access  Teacher
 */
export const getTeacherOwnFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user || user.role !== 'TEACHER') {
            return res.status(403).json({ message: 'Only teachers can access this endpoint' });
        }

        const { subjectId, semester, cohortId, status } = req.query;

        let whereClause: any = { teacherId: user.id };

        // Filters
        if (subjectId) whereClause.subjectId = subjectId;
        if (semester) whereClause.semester = parseInt(semester as string);
        if (cohortId) whereClause.cohortId = cohortId;
        if (status) whereClause.status = status;

        const feedbacks = await prisma.teacherStudentFeedback.findMany({
            where: whereClause,
            include: {
                student: {
                    select: { fullName: true, registrationNumber: true, email: true }
                },
                subject: {
                    select: { name: true, code: true }
                },
                cohort: {
                    select: { name: true }
                },
                categoryRatings: {
                    include: {
                        category: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.json({ feedbacks });
    } catch (error: any) {
        console.error('Error getting teacher feedback:', error);
        return res.status(500).json({
            message: 'Failed to get teacher feedback',
            error: error.message
        });
    }
};

/**
 * @route   GET /api/teacher-feedback/pending-approvals
 * @desc    Get pending approvals
 * @access  HOD (department), Principal, Admin
 */
export const getPendingApprovals = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (user.role !== 'HOD' && user.role !== 'PRINCIPAL' && user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const { departmentId } = req.query;

        let whereClause: any = { status: 'SUBMITTED' };

        // HOD: Department only
        if (user.role === 'HOD') {
            whereClause.student = {
                departmentId: user.departmentId
            };
        }
        // Principal/Admin can filter by department
        else if (departmentId) {
            whereClause.student = {
                departmentId: departmentId
            };
        }

        const feedbacks = await prisma.teacherStudentFeedback.findMany({
            where: whereClause,
            include: {
                teacher: {
                    select: { fullName: true, registrationNumber: true }
                },
                student: {
                    select: { fullName: true, registrationNumber: true, email: true, departmentId: true }
                },
                subject: {
                    select: { name: true, code: true }
                },
                cohort: {
                    select: { name: true }
                }
            },
            orderBy: { submittedAt: 'desc' }
        });

        return res.json({ feedbacks });
    } catch (error: any) {
        console.error('Error getting pending approvals:', error);
        return res.status(500).json({
            message: 'Failed to get pending approvals',
            error: error.message
        });
    }
};

/**
 * @route   GET /api/teacher-feedback/final-approvals
 * @desc    Get final approvals (APPROVED feedback awaiting lock)
 * @access  Principal, Admin
 */
export const getFinalApprovals = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (user.role !== 'PRINCIPAL' && user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Only Principal or Admin can view final approvals' });
        }

        const { departmentId } = req.query;

        let whereClause: any = { status: 'APPROVED' };

        if (departmentId) {
            whereClause.student = {
                departmentId: departmentId
            };
        }

        const feedbacks = await prisma.teacherStudentFeedback.findMany({
            where: whereClause,
            include: {
                teacher: {
                    select: { fullName: true, registrationNumber: true }
                },
                student: {
                    select: { fullName: true, registrationNumber: true, email: true, departmentId: true }
                },
                subject: {
                    select: { name: true, code: true }
                },
                cohort: {
                    select: { name: true }
                },
                approver: {
                    select: { fullName: true, registrationNumber: true }
                }
            },
            orderBy: { approvedAt: 'desc' }
        });

        return res.json({ feedbacks });
    } catch (error: any) {
        console.error('Error getting final approvals:', error);
        return res.status(500).json({
            message: 'Failed to get final approvals',
            error: error.message
        });
    }
};

/**
 * @route   DELETE /api/teacher-feedback/:id
 * @desc    Delete feedback (DRAFT ONLY - preserves audit trail)
 * @access  Teacher (owner DRAFT), Admin (DRAFT only)
 */

export const deleteFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const { id } = req.params;

        // Get feedback to check status
        const feedback = await prisma.teacherStudentFeedback.findUnique({
            where: { id }
        });

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        // GOVERNANCE: LOCKED feedback CANNOT be deleted (even by admin) - preserves NAAC audit trail
        if (feedback.status === 'LOCKED') {
            return res.status(403).json({
                message: 'Cannot delete LOCKED feedback. LOCKED status is permanent for governance compliance.',
                code: 'LOCKED_IMMUTABLE'
            });
        }

        // Teachers can only delete own DRAFT feedback
        if (user.role === 'TEACHER') {
            if (feedback.teacherId !== user.id) {
                return res.status(403).json({ message: 'You can only delete your own feedback' });
            }
            if (feedback.status !== 'DRAFT') {
                return res.status(403).json({
                    message: `Cannot delete feedback in ${feedback.status} status. Only DRAFT feedback can be deleted.`
                });
            }
        }

        // Admin can delete non-LOCKED feedback (DRAFT, SUBMITTED, APPROVED)
        // but NOT LOCKED (preserves audit trail)

        await prisma.teacherStudentFeedback.delete({
            where: { id }
        });

        return res.json({ message: 'Feedback deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting feedback:', error);

        if (error.message.startsWith('NOTFOUND:')) {
            return res.status(404).json({ message: error.message.split(':')[1] });
        }
        if (error.message.startsWith('FORBIDDEN:')) {
            return res.status(403).json({ message: error.message.split(':')[1] });
        }

        return res.status(500).json({
            message: 'Failed to delete feedback',
            error: error.message
        });
    }
};

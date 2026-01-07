import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
    createFeedback,
    getFeedback,
    updateFeedback,
    submitFeedback,
    approveFeedback,
    lockFeedback,
    getStudentFeedback,
    getTeacherOwnFeedback,
    getPendingApprovals,
    deleteFeedback
} from '../controllers/teacher-feedback.controller';
import {
    canAccessFeedback,
    canApproveFeedback,
    canLockFeedback
} from '../middleware/feedback-rbac.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/teacher-feedback
 * @desc    Create feedback (DRAFT)
 * @access  Teacher (assigned students only)
 */
router.post('/', createFeedback);

/**
 * @route   GET /api/teacher-feedback/teacher/me
 * @desc    Get teacher's own feedback
 * @access  Teacher
 */
router.get('/teacher/me', getTeacherOwnFeedback);

/**
 *@route   GET /api/teacher-feedback/pending-approvals
 * @desc    Get pending approvals
 * @access  HOD (department), Principal, Admin
 */
router.get('/pending-approvals', getPendingApprovals);

/**
 * @route   GET /api/teacher-feedback/student/:studentId
 * @desc    Get student's feedback
 * @access  Student (own), Teacher (assigned), HOD (dept), Principal, Admin
 */
router.get('/student/:studentId', getStudentFeedback);

/**
 * @route   GET /api/teacher-feedback/:id
 * @desc    Get feedback by ID
 * @access  Teacher (owner), HOD (department), Principal, Admin
 */
router.get('/:id', canAccessFeedback, getFeedback);

/**
 * @route   PUT /api/teacher-feedback/:id
 * @desc    Update feedback (DRAFT ONLY)
 * @access  Teacher (owner, DRAFT status)
 */
router.put('/:id', canAccessFeedback, updateFeedback);

/**
 * @route   POST /api/teacher-feedback/:id/submit
 * @desc    Submit feedback (DRAFT → SUBMITTED)
 * @access  Teacher (owner)
 */
router.post('/:id/submit', canAccessFeedback, submitFeedback);

/**
 * @route   POST /api/teacher-feedback/:id/approve
 * @desc    Approve feedback (SUBMITTED → APPROVED)
 * @access  HOD (department), Principal, Admin
 */
router.post('/:id/approve', canApproveFeedback, approveFeedback);

/**
 * @route   POST /api/teacher-feedback/:id/lock
 * @desc    Lock feedback (APPROVED → LOCKED)
 * @access  Principal, Admin
 */
router.post('/:id/lock', canLockFeedback, lockFeedback);

/**
 * @route   DELETE /api/teacher-feedback/:id
 * @desc    Delete feedback (DRAFT ONLY)
 * @access  Teacher (owner DRAFT), Admin (any status)
 */
router.delete('/:id', canAccessFeedback, deleteFeedback);

export default router;

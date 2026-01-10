import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
    getStudentFeedbackAnalytics,
    getDepartmentAnalytics,
    getCollegeAnalytics,
    manualRecalculate
} from '../controllers/feedback-analytics.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/feedback-analytics/student/:studentId
 * @desc    Get analytics for a student
 * @access  Student (own), Teacher (assigned), HOD (dept), Principal, Admin
 */
router.get('/student/:studentId', getStudentFeedbackAnalytics);

/**
 * @route   GET /api/feedback-analytics/department/:departmentId
 * @desc    Get aggregated analytics for a department
 * @access  HOD (own dept), Principal, Admin
 */
router.get('/department/:departmentId', getDepartmentAnalytics);

/**
 * @route   GET /api/feedback-analytics/college
 * @desc    Get aggregated analytics for entire college
 * @access  Principal, Admin
 */
router.get('/college', getCollegeAnalytics);

/**
 * @route   POST /api/feedback-analytics/recalculate
 * @desc    Manually recalculate analytics
 * @access  Admin only
 */
router.post('/recalculate', manualRecalculate);

export default router;

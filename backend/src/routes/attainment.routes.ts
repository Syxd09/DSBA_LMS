import { Router } from 'express';
import {
    getCOAttainment,
    calculateCOAttainment,
    submitForReview,
    approveAttainment,
    lockAttainment,
    getAttainmentSummary
} from '../controllers/attainment.controller';
import {
    getStudentAnalytics,
    getAtRiskStudents,
    getStudentPerformanceDetail
} from '../controllers/student-analytics.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateAttainmentCalculation } from '../middleware/attainment-validation';

const router = Router();

// Apply auth to all routes
router.use(authenticateToken);

// CO Attainment routes
router.get('/co', getCOAttainment);
router.post('/co/calculate', validateAttainmentCalculation, calculateCOAttainment);
router.post('/calculate', validateAttainmentCalculation, calculateCOAttainment);
router.post('/calculate/co', validateAttainmentCalculation, calculateCOAttainment);
router.post('/co/submit', submitForReview);
router.post('/submit-review', submitForReview);
router.post('/co/approve', approveAttainment);
router.post('/approve', approveAttainment);
router.post('/co/lock', lockAttainment);
router.post('/lock', lockAttainment);
router.get('/summary', getAttainmentSummary);

// Student Analytics routes - IMPORTANT: specific routes before parameterized ones
router.get('/students/at-risk', getAtRiskStudents);
router.get('/students/:studentId/analytics', getStudentAnalytics);
router.get('/students/:studentId/performance/:subjectId', getStudentPerformanceDetail);

export default router;

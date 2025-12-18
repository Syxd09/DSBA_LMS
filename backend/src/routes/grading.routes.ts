import { Router } from 'express';
import { getGradingRules, getFinalMarks, calculateGrades, getSemesterResults, calculateSGPA, updateFeedback } from '../controllers/grading.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/rules', getGradingRules);
router.get('/final-marks', getFinalMarks);
router.post('/calculate', requireRole(['HOD', 'PRINCIPAL', 'ADMIN']), calculateGrades);
router.get('/semester-results/:studentId', getSemesterResults);
router.post('/calculate-sgpa', requireRole(['HOD', 'PRINCIPAL', 'ADMIN']), calculateSGPA);
router.put('/final-marks/:id/feedback', requireRole(['TEACHER', 'HOD', 'PRINCIPAL']), updateFeedback);

export default router;

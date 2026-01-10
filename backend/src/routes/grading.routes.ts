import { Router } from 'express';
import { getGradingRules, getFinalMarks, calculateGrades, getSemesterResults, calculateSGPA, updateFeedback } from '../controllers/grading.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/rules', getGradingRules);
router.get('/final-marks', requireRole('ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER'), getFinalMarks);
router.post('/calculate', requireRole('ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER'), calculateGrades);
router.get('/semester-results/:studentId', requireRole('ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER', 'STUDENT'), getSemesterResults);
router.post('/calculate-sgpa', requireRole('ADMIN', 'PRINCIPAL', 'HOD'), calculateSGPA);
router.put('/final-marks/:id/feedback', requireRole('TEACHER', 'HOD', 'PRINCIPAL'), updateFeedback);

export default router;

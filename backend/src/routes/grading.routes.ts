import { Router } from 'express';
import { getGradingRules, createGradingRule, deleteGradingRule, getFinalMarks, calculateGrades, getSemesterResults, calculateSGPA, updateFeedback, bulkUpdateGradeStatus, bulkCalculateSGPA } from '../controllers/grading.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/rules', getGradingRules);
router.post('/rules', requireRole('ADMIN', 'PRINCIPAL', 'HOD'), createGradingRule);
router.delete('/rules/:id', requireRole('ADMIN', 'PRINCIPAL', 'HOD'), deleteGradingRule);
router.get('/final-marks', requireRole('ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER'), getFinalMarks);
router.post('/calculate', requireRole('ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER'), calculateGrades);
router.get('/semester-results/:studentId', requireRole('ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER', 'STUDENT'), getSemesterResults);
router.post('/calculate-sgpa', requireRole('ADMIN', 'PRINCIPAL', 'HOD'), calculateSGPA);
router.put('/final-marks/:id/feedback', requireRole('TEACHER', 'HOD', 'PRINCIPAL'), updateFeedback);
router.post('/bulk-update-status', requireRole('ADMIN', 'PRINCIPAL', 'HOD'), bulkUpdateGradeStatus);
router.post('/bulk-calculate-sgpa', requireRole('ADMIN', 'PRINCIPAL', 'HOD'), bulkCalculateSGPA);

export default router;

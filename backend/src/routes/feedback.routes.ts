
import { Router } from 'express';
import { submitFeedback, getFeedbackStats } from '../controllers/feedback.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.post('/', authenticateToken, requireRole(['STUDENT']), submitFeedback);
router.get('/stats/:examId', authenticateToken, requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']), getFeedbackStats);

export default router;

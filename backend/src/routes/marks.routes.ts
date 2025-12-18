import { Router } from 'express';
import { saveMarks, submitMarksForApproval, getMarks } from '../controllers/marks.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/save', requireRole(['TEACHER', 'HOD', 'PRINCIPAL']), saveMarks);
router.post('/submit', requireRole(['TEACHER']), submitMarksForApproval);
router.get('/:examId', requireRole(['TEACHER', 'HOD', 'PRINCIPAL']), getMarks); // Add GET route

export default router;


import { Router } from 'express';
import { getStudentResults, publishSemesterResults, exportCohortResults } from '../controllers/results.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getStudentResults);
router.post('/publish', requireRole('ADMIN', 'PRINCIPAL', 'HOD'), publishSemesterResults);
router.get('/export', requireRole('ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER'), exportCohortResults);

export default router;

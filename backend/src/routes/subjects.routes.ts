
import { Router } from 'express';
import { getSubjects, createSubject } from '../controllers/subjects.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getSubjects);
router.post('/', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), createSubject);

export default router;

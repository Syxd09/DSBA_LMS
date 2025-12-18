
import { Router } from 'express';
import { getCurriculumVersions, createCurriculumVersion } from '../controllers/curriculum-versions.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getCurriculumVersions);
router.post('/', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), createCurriculumVersion);

export default router;

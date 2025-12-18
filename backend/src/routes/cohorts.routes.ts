
import { Router } from 'express';
import { getCohorts, createCohort, updateCohort, deleteCohort } from '../controllers/cohorts.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getCohorts);
router.post('/', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), createCohort);
router.put('/:id', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), updateCohort);
router.delete('/:id', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), deleteCohort);

export default router;

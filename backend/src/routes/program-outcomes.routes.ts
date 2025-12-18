
import { Router } from 'express';
import { getProgramOutcomes, createProgramOutcome, updateProgramOutcome, deleteProgramOutcome } from '../controllers/program-outcomes.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getProgramOutcomes);
router.post('/', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), createProgramOutcome);
router.put('/:id', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), updateProgramOutcome);
router.delete('/:id', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), deleteProgramOutcome);

export default router;

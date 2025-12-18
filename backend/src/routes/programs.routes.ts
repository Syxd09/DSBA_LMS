
import { Router } from 'express';
import { getPrograms, createProgram, updateProgram, deleteProgram } from '../controllers/programs.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getPrograms);
router.post('/', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), createProgram);
router.put('/:id', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), updateProgram);
router.delete('/:id', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), deleteProgram);

export default router;

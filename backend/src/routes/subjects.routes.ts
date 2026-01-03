
import { Router } from 'express';
import { getSubjects, createSubject, updateSubject, deleteSubject } from '../controllers/subjects.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getSubjects);
router.post('/', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), createSubject);
router.put('/:id', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), updateSubject);
router.delete('/:id', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), deleteSubject);

export default router;


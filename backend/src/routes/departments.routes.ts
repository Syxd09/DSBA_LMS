
import { Router } from 'express';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/departments.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getDepartments);
router.post('/', requireRole('ADMIN', 'PRINCIPAL'), createDepartment);
router.put('/:id', requireRole('ADMIN', 'PRINCIPAL'), updateDepartment);
router.delete('/:id', requireRole('ADMIN', 'PRINCIPAL'), deleteDepartment);

export default router;

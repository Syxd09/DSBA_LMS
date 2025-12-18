
import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/users.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), getUsers);
router.post('/', requireRole(['ADMIN', 'PRINCIPAL']), createUser);
router.put('/:id', requireRole(['ADMIN', 'PRINCIPAL']), updateUser);
router.delete('/:id', requireRole(['ADMIN', 'PRINCIPAL']), deleteUser);

export default router;

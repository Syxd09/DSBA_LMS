
// Routes for user management
import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser, getTeachers, getUser } from '../controllers/users.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/teachers', requireRole('ADMIN', 'PRINCIPAL', 'HOD'), getTeachers);
router.get('/', requireRole('ADMIN', 'PRINCIPAL', 'HOD'), getUsers);
router.get('/:id', requireRole('ADMIN', 'PRINCIPAL', 'HOD'), getUser);
router.post('/', requireRole('ADMIN', 'PRINCIPAL', 'HOD'), createUser);
router.put('/:id', requireRole('ADMIN', 'PRINCIPAL', 'HOD'), updateUser);
router.delete('/:id', requireRole('ADMIN', 'PRINCIPAL', 'HOD'), deleteUser);

export default router;

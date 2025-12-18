import { Router } from 'express';
import { getAssignments, getTeachersByClass, createAssignment, deleteAssignment } from '../controllers/assignments.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']), getAssignments);
router.get('/teachers', requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']), getTeachersByClass);
router.post('/', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), createAssignment);
router.delete('/:id', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), deleteAssignment);

export default router;


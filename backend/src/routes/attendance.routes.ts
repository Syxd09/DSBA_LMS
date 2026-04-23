import { Router } from 'express';
import { recordAttendance, getSubjectAttendance } from '../controllers/attendance.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.post('/', requireRole(Role.TEACHER, Role.HOD, Role.PRINCIPAL), recordAttendance);
router.get('/subject/:subjectId', getSubjectAttendance);

export default router;

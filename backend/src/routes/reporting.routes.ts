import { Router } from 'express';
import { getAttainmentReport } from '../controllers/reporting.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.get('/attainment/:cohortId/:subjectId', requireRole(Role.PRINCIPAL, Role.ADMIN, Role.HOD), getAttainmentReport);

export default router;

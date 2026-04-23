import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRole(Role.ADMIN, Role.PRINCIPAL), getAuditLogs);

export default router;

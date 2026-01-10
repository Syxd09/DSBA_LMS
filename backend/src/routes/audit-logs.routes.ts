import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { Role } from '@prisma/client';
import { getAuditLogs, getDashboardStats } from '../controllers/audit-logs.controller';

const router = Router();

router.use(authenticateToken);

// SECURITY: Audit logs contain sensitive forensic data - restrict to ADMIN and PRINCIPAL only
router.get('/', requireRole(Role.ADMIN, Role.PRINCIPAL), getAuditLogs);
router.get('/dashboard-stats', getDashboardStats);

export default router;

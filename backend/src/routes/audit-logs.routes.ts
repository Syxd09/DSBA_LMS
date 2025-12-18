
import { Router } from 'express';
import { getAuditLogs, getDashboardStats } from '../controllers/audit-logs.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRole(['ADMIN', 'PRINCIPAL']), getAuditLogs);
router.get('/dashboard-stats', getDashboardStats);

export default router;

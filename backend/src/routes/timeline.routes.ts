import { Router } from 'express';
import { getActivityTimeline, getActivitySummary } from '../controllers/timeline.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

// Get activity timeline (Admin/Principal/HOD)
router.get('/',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD']),
    getActivityTimeline
);

// Get activity summary for dashboard
router.get('/summary',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD']),
    getActivitySummary
);

export default router;


import { Router } from 'express';
import { getPendingRequests, approveRequest, rejectRequest } from '../controllers/approvals.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

// Only HOD and Principal should access these
router.get('/pending', requireRole('HOD', 'PRINCIPAL', 'ADMIN'), getPendingRequests);
router.post('/:id/approve', requireRole('HOD', 'PRINCIPAL', 'ADMIN'), approveRequest);
router.post('/:id/reject', requireRole('HOD', 'PRINCIPAL', 'ADMIN'), rejectRequest);

export default router;

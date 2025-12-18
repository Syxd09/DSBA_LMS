
import { Router } from 'express';
import { getPendingRequests, approveRequest, rejectRequest } from '../controllers/approvals.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

// Only HOD and Principal should access these
router.get('/pending', authenticateToken, requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), getPendingRequests);
router.post('/:id/approve', authenticateToken, requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), approveRequest);
router.post('/:id/reject', authenticateToken, requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), rejectRequest);

export default router;

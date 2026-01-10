import { Router } from 'express';
import {
    requestUnlock,
    hodDecision,
    principalDecision,
    relockMarks,
    getUnlockRequests
} from '../controllers/marks-unlock.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

// Teacher requests unlock
router.post('/request',
    requireRole('TEACHER'),
    requestUnlock
);

// Get unlock requests (filtered by role)
router.get('/',
    requireRole('ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER'),
    getUnlockRequests
);

// HOD approves/rejects
router.post('/hod-decision/:id',
    requireRole('ADMIN', 'HOD'),
    hodDecision
);

// Principal approves/rejects and activates unlock
router.post('/principal-decision/:id',
    requireRole('ADMIN', 'PRINCIPAL'),
    principalDecision
);

// Re-lock marks (after editing complete)
router.post('/relock/:id',
    requireRole('ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER'),
    relockMarks
);

export default router;

import { Router } from 'express';
import {
    calculatePOAttainment,
    getPOAttainment,
    approvePOAttainment,
    lockPOAttainment,
    getPODashboard
} from '../controllers/po-attainment.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { requireAcademicContext } from '../middleware/academic-context.middleware';

const router = Router();

router.use(authenticateToken);

// Calculate PO attainment (HOD/Principal)
router.post('/calculate/:cohortId',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD']),
    requireAcademicContext({ required: ['cohortId'] }),
    calculatePOAttainment
);

// Get PO attainment for a cohort
router.get('/cohort/:cohortId',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']),
    requireAcademicContext({ required: ['cohortId'] }),
    getPOAttainment
);

// Get PO dashboard for a cohort
router.get('/dashboard/:cohortId',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']),
    requireAcademicContext({ required: ['cohortId'] }),
    getPODashboard
);

// Approve PO attainment (HOD/Principal)
router.post('/approve/:id',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD']),
    approvePOAttainment
);

// Lock PO attainment (Principal only)
router.post('/lock/:id',
    requireRole(['ADMIN', 'PRINCIPAL']),
    lockPOAttainment
);

export default router;

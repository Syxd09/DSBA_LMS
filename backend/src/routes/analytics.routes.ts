import { Router } from 'express';
import { getCOAttainment, getBloomDistribution, getSubjectBloomDistribution, getSubjectPerformance, getDepartmentStats, getCOPOTraceability, getGlobalAttainmentStats, getOverallPerformanceTrend } from '../controllers/analytics.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { requireAcademicContext } from '../middleware/academic-context.middleware';

const router = Router();

router.use(authenticateToken);

// Analytics routes with context enforcement
router.get('/co-attainment/:subjectId',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']),
    requireAcademicContext({ required: [] }), // Relaxed for flexibility
    getCOAttainment
);

router.get('/bloom-distribution/:examId',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']),
    getBloomDistribution
);

router.get('/subject-bloom-distribution/:subjectId',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']),
    getSubjectBloomDistribution
);

router.get('/subject-performance/:cohortId',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']),
    getSubjectPerformance
);

router.get('/department-stats',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD']),
    getDepartmentStats
);

// CO-PO Traceability route
router.get('/co-po-traceability/:subjectId/:cohortId/:semester',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']),
    getCOPOTraceability
);

router.get('/global-attainment',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD']),
    getGlobalAttainmentStats
);

router.get('/performance-trend',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']),
    getOverallPerformanceTrend
);

export default router;

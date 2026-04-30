import { Router } from 'express';
import { 
    getAttainmentReport, 
    getPerformanceDistributionReport,
    getFacultyWorkloadReport,
    getAcademicSummaryReport
} from '../controllers/reporting.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticateToken);

router.get('/attainment/:cohortId/:subjectId', requireRole(Role.PRINCIPAL, Role.ADMIN, Role.HOD), getAttainmentReport);
router.get('/distribution', requireRole(Role.PRINCIPAL, Role.ADMIN, Role.HOD), getPerformanceDistributionReport);
router.get('/faculty-workload', requireRole(Role.PRINCIPAL, Role.ADMIN, Role.HOD), getFacultyWorkloadReport);
router.get('/academic-summary', requireRole(Role.PRINCIPAL, Role.ADMIN, Role.HOD), getAcademicSummaryReport);

export default router;

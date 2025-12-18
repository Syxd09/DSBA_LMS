import { Router } from 'express';
import {
    getCOAttainment,
    calculateCOAttainment,
    submitForReview,
    approveAttainment,
    lockAttainment,
    getAttainmentSummary
} from '../controllers/attainment.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

// Get attainment data
router.get('/co', requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']), getCOAttainment);
router.get('/summary', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), getAttainmentSummary);

// Calculate and workflow
router.post('/calculate', requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']), calculateCOAttainment);
router.post('/submit-review', requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']), submitForReview);
router.post('/approve', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), approveAttainment);
router.post('/lock', requireRole(['ADMIN', 'PRINCIPAL']), lockAttainment);

export default router;

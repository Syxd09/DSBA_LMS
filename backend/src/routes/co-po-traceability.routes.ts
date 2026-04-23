import { Router } from 'express';
import { getCOPOTraceability } from '../controllers/co-po-traceability-endpoint';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// GET /api/co-po-traceability/:subjectId/:cohortId/:semester
router.get('/:subjectId/:cohortId/:semester', authenticateToken, getCOPOTraceability);

export default router;

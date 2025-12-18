import { Router } from 'express';
import {
    bulkCreateTeacherAssignments,
    bulkCreateCourseOutcomes,
    bulkCreateProgramOutcomes,
    bulkCreateCoPOMappings
} from '../controllers/bulk.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

// Bulk teacher assignments (HOD/Principal/Admin)
router.post('/teacher-assignments',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD']),
    bulkCreateTeacherAssignments
);

// Bulk course outcomes (HOD/Principal/Admin)
router.post('/course-outcomes',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD']),
    bulkCreateCourseOutcomes
);

// Bulk program outcomes (Principal/Admin)
router.post('/program-outcomes',
    requireRole(['ADMIN', 'PRINCIPAL']),
    bulkCreateProgramOutcomes
);

// Bulk CO-PO mappings (HOD/Principal/Admin)
router.post('/co-po-mappings',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD']),
    bulkCreateCoPOMappings
);

export default router;

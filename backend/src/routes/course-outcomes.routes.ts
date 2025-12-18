
import { Router } from 'express';
import { getCourseOutcomes, createCourseOutcome, deleteCourseOutcome, updateCoPoMapping } from '../controllers/course-outcomes.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getCourseOutcomes);
router.post('/', requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']), createCourseOutcome);
router.delete('/:id', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), deleteCourseOutcome);
router.put('/mapping', requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']), updateCoPoMapping);

export default router;

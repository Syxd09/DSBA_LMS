import { Router } from 'express';
import { getEnrollments, getStudentsByClass, enrollStudent, bulkEnroll, deleteEnrollment } from '../controllers/enrollments.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { requireAcademicContext } from '../middleware/academic-context.middleware';

const router = Router();

router.use(authenticateToken);

// Enrollment routes with context enforcement
router.get('/',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER', 'STUDENT']),
    requireAcademicContext({ required: ['cohortId'] }),
    getEnrollments
);

router.get('/students',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']),
    requireAcademicContext({ required: ['cohortId'] }),
    getStudentsByClass
);

router.post('/',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD']),
    requireAcademicContext({ required: ['cohortId', 'departmentId'] }),
    enrollStudent
);

router.post('/bulk',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD']),
    requireAcademicContext({ required: ['cohortId', 'departmentId'] }),
    bulkEnroll
);

router.delete('/:id',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD']),
    deleteEnrollment
);

export default router;

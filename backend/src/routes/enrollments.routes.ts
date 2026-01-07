import { Router } from 'express';
import { getEnrollments, getStudentsByClass, getTeacherStudents, enrollStudent, bulkEnroll, deleteEnrollment } from '../controllers/enrollments.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { requireAcademicContext } from '../middleware/academic-context.middleware';

import { validate } from '../middleware/validate.middleware';
import { enrollStudentSchema, bulkEnrollSchema } from '../schemas/enrollment.schema';

const router = Router();

router.use(authenticateToken);

// Enrollment routes with context enforcement
router.get('/',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER', 'STUDENT']),
    requireAcademicContext({ required: [] }), // Allow optional context
    getEnrollments
);

// IMPORTANT: More specific routes MUST come before generic routes
router.get('/teacher/students',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']),
    getTeacherStudents
);

router.get('/students',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']),
    requireAcademicContext({ required: ['cohortId'] }),
    getStudentsByClass
);

router.post('/',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD']),
    requireAcademicContext({ required: ['cohortId', 'departmentId'] }),
    validate(enrollStudentSchema, 'all'),
    enrollStudent
);

router.post('/bulk',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD']),
    requireAcademicContext({ required: ['cohortId', 'departmentId'] }),
    validate(bulkEnrollSchema, 'all'),
    bulkEnroll
);

router.delete('/:id',
    requireRole(['ADMIN', 'PRINCIPAL', 'HOD']),
    deleteEnrollment
);

export default router;

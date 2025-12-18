import { Router } from 'express';
import { createExam, getExamDetails, getTeacherExams, getStudentsByCohort, updateExamStructure } from '../controllers/exams.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRole(['TEACHER', 'HOD', 'PRINCIPAL']), getTeacherExams);
router.post('/', requireRole(['TEACHER']), createExam);
router.get('/:id', requireRole(['TEACHER', 'HOD', 'PRINCIPAL']), getExamDetails);
router.get('/cohort/:cohortId/students', requireRole(['TEACHER', 'HOD', 'PRINCIPAL']), getStudentsByCohort); // Using controller export from above
router.post('/:id/structure', requireRole(['TEACHER']), updateExamStructure);

export default router;

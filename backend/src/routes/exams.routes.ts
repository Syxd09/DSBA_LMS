import { Router } from 'express';
import { createExam, getExamDetails, getTeacherExams, getStudentsByCohort, updateExamStructure } from '../controllers/exams.controller';
import { publishExam, unlockExam, recalculateAttainment } from '../controllers/exam-publish.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', requireRole(['TEACHER', 'HOD', 'PRINCIPAL']), getTeacherExams);
router.post('/', requireRole(['TEACHER']), createExam);
router.get('/:id', requireRole(['TEACHER', 'HOD', 'PRINCIPAL']), getExamDetails);
router.get('/cohort/:cohortId/students', requireRole(['TEACHER', 'HOD', 'PRINCIPAL']), getStudentsByCohort); // Using controller export from above
router.post('/:id/structure', requireRole(['TEACHER']), updateExamStructure);
router.post('/:id/publish', requireRole(['TEACHER', 'HOD', 'PRINCIPAL']), publishExam);
router.post('/:id/unlock', requireRole(['TEACHER', 'HOD', 'PRINCIPAL']), unlockExam);
router.post('/:id/recalculate', requireRole(['TEACHER', 'HOD', 'PRINCIPAL']), recalculateAttainment);

export default router;

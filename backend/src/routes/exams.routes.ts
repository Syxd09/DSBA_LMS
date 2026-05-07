import { Router } from 'express';
import { createExam, getExamDetails, getExams, getExamStudents, getStudentsByCohort, updateExamStructure } from '../controllers/exams.controller';
import { publishExam, unlockExam, recalculateAttainment } from '../controllers/exam-publish.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

// IMPORTANT: Specific routes MUST come before generic /:id routes
router.get('/cohort/:cohortId/students', requireRole('TEACHER', 'HOD', 'PRINCIPAL'), getStudentsByCohort);
router.get('/:id/students', requireRole('TEACHER', 'HOD', 'PRINCIPAL'), getExamStudents);
router.get('/', requireRole('TEACHER', 'HOD', 'PRINCIPAL'), getExams);
router.post('/', requireRole('TEACHER'), createExam);
router.get('/:id', requireRole('TEACHER', 'HOD', 'PRINCIPAL'), getExamDetails);
router.post('/:id/structure', requireRole('TEACHER'), updateExamStructure);
router.post('/:id/publish', requireRole('TEACHER', 'HOD', 'PRINCIPAL'), publishExam);
router.post('/:id/unlock', requireRole('TEACHER', 'HOD', 'PRINCIPAL'), unlockExam);
router.post('/:id/recalculate', requireRole('TEACHER', 'HOD', 'PRINCIPAL'), recalculateAttainment);

export default router;

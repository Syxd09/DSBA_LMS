import { Router } from 'express';
import { saveMarks, submitMarksForApproval, getMarks, getCSVTemplate, bulkUploadMarks } from '../controllers/marks.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/save', requireRole(['TEACHER', 'HOD', 'PRINCIPAL']), saveMarks);
router.post('/submit', requireRole(['TEACHER']), submitMarksForApproval);
router.get('/:examId', requireRole(['TEACHER', 'HOD', 'PRINCIPAL']), getMarks);
router.get('/:examId/csv-template', requireRole(['TEACHER', 'HOD', 'PRINCIPAL']), getCSVTemplate);
router.post('/:examId/bulk-upload', requireRole(['TEACHER', 'HOD', 'PRINCIPAL']), bulkUploadMarks); // Add GET route

console.log('DEBUG: Marks routes loaded');

router.get('/test', (req, res) => res.json({ message: 'Marks route works' }));

export default router;

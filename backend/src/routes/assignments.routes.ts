import { Router } from 'express';
import { getAssignments, getTeachersByClass, createAssignment, deleteAssignment, getAssignmentPreview } from '../controllers/assignments.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

import { validate } from '../middleware/validate.middleware';
import { createAssignmentSchema } from '../schemas/assignment.schema';

/**
 * @swagger
 * /assignments:
 *   post:
 *     summary: Create a new teacher assignment
 *     tags: [Assignments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teacherId
 *               - subjectId
 *               - cohortId
 *               - departmentId
 *             properties:
 *               teacherId:
 *                 type: string
 *               subjectId:
 *                 type: string
 *               cohortId:
 *                 type: string
 *               departmentId:
 *                 type: string
 *               semester:
 *                 type: integer
 *               academicYear:
 *                 type: string
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *       400:
 *         description: Validation error
 */
router.get('/', requireRole(['ADMIN', 'PRINCIPAL', 'HOD', 'TEACHER']), getAssignments);
router.get('/preview', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), getAssignmentPreview);
router.post('/', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), validate(createAssignmentSchema, 'all'), createAssignment);
router.delete('/:id', requireRole(['ADMIN', 'PRINCIPAL', 'HOD']), deleteAssignment);


export default router;


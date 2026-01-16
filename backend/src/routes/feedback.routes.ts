import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import * as templateController from '../controllers/feedback-template.controller';
import * as feedbackController from '../controllers/teacher-feedback.controller';

const router = Router();

// ============================================
// TEMPLATE MANAGEMENT ROUTES
// ============================================

// Create template (Principal/HOD/Admin)
router.post('/templates', authenticateToken, templateController.createTemplate);

// List templates (filtered by role)
router.get('/templates', authenticateToken, templateController.listTemplates);

// Get single template
router.get('/templates/:id', authenticateToken, templateController.getTemplate);

// Update template (Admin only)
router.put('/templates/:id', authenticateToken, templateController.updateTemplate);

// Toggle template status (Principal/Admin)
router.patch('/templates/:id/status', authenticateToken, templateController.toggleTemplateStatus);

// ============================================
// TEACHER FEEDBACK ROUTES
// ============================================

// Create feedback (DRAFT)
router.post('/feedback', authenticateToken, feedbackController.createFeedback);

// Get feedback by ID
router.get('/feedback/:id', authenticateToken, feedbackController.getFeedback);

// Update feedback (DRAFT only)
router.put('/feedback/:id', authenticateToken, feedbackController.updateFeedback);

// Submit feedback for approval
router.post('/feedback/:id/submit', authenticateToken, feedbackController.submitFeedback);

// Approve feedback (HOD/Principal/Admin)
router.post('/feedback/:id/approve', authenticateToken, feedbackController.approveFeedback);

// Lock feedback permanently (Principal/Admin)
router.post('/feedback/:id/lock', authenticateToken, feedbackController.lockFeedback);

// Get student's feedback
router.get('/feedback/student/:studentId', authenticateToken, feedbackController.getStudentFeedback);

// Get teacher's own feedback
router.get('/feedback/teacher/me', authenticateToken, feedbackController.getTeacherOwnFeedback);

// Get pending approvals (HOD/Principal/Admin)
router.get('/feedback/pending-approvals', authenticateToken, feedbackController.getPendingApprovals);

// Delete feedback (DRAFT only)
router.delete('/feedback/:id', authenticateToken, feedbackController.deleteFeedback);

export default router;


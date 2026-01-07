import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
    createTemplate,
    listTemplates,
    getTemplate,
    updateTemplate,
    toggleTemplateStatus
} from '../controllers/feedback-template.controller';
import { canEditTemplate } from '../middleware/feedback-rbac.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/feedback-templates
 * @desc    Create feedback template
 * @access  Admin, Principal
 */
router.post('/', createTemplate);

/**
 * @route   GET /api/feedback-templates
 * @desc    List feedback templates (role-filtered)
 * @access  Authenticated users
 */
router.get('/', listTemplates);

/**
 * @route   GET /api/feedback-templates/:id
 * @desc    Get template details
 * @access  Authenticated users
 */
router.get('/:id', getTemplate);

/**
 * @route   PUT /api/feedback-templates/:id
 * @desc    Update feedback template
 * @access  Admin only
 */
router.put('/:id', canEditTemplate, updateTemplate);

/**
 * @route   PATCH /api/feedback-templates/:id/status
 * @desc    Toggle template status
 * @access  Admin, Principal
 */
router.patch('/:id/status', toggleTemplateStatus);

export default router;

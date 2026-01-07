import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/feedback-rbac.middleware';

const prisma = new PrismaClient();

/**
 * @route   POST /api/feedback-templates
 * @desc    Create a new feedback template
 * @access  Admin, Principal
 */
export const createTemplate = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Only Admin and Principal can create templates
        if (user.role !== 'ADMIN' && user.role !== 'PRINCIPAL') {
            return res.status(403).json({
                message: 'Only Admin or Principal can create feedback templates'
            });
        }

        const { name, description, departmentId, programId, isDefault, categories } = req.body;

        // Validation
        if (!name || !categories || !Array.isArray(categories) || categories.length === 0) {
            return res.status(400).json({
                message: 'Template name and at least one category are required'
            });
        }

        // Create template with categories in transaction
        const template = await prisma.feedbackTemplate.create({
            data: {
                name,
                description: description || null,
                departmentId: departmentId || null,
                programId: programId || null,
                isDefault: isDefault || false,
                isActive: true,
                createdBy: user.id,
                categories: {
                    create: categories.map((cat: any, index: number) => ({
                        name: cat.name,
                        description: cat.description || null,
                        displayOrder: cat.displayOrder !== undefined ? cat.displayOrder : index,
                        weight: cat.weight || 1.0
                    }))
                }
            },
            include: {
                categories: {
                    orderBy: { displayOrder: 'asc' }
                }
            }
        });

        return res.status(201).json(template);
    } catch (error: any) {
        console.error('Error creating feedback template:', error);
        return res.status(500).json({
            message: 'Failed to create feedback template',
            error: error.message
        });
    }
};

/**
 * @route   GET /api/feedback-templates
 * @desc    List feedback templates (filtered by role/department)
 * @access  Authenticated users
 */
export const listTemplates = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const { departmentId, programId, isActive } = req.query;

        let whereClause: any = {};

        // Filter by active status
        if (isActive !== undefined) {
            whereClause.isActive = isActive === 'true';
        }

        // Admin/Principal: Can see all templates
        if (user.role === 'ADMIN' || user.role === 'PRINCIPAL') {
            if (departmentId) whereClause.departmentId = departmentId;
            if (programId) whereClause.programId = programId;
        }
        // HOD/Teacher: Only department-scoped or global templates
        else if (user.role === 'HOD' || user.role === 'TEACHER') {
            whereClause.OR = [
                { departmentId: user.departmentId },
                { departmentId: null } // Global templates
            ];
        }
        // Students don't need templates
        else {
            return res.status(403).json({ message: 'Students cannot access templates' });
        }

        const templates = await prisma.feedbackTemplate.findMany({
            where: whereClause,
            include: {
                categories: {
                    orderBy: { displayOrder: 'asc' }
                },
                department: {
                    select: { id: true, name: true }
                },
                program: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return res.json({ templates });
    } catch (error: any) {
        console.error('Error listing feedback templates:', error);
        return res.status(500).json({
            message: 'Failed to list feedback templates',
            error: error.message
        });
    }
};

/**
 * @route   GET /api/feedback-templates/:id
 * @desc    Get template details
 * @access  Authenticated users
 */
export const getTemplate = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const { id } = req.params;

        const template = await prisma.feedbackTemplate.findUnique({
            where: { id },
            include: {
                categories: {
                    orderBy: { displayOrder: 'asc' }
                },
                department: {
                    select: { id: true, name: true }
                },
                program: {
                    select: { id: true, name: true }
                }
            }
        });

        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        return res.json(template);
    } catch (error: any) {
        console.error('Error getting feedback template:', error);
        return res.status(500).json({
            message: 'Failed to get feedback template',
            error: error.message
        });
    }
};

/**
 * @route   PUT /api/feedback-templates/:id
 * @desc    Update feedback template
 * @access  Admin only
 */
export const updateTemplate = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (user.role !== 'ADMIN') {
            return res.status(403).json({
                message: 'Only administrators can update feedback templates'
            });
        }

        const { id } = req.params;
        const { name, description, departmentId, programId, isDefault, categories } = req.body;

        // Check if template exists
        const existingTemplate = await prisma.feedbackTemplate.findUnique({
            where: { id }
        });

        if (!existingTemplate) {
            return res.status(404).json({ message: 'Template not found' });
        }

        // Update template and categories in transaction
        const template = await prisma.$transaction(async (tx) => {
            // Delete existing categories
            await tx.feedbackTemplateCategory.deleteMany({
                where: { templateId: id }
            });

            // Update template with new categories
            return tx.feedbackTemplate.update({
                where: { id },
                data: {
                    name,
                    description: description || null,
                    departmentId: departmentId || null,
                    programId: programId || null,
                    isDefault: isDefault || false,
                    categories: categories ? {
                        create: categories.map((cat: any, index: number) => ({
                            name: cat.name,
                            description: cat.description || null,
                            displayOrder: cat.displayOrder !== undefined ? cat.displayOrder : index,
                            weight: cat.weight || 1.0
                        }))
                    } : undefined
                },
                include: {
                    categories: {
                        orderBy: { displayOrder: 'asc' }
                    }
                }
            });
        });

        return res.json(template);
    } catch (error: any) {
        console.error('Error updating feedback template:', error);
        return res.status(500).json({
            message: 'Failed to update feedback template',
            error: error.message
        });
    }
};

/**
 * @route   PATCH /api/feedback-templates/:id/status
 * @desc    Toggle template active status
 * @access  Admin, Principal
 */
export const toggleTemplateStatus = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (user.role !== 'ADMIN' && user.role !== 'PRINCIPAL') {
            return res.status(403).json({
                message: 'Only Admin or Principal can change template status'
            });
        }

        const { id } = req.params;
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ message: 'isActive must be a boolean' });
        }

        const template = await prisma.feedbackTemplate.update({
            where: { id },
            data: { isActive },
            select: { id: true, name: true, isActive: true }
        });

        return res.json(template);
    } catch (error: any) {
        console.error('Error toggling template status:', error);

        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Template not found' });
        }

        return res.status(500).json({
            message: 'Failed to toggle template status',
            error: error.message
        });
    }
};

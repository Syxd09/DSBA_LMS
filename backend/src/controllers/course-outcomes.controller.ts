
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

export const getCourseOutcomes = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId } = req.query;
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.userId;

        const whereClause: any = subjectId ? { subjectId: subjectId as string } : {};

        // RBAC: Teachers only see CO's for assigned subjects
        if (userRole === 'TEACHER') {
            const assignments = await prisma.teacherAssignment.findMany({
                where: { teacherId: userId },
                select: { subjectId: true }
            });
            const assignedSubjectIds = assignments.map(a => a.subjectId);

            // If checking specific subject, ensure it's assigned
            if (subjectId && !assignedSubjectIds.includes(String(subjectId))) {
                return res.json([]); // Not assigned to this subject
            }

            // Otherwise scope to all assigned subjects
            if (!subjectId) {
                whereClause.subjectId = { in: assignedSubjectIds };
            }
        }

        // RBAC: HODs only see CO's for subjects in their department
        if (userRole === 'HOD') {
            const department = await prisma.department.findFirst({
                where: { hodId: userId }
            });

            if (department) {
                // We need to filter by subject -> curriculum -> program -> department
                // Prisma where clause for related fields:
                whereClause.subject = {
                    curriculum: {
                        program: {
                            departmentId: department.id
                        }
                    }
                };
            } else {
                return res.json([]);
            }
        }

        const courseOutcomes = await prisma.courseOutcome.findMany({
            where: whereClause,
            orderBy: [
                { subjectId: 'asc' },
                { coNumber: 'asc' }
            ],
            include: {
                subject: {
                    select: {
                        id: true,
                        name: true,
                        code: true
                    }
                },
                poMappings: true
            }
        });
        res.json(courseOutcomes);
    } catch (error) {
        console.error('Error fetching course outcomes:', error);
        res.status(500).json({ message: 'Error fetching course outcomes', error: String(error) });
    }
};

export const createCourseOutcome = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId, coNumber, description, bloomLevel } = req.body;

        if (!subjectId || !coNumber || !description || !bloomLevel) {
            return res.status(400).json({ message: 'Subject, CO Number, Description, and Bloom Level are required' });
        }

        const courseOutcome = await prisma.courseOutcome.create({
            data: {
                subjectId,
                coNumber: parseInt(coNumber),
                description,
                bloomLevel
            },
            include: { subject: true }
        });

        res.status(201).json(courseOutcome);
    } catch (error) {
        console.error('Error creating course outcome:', error);
        res.status(500).json({ message: 'Error creating course outcome', error: String(error) });
    }
};

export const updateCourseOutcome = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { coNumber, description, bloomLevel } = req.body;

        const courseOutcome = await prisma.courseOutcome.update({
            where: { id },
            data: {
                ...(coNumber && { coNumber: parseInt(coNumber) }),
                ...(description && { description }),
                ...(bloomLevel && { bloomLevel })
            },
            include: { subject: true }
        });

        res.json(courseOutcome);
    } catch (error) {
        console.error('Error updating course outcome:', error);
        res.status(500).json({ message: 'Error updating course outcome', error: String(error) });
    }
};

export const deleteCourseOutcome = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.courseOutcome.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting course outcome:', error);
        res.status(500).json({ message: 'Error deleting course outcome', error: String(error) });
    }
};

export const updateCoPoMapping = async (req: AuthRequest, res: Response) => {
    try {
        const { coId, poId, correlationLevel } = req.body;

        if (!coId || !poId || correlationLevel === undefined) {
            return res.status(400).json({ message: 'CO ID, PO ID, and Correlation Level required' });
        }

        // If level is 0 or null, remove mapping? Or just set to 0? 
        // 0 usually means no correlation. Let's assume we store it or delete it.
        // Schema has correlationLevel Int. Let's upsert.

        const mapping = await prisma.coPoMapping.upsert({
            where: {
                coId_poId: {
                    coId,
                    poId
                }
            },
            update: {
                correlationLevel: Number(correlationLevel)
            },
            create: {
                coId,
                poId,
                correlationLevel: Number(correlationLevel)
            }
        });

        res.json(mapping);
    } catch (error) {
        console.error('Error updating mapping:', error);
        res.status(500).json({ message: 'Error updating mapping', error: String(error) });
    }
};

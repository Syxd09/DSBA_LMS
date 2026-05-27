
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';
import { AttainmentService } from '../services/attainment.service';

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

            const targetDepartmentId = department?.id || req.user?.departmentId;

            if (targetDepartmentId) {
                // We need to filter by subject -> curriculum -> program -> department
                // Prisma where clause for related fields:
                whereClause.subject = {
                    curriculum: {
                        program: {
                            departmentId: targetDepartmentId
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

        // Transform coNumber to code field (CO1, CO2, etc.)
        const transformed = courseOutcomes.map(co => ({
            ...co,
            code: `CO${co.coNumber}`
        }));

        res.json(transformed);
    } catch (error) {
        console.error('Error fetching course outcomes:', error);
        res.status(500).json({ message: 'Error fetching course outcomes', error: String(error) });
    }
};

export const getCourseOutcomeById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const courseOutcome = await prisma.courseOutcome.findUnique({
            where: { id },
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

        if (!courseOutcome) {
            return res.status(404).json({ message: 'Course outcome not found' });
        }

        // Transform coNumber to code field
        const transformed = {
            ...courseOutcome,
            code: `CO${courseOutcome.coNumber}`
        };

        res.json(transformed);
    } catch (error) {
        console.error('Error fetching course outcome:', error);
        res.status(500).json({ message: 'Error fetching course outcome', error: String(error) });
    }
};

async function triggerAutoRecalculation(subjectId: string) {
    console.log(`[AutoRecalc] Starting auto-recalculation for subject: ${subjectId}`);
    try {
        // Find all cohorts and semesters that have published exams for this subject
        const activeCombos = await prisma.exam.findMany({
            where: { subjectId, status: 'PUBLISHED' },
            distinct: ['cohortId', 'semester'],
            select: { cohortId: true, semester: true }
        });

        const subjectWithProgram = await prisma.subject.findUnique({
            where: { id: subjectId },
            include: { curriculum: true }
        });

        const currentYear = new Date().getFullYear();
        const academicYear = `${currentYear}-${currentYear + 1}`;

        for (const combo of activeCombos) {
            try {
                // 1. Calculate CO attainment (will read the newly updated course outcome threshold!)
                await AttainmentService.calculateCO(
                    subjectId,
                    combo.cohortId,
                    combo.semester,
                    academicYear
                );

                // 2. Calculate PO attainment
                if (subjectWithProgram?.curriculum?.programId) {
                    await AttainmentService.calculatePO(
                        subjectWithProgram.curriculum.programId,
                        combo.cohortId,
                        combo.semester,
                        academicYear
                    );
                }
                console.log(`[AutoRecalc] ✅ Successfully recalculated subject: ${subjectId}, cohort: ${combo.cohortId}`);
            } catch (error) {
                console.error(`[AutoRecalc] ❌ Failed for subject: ${subjectId}, cohort: ${combo.cohortId}:`, error);
            }
        }
    } catch (err) {
        console.error('[AutoRecalc] Error finding active subject combos:', err);
    }
}

export const createCourseOutcome = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId, coNumber, description, bloomLevel, targetPercent } = req.body;

        if (!subjectId || !coNumber || !description || !bloomLevel) {
            return res.status(400).json({ message: 'Subject, CO Number, Description, and Bloom Level are required' });
        }

        const courseOutcome = await prisma.courseOutcome.create({
            data: {
                subjectId,
                coNumber: parseInt(coNumber),
                description,
                bloomLevel,
                ...(targetPercent !== undefined && { targetPercent: parseFloat(targetPercent) })
            },
            include: { subject: true }
        });

        triggerAutoRecalculation(subjectId).catch(err => {
            console.error('[createCourseOutcome] AutoRecalc failed:', err);
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
        const { coNumber, description, bloomLevel, targetPercent } = req.body;

        const courseOutcome = await prisma.courseOutcome.update({
            where: { id },
            data: {
                ...(coNumber && { coNumber: parseInt(coNumber) }),
                ...(description && { description }),
                ...(bloomLevel && { bloomLevel }),
                ...(targetPercent !== undefined && { targetPercent: parseFloat(targetPercent) })
            },
            include: { subject: true }
        });

        triggerAutoRecalculation(courseOutcome.subjectId).catch(err => {
            console.error('[updateCourseOutcome] AutoRecalc failed:', err);
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
        const co = await prisma.courseOutcome.findUnique({ where: { id } });
        
        await prisma.courseOutcome.delete({ where: { id } });

        if (co) {
            triggerAutoRecalculation(co.subjectId).catch(err => {
                console.error('[deleteCourseOutcome] AutoRecalc failed:', err);
            });
        }

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

        // Find existing mapping
        const existing = await prisma.coPoMapping.findFirst({
            where: { coId: coId, poId: poId }
        });

        let mapping;
        if (existing) {
            mapping = await prisma.coPoMapping.update({
                where: { id: existing.id },
                data: { correlationLevel: Number(correlationLevel) }
            });
        } else {
            mapping = await prisma.coPoMapping.create({
                data: { coId, poId, correlationLevel: Number(correlationLevel) }
            });
        }

        res.json(mapping);
    } catch (error) {
        console.error('[updateCoPoMapping] Error:', error);
        res.status(500).json({ message: 'Error updating mapping', error: String(error) });
    }
};
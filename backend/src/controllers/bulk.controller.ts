import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';
import { BloomLevel } from '@prisma/client';
import { createAuditLog } from '../middleware/audit.middleware';

/**
 * Bulk create teacher assignments
 */
export const bulkCreateTeacherAssignments = async (req: AuthRequest, res: Response) => {
    try {
        const { assignments } = req.body;
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
            return res.status(400).json({ message: 'assignments array is required' });
        }

        // Validate all assignments have required fields
        for (const a of assignments) {
            if (!a.teacherId || !a.subjectId || !a.cohortId || !a.departmentId) {
                return res.status(400).json({
                    message: 'Each assignment requires: teacherId, subjectId, cohortId, departmentId',
                    invalidAssignment: a
                });
            }
        }

        const results = {
            created: 0,
            skipped: 0,
            errors: [] as string[]
        };

        for (const a of assignments) {
            try {
                await prisma.teacherAssignment.upsert({
                    where: {
                        teacherId_subjectId_cohortId_semester_academicYear: {
                            teacherId: a.teacherId,
                            subjectId: a.subjectId,
                            cohortId: a.cohortId,
                            semester: a.semester || 1,
                            academicYear: a.academicYear || new Date().getFullYear().toString()
                        }
                    },
                    update: {
                        semester: a.semester || 1,
                        academicYear: a.academicYear || new Date().getFullYear().toString()
                    },
                    create: {
                        teacherId: a.teacherId,
                        subjectId: a.subjectId,
                        cohortId: a.cohortId,
                        departmentId: a.departmentId,
                        semester: a.semester || 1,
                        academicYear: a.academicYear || new Date().getFullYear().toString()
                    }
                });
                results.created++;
            } catch (err) {
                results.errors.push(`Failed for teacher ${a.teacherId}, subject ${a.subjectId}: ${err}`);
                results.skipped++;
            }
        }

        await createAuditLog(userId, 'BULK_TEACHER_ASSIGNMENT', 'teacher_assignment', undefined, undefined, { count: results.created });

        res.json({
            message: `Bulk assignment complete`,
            results
        });
    } catch (error) {
        console.error('Error in bulk teacher assignment:', error);
        res.status(500).json({ message: 'Error in bulk assignment', error: String(error) });
    }
};

/**
 * Bulk create course outcomes
 */
export const bulkCreateCourseOutcomes = async (req: AuthRequest, res: Response) => {
    try {
        const { subjectId, courseOutcomes } = req.body;
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        if (!subjectId || !courseOutcomes || !Array.isArray(courseOutcomes)) {
            return res.status(400).json({ message: 'subjectId and courseOutcomes array are required' });
        }

        // Validate subject exists
        const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        const results = {
            created: 0,
            updated: 0,
            errors: [] as string[]
        };

        for (const co of courseOutcomes) {
            if (!co.coNumber || !co.description || !co.bloomLevel) {
                results.errors.push(`Invalid CO: ${JSON.stringify(co)}`);
                continue;
            }

            try {
                const existing = await prisma.courseOutcome.findUnique({
                    where: {
                        subjectId_coNumber: {
                            subjectId,
                            coNumber: co.coNumber
                        }
                    }
                });

                if (existing) {
                    await prisma.courseOutcome.update({
                        where: { id: existing.id },
                        data: {
                            description: co.description,
                            bloomLevel: co.bloomLevel as import('@prisma/client').BloomLevel
                        }
                    });
                    results.updated++;
                } else {
                    await prisma.courseOutcome.create({
                        data: {
                            subjectId,
                            coNumber: co.coNumber,
                            description: co.description,
                            bloomLevel: co.bloomLevel as import('@prisma/client').BloomLevel
                        }
                    });
                    results.created++;
                }
            } catch (err) {
                results.errors.push(`CO ${co.coNumber}: ${err}`);
            }
        }

        await createAuditLog(userId, 'BULK_CO_CREATE', 'course_outcome', subjectId, undefined, {
            created: results.created,
            updated: results.updated
        });

        res.json({
            message: 'Bulk CO creation complete',
            subjectId,
            results
        });
    } catch (error) {
        console.error('Error in bulk CO creation:', error);
        res.status(500).json({ message: 'Error in bulk CO creation', error: String(error) });
    }
};

/**
 * Bulk create program outcomes
 */
export const bulkCreateProgramOutcomes = async (req: AuthRequest, res: Response) => {
    try {
        const { programId, programOutcomes } = req.body;
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        if (!programId || !programOutcomes || !Array.isArray(programOutcomes)) {
            return res.status(400).json({ message: 'programId and programOutcomes array are required' });
        }

        // Validate program exists
        const program = await prisma.program.findUnique({ where: { id: programId } });
        if (!program) return res.status(404).json({ message: 'Program not found' });

        const results = {
            created: 0,
            updated: 0,
            errors: [] as string[]
        };

        for (const po of programOutcomes) {
            if (!po.poNumber || !po.description) {
                results.errors.push(`Invalid PO: ${JSON.stringify(po)}`);
                continue;
            }

            try {
                const existing = await prisma.programOutcome.findUnique({
                    where: {
                        programId_poNumber: {
                            programId,
                            poNumber: po.poNumber
                        }
                    }
                });

                if (existing) {
                    await prisma.programOutcome.update({
                        where: { id: existing.id },
                        data: { description: po.description }
                    });
                    results.updated++;
                } else {
                    await prisma.programOutcome.create({
                        data: {
                            programId,
                            poNumber: po.poNumber,
                            description: po.description
                        }
                    });
                    results.created++;
                }
            } catch (err) {
                results.errors.push(`PO ${po.poNumber}: ${err}`);
            }
        }

        await createAuditLog(userId, 'BULK_PO_CREATE', 'program_outcome', programId, undefined, {
            created: results.created,
            updated: results.updated
        });

        res.json({
            message: 'Bulk PO creation complete',
            programId,
            results
        });
    } catch (error) {
        console.error('Error in bulk PO creation:', error);
        res.status(500).json({ message: 'Error in bulk PO creation', error: String(error) });
    }
};

/**
 * Bulk create CO-PO mappings
 */
export const bulkCreateCoPOMappings = async (req: AuthRequest, res: Response) => {
    try {
        const { mappings } = req.body;
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
            return res.status(400).json({ message: 'mappings array is required' });
        }

        const results = {
            created: 0,
            updated: 0,
            errors: [] as string[]
        };

        for (const m of mappings) {
            if (!m.coId || !m.poId || !m.correlationLevel) {
                results.errors.push(`Invalid mapping: ${JSON.stringify(m)}`);
                continue;
            }

            if (m.correlationLevel < 1 || m.correlationLevel > 3) {
                results.errors.push(`Invalid correlation level (must be 1-3): ${m.correlationLevel}`);
                continue;
            }

            try {
                await prisma.coPoMapping.upsert({
                    where: {
                        coId_poId: {
                            coId: m.coId,
                            poId: m.poId
                        }
                    },
                    update: {
                        correlationLevel: m.correlationLevel
                    },
                    create: {
                        coId: m.coId,
                        poId: m.poId,
                        correlationLevel: m.correlationLevel
                    }
                });
                results.created++;
            } catch (err) {
                results.errors.push(`Mapping CO ${m.coId} → PO ${m.poId}: ${err}`);
            }
        }

        await createAuditLog(userId, 'BULK_COPO_MAPPING', 'co_po_mapping', undefined, undefined, { count: results.created });

        res.json({
            message: 'Bulk CO-PO mapping complete',
            results
        });
    } catch (error) {
        console.error('Error in bulk CO-PO mapping:', error);
        res.status(500).json({ message: 'Error in bulk CO-PO mapping', error: String(error) });
    }
};

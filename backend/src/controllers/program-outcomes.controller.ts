
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../services/db';

export const getProgramOutcomes = async (req: AuthRequest, res: Response) => {
    try {
        const { programId } = req.query;
        const userRole = req.user?.role?.toUpperCase();
        const userId = req.user?.userId;

        const where: any = {};

        // If programId is provided, filter by it
        if (programId) {
            where.programId = String(programId);
        } else {
            // If no programId, apply role-based filtering

            // HODs only see POs for programs in their department
            if (userRole === 'HOD') {
                const department = await prisma.department.findFirst({
                    where: { hodId: userId }
                });

                const targetDepartmentId = department?.id || req.user?.departmentId;

                if (targetDepartmentId) {
                    where.program = {
                        departmentId: targetDepartmentId
                    };
                } else {
                    // HOD with no department sees nothing
                    return res.json([]);
                }
            }

            // Teachers see POs for programs they teach (via subject assignments)
            if (userRole === 'TEACHER') {
                const assignments = await prisma.teacherAssignment.findMany({
                    where: { teacherId: userId },
                    include: {
                        subject: {
                            include: {
                                curriculum: {
                                    select: { programId: true }
                                }
                            }
                        }
                    }
                });

                const programIds = Array.from(new Set(
                    assignments
                        .map(a => a.subject?.curriculum?.programId)
                        .filter(Boolean)
                ));

                if (programIds.length > 0) {
                    where.programId = { in: programIds };
                } else {
                    return res.json([]);
                }
            }

            // Admins and Principals see all POs (no additional filter)
        }

        const outcomes = await prisma.programOutcome.findMany({
            where,
            orderBy: { poNumber: 'asc' },
            include: {
                program: { select: { id: true, name: true, code: true, departmentId: true } }
            }
        });
        res.json(outcomes);
    } catch (error) {
        console.error('Error fetching program outcomes:', error);
        res.status(500).json({ message: 'Error fetching program outcomes', error: String(error) });
    }
};

export const createProgramOutcome = async (req: AuthRequest, res: Response) => {
    try {
        const { programId, poNumber, description } = req.body;

        if (!programId || !poNumber || !description) {
            return res.status(400).json({ message: 'Program ID, PO Number, and Description are required' });
        }

        const outcome = await prisma.programOutcome.create({
            data: {
                programId,
                poNumber: parseInt(poNumber),
                description
            }
        });

        res.status(201).json(outcome);
    } catch (error) {
        console.error('Error creating program outcome:', error);
        res.status(500).json({ message: 'Error creating program outcome', error: String(error) });
    }
};

export const updateProgramOutcome = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { poNumber, description, targetPercent } = req.body;

        const outcome = await prisma.programOutcome.update({
            where: { id },
            data: {
                ...(poNumber && { poNumber: parseInt(poNumber) }),
                ...(description && { description }),
                ...(targetPercent !== undefined && { targetPercent: parseFloat(targetPercent) })
            }
        });

        res.json(outcome);
    } catch (error) {
        console.error('Error updating program outcome:', error);
        res.status(500).json({ message: 'Error updating program outcome', error: String(error) });
    }
};

export const deleteProgramOutcome = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.programOutcome.delete({ where: { id } });
        res.json({ message: 'Program outcome deleted' });
    } catch (error) {
        console.error('Error deleting program outcome:', error);
        res.status(500).json({ message: 'Error deleting program outcome', error: String(error) });
    }
};
